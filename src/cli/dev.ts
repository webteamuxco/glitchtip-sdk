import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import kleur from 'kleur';
import prompts from 'prompts';
import { compose, ensureCompose, waitForWebHealthy } from './docker.js';
import { authenticate, ensureOrganization, ensureProject, ensureTeam } from './api.js';

const PORT = Number(process.env.GLITCHTIP_PORT ?? 8000);

export async function devUp(opts: { skipDsn?: boolean } = {}): Promise<void> {
  ensureCompose();
  console.log(kleur.bold('Starting GlitchTip dev stack...'));

  // Run migrations first (one-shot service)
  const migrate = await compose(['run', '--rm', 'migrate']);
  if (migrate !== 0) {
    console.error(kleur.red('✗ migrations failed'));
    process.exit(migrate);
  }

  const up = await compose(['up', '-d', 'postgres', 'redis', 'web', 'worker']);
  if (up !== 0) process.exit(up);

  console.log(kleur.gray(`waiting for http://localhost:${PORT} to become healthy...`));
  const healthy = await waitForWebHealthy(PORT);
  if (!healthy) {
    console.error(kleur.red('✗ web service did not become healthy within 2 minutes'));
    console.error(kleur.gray('  run `uxco-glitchtip dev:logs` to investigate'));
    process.exit(1);
  }
  console.log(kleur.green(`✓ GlitchTip ready at http://localhost:${PORT}`));

  if (opts.skipDsn) return;
  await provisionDsn();
}

export async function devDown(): Promise<void> {
  ensureCompose();
  const code = await compose(['down']);
  process.exit(code);
}

export async function devLogs(): Promise<void> {
  ensureCompose();
  const code = await compose(['logs', '-f', '--tail=100', 'web', 'worker']);
  process.exit(code);
}

export async function devReset(): Promise<void> {
  ensureCompose();
  const { confirm } = (await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'This destroys the GlitchTip database (events, projects, users). Continue?',
    initial: false,
  })) as { confirm?: boolean };
  if (!confirm) {
    console.log(kleur.yellow('aborted'));
    return;
  }
  await compose(['down', '-v']);
  console.log(kleur.green('✓ volumes removed — next `dev:up` will be a fresh install'));
}

async function provisionDsn(): Promise<void> {
  const base = `http://localhost:${PORT}`;
  const envPath = join(process.cwd(), '.env');
  const envLocal = join(process.cwd(), '.env.local');
  const targetEnv = existsSync(envLocal) ? envLocal : envPath;

  if (existsSync(targetEnv) && /^(SENTRY_DSN|NEXT_PUBLIC_SENTRY_DSN|VITE_SENTRY_DSN)=.+$/m.test(readFileSync(targetEnv, 'utf8'))) {
    console.log(kleur.gray(`• ${targetEnv} already has a Sentry DSN — leaving untouched`));
    return;
  }

  const answers = (await prompts(
    [
      {
        type: 'text',
        name: 'email',
        message: 'GlitchTip admin email (created on first run):',
        initial: 'admin@uxco.local',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Admin password (min 8 chars):',
        validate: (v: string) => (v.length >= 8 ? true : 'too short'),
      },
      {
        type: 'text',
        name: 'orgName',
        message: 'Organization name:',
        initial: 'UXCO',
      },
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name (used to tag events):',
        initial: detectProjectName(),
      },
    ],
    { onCancel: () => process.exit(0) },
  )) as { email: string; password: string; orgName: string; projectName: string };

  const session = await authenticate(base, answers.email, answers.password);
  if (!session) {
    manualFallback(base);
    return;
  }
  const orgSlug = await ensureOrganization(session, answers.orgName);
  if (!orgSlug) {
    manualFallback(base);
    return;
  }
  const teamSlug = await ensureTeam(session, orgSlug, 'core');
  if (!teamSlug) {
    manualFallback(base);
    return;
  }
  const project = await ensureProject(session, orgSlug, teamSlug, answers.projectName);
  if (!project) {
    manualFallback(base);
    return;
  }

  const extraVar = detectClientEnvVar();
  writeDsnToEnv(targetEnv, project.dsn, extraVar);
  console.log(kleur.green(`✓ DSN written to ${targetEnv}`));
  console.log(kleur.gray(`  SENTRY_DSN=${project.dsn}`));
  if (extraVar) console.log(kleur.gray(`  ${extraVar}=${project.dsn}`));
}

function detectClientEnvVar(): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return 'NEXT_PUBLIC_SENTRY_DSN';
    if (deps.vite || deps['@vitejs/plugin-react']) return 'VITE_SENTRY_DSN';
    return null;
  } catch {
    return null;
  }
}

function detectProjectName(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { name?: string };
    return pkg.name?.replace(/^@[^/]+\//, '') ?? 'app';
  } catch {
    return 'app';
  }
}

function writeDsnToEnv(file: string, dsn: string, extraVar: string | null = null): void {
  const lines = [`SENTRY_DSN=${dsn}`];
  if (extraVar) lines.push(`${extraVar}=${dsn}`);
  const block = lines.map((l) => `${l}\n`).join('');

  if (!existsSync(file)) {
    writeFileSync(file, block);
    return;
  }

  let current = readFileSync(file, 'utf8');
  for (const line of lines) {
    const key = line.split('=')[0]!;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(current)) {
      current = current.replace(re, line);
    } else {
      if (!current.endsWith('\n')) current += '\n';
      current += `${line}\n`;
    }
  }
  writeFileSync(file, current);
}

function manualFallback(base: string): void {
  console.log(kleur.yellow('\n⚠ automatic provisioning failed.'));
  console.log(`  1. Open ${kleur.cyan(base)}`);
  console.log('  2. Create an account, an organization, and a project');
  console.log(`  3. Paste the DSN into ${kleur.cyan('GLITCHTIP_DSN')} in your .env`);
}
