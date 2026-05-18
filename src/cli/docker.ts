import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import kleur from 'kleur';

const here = dirname(fileURLToPath(import.meta.url));
// dist/cli/index.js → package root is two levels up
const PACKAGE_ROOT = resolve(here, '..', '..');
export const COMPOSE_FILE = resolve(PACKAGE_ROOT, 'templates', 'docker-compose.glitchtip.yml');

export function ensureCompose(): void {
  if (!existsSync(COMPOSE_FILE)) {
    console.error(kleur.red(`✗ compose template missing at ${COMPOSE_FILE}`));
    console.error(kleur.gray('  this looks like a broken @uxco/glitchtip install — try reinstalling'));
    process.exit(1);
  }
  const probe = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  if (probe.status !== 0) {
    console.error(kleur.red('✗ docker compose is not available on this machine'));
    console.error(kleur.gray('  install Docker Desktop or the docker-compose-plugin'));
    process.exit(1);
  }
}

export function compose(args: string[], opts: { silent?: boolean } = {}): Promise<number> {
  return new Promise((res) => {
    const proc = spawn('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
      stdio: opts.silent ? 'ignore' : 'inherit',
    });
    proc.on('exit', (code) => res(code ?? 1));
  });
}

export function composeSync(args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], { encoding: 'utf8' });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

export async function waitForWebHealthy(port: number, timeoutMs = 120_000): Promise<boolean> {
  const url = `http://localhost:${port}/api/0/`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.status < 500) return true;
    } catch {
      // not up yet
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return false;
}
