// GlitchTip REST client for first-time dev setup.
// Auth: django-allauth headless API (/_allauth/browser/v1/*) — CSRF-token in header.
// Resources: Sentry-compatible /api/0/* with session cookie + CSRF.
// Designed to fail soft: if anything goes wrong, the caller falls back to manual setup.

import kleur from 'kleur';

export interface Session {
  base: string;
  cookies: string;
  csrf: string;
}

interface FetchResult {
  ok: boolean;
  status: number;
  body: unknown;
  setCookie: string[];
}

async function call(
  base: string,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookies?: string;
    csrf?: string;
  } = {},
): Promise<FetchResult> {
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  if (init.cookies) headers.set('Cookie', init.cookies);
  if (init.csrf) {
    headers.set('X-CSRFToken', init.csrf);
    headers.set('Referer', `${base}/`);
    headers.set('Origin', base);
  }

  const res = await fetch(`${base}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const setCookie: string[] = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : res.headers.get('set-cookie')
      ? [res.headers.get('set-cookie') as string]
      : [];

  return { ok: res.ok, status: res.status, body, setCookie };
}

function mergeCookies(jar: Map<string, string>, setCookie: string[]): string {
  for (const raw of setCookie) {
    const pair = raw.split(';')[0]?.trim();
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function extractAllauthError(body: unknown): { code: string; message: string } | null {
  if (!body || typeof body !== 'object') return null;
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first = errors[0] as { code?: string; message?: string };
  return { code: first.code ?? 'unknown', message: first.message ?? '' };
}

export async function authenticate(base: string, email: string, password: string): Promise<Session | null> {
  const jar = new Map<string, string>();

  // 1. Bootstrap CSRF
  const cfg = await call(base, '/_allauth/browser/v1/config');
  if (!cfg.ok) {
    console.error(kleur.red(`✗ /_allauth/browser/v1/config → ${cfg.status}`));
    return null;
  }
  let cookies = mergeCookies(jar, cfg.setCookie);
  let csrf = jar.get('csrftoken') ?? '';
  if (!csrf) {
    console.error(kleur.red('✗ no csrftoken cookie issued'));
    return null;
  }

  // 2. Try signup first (creates + logs in atomically)
  const signup = await call(base, '/_allauth/browser/v1/auth/signup', {
    method: 'POST',
    body: { email, password },
    cookies,
    csrf,
  });

  if (signup.ok || signup.status === 200) {
    cookies = mergeCookies(jar, signup.setCookie);
    csrf = jar.get('csrftoken') ?? csrf;
    return { base, cookies, csrf };
  }

  // 3. Fall back to login (existing user)
  const login = await call(base, '/_allauth/browser/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    cookies,
    csrf,
  });

  if (login.ok || login.status === 200) {
    cookies = mergeCookies(jar, login.setCookie);
    csrf = jar.get('csrftoken') ?? csrf;
    return { base, cookies, csrf };
  }

  const signupErr = extractAllauthError(signup.body);
  const loginErr = extractAllauthError(login.body);

  // Most common case: leftover user from a prior run + new password typed
  if (signupErr?.code === 'email_taken' && loginErr?.code === 'email_password_mismatch') {
    console.error(kleur.red(`✗ ${email} already exists in GlitchTip from a previous run, and the password you typed doesn't match.`));
    console.error(kleur.gray('  → retry `dev:up` with the original password,'));
    console.error(kleur.gray('  → or run `uxco-glitchtip dev:reset` to wipe the DB and start fresh.'));
    return null;
  }

  console.error(kleur.red('✗ GlitchTip authentication failed'));
  if (signupErr) console.error(kleur.gray(`  signup: ${signupErr.message} (${signupErr.code})`));
  else console.error(kleur.gray(`  signup → HTTP ${signup.status}`));
  if (loginErr) console.error(kleur.gray(`  login:  ${loginErr.message} (${loginErr.code})`));
  else console.error(kleur.gray(`  login  → HTTP ${login.status}`));
  return null;
}

export async function ensureOrganization(session: Session, name: string): Promise<string | null> {
  const list = await call(session.base, '/api/0/organizations/', { cookies: session.cookies });
  if (list.ok && Array.isArray(list.body)) {
    const existing = (list.body as Array<{ slug: string; name: string }>).find((o) => o.name === name);
    if (existing) return existing.slug;
  }

  const created = await call(session.base, '/api/0/organizations/', {
    method: 'POST',
    body: { name },
    cookies: session.cookies,
    csrf: session.csrf,
  });
  if ((created.ok || created.status === 201) && created.body && typeof created.body === 'object') {
    return (created.body as { slug?: string }).slug ?? null;
  }
  console.error(kleur.red(`✗ org create → ${created.status}`));
  return null;
}

export async function ensureTeam(session: Session, orgSlug: string, slug: string): Promise<string | null> {
  const created = await call(session.base, `/api/0/organizations/${orgSlug}/teams/`, {
    method: 'POST',
    body: { slug },
    cookies: session.cookies,
    csrf: session.csrf,
  });
  if (created.ok || created.status === 201 || created.status === 409) return slug;
  console.error(kleur.red(`✗ team create → ${created.status}`));
  return null;
}

export async function ensureProject(
  session: Session,
  orgSlug: string,
  teamSlug: string,
  name: string,
  platform = 'javascript-node',
): Promise<{ slug: string; dsn: string } | null> {
  const created = await call(session.base, `/api/0/teams/${orgSlug}/${teamSlug}/projects/`, {
    method: 'POST',
    body: { name, platform },
    cookies: session.cookies,
    csrf: session.csrf,
  });

  let slug: string | null = null;
  if ((created.ok || created.status === 201) && created.body && typeof created.body === 'object') {
    slug = (created.body as { slug?: string }).slug ?? null;
  } else if (created.status === 409) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  } else {
    console.error(kleur.red(`✗ project create → ${created.status}`));
    return null;
  }
  if (!slug) return null;

  const keys = await call(session.base, `/api/0/projects/${orgSlug}/${slug}/keys/`, {
    cookies: session.cookies,
  });
  if (keys.ok && Array.isArray(keys.body) && keys.body.length > 0) {
    const dsn = (keys.body[0] as { dsn?: { public?: string } }).dsn?.public;
    if (dsn) return { slug, dsn };
  }
  console.error(kleur.red(`✗ keys fetch → ${keys.status}`));
  return null;
}
