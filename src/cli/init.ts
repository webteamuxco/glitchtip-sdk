import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import kleur from 'kleur';
import prompts from 'prompts';

type Framework = 'nest' | 'next' | 'unknown';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function detectFramework(pkg: PackageJson): Framework {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['@nestjs/core']) return 'nest';
  if (deps.next) return 'next';
  return 'unknown';
}

function appendEnvExample(cwd: string, framework: Framework): void {
  const file = join(cwd, '.env.example');
  const vars =
    framework === 'next'
      ? ['SENTRY_DSN=', 'NEXT_PUBLIC_SENTRY_DSN=', 'SENTRY_ENVIRONMENT=development', 'SENTRY_RELEASE=']
      : ['SENTRY_DSN=', 'SENTRY_ENVIRONMENT=development', 'SENTRY_RELEASE='];

  const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const toAdd = vars.filter((line) => !existing.includes(line.split('=')[0]!));
  if (toAdd.length === 0) return;

  const block = `\n# UXCO GlitchTip\n${toAdd.join('\n')}\n`;
  if (existing) appendFileSync(file, block);
  else writeFileSync(file, block.trimStart());
  console.log(kleur.green(`✓ updated ${file}`));
}

function writeNestSnippet(cwd: string): void {
  const file = join(cwd, 'src', 'glitchtip.bootstrap.ts');
  if (existsSync(file)) {
    console.log(kleur.yellow(`• ${file} already exists, skipping`));
    return;
  }
  writeFileSync(
    file,
    `import { GlitchtipModule } from '@webteamuxco/glitchtip-sdk/nest';\n\nexport const glitchtipModule = GlitchtipModule.forRoot();\n`,
  );
  console.log(kleur.green(`✓ wrote ${file}`));
  console.log(kleur.gray('  → import glitchtipModule into AppModule.imports'));
}

function writeNextSnippet(cwd: string): void {
  const instrumentation = join(cwd, 'instrumentation.ts');
  if (!existsSync(instrumentation)) {
    writeFileSync(
      instrumentation,
      `import { initServer } from '@webteamuxco/glitchtip-sdk/next/server';\n\nexport async function register(): Promise<void> {\n  initServer();\n}\n`,
    );
    console.log(kleur.green(`✓ wrote ${instrumentation}`));
  }

  const clientFile = join(cwd, 'instrumentation-client.ts');
  if (!existsSync(clientFile)) {
    writeFileSync(
      clientFile,
      `import { initClient } from '@webteamuxco/glitchtip-sdk/next/client';\n\ninitClient();\n`,
    );
    console.log(kleur.green(`✓ wrote ${clientFile}`));
  }
}

export async function runInit(): Promise<void> {
  const cwd = resolve(process.cwd());
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.error(kleur.red('✗ no package.json found in current directory'));
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson;
  const detected = detectFramework(pkg);

  const { framework } = (await prompts({
    type: 'select',
    name: 'framework',
    message: 'Which framework is this project?',
    choices: [
      { title: `NestJS${detected === 'nest' ? ' (detected)' : ''}`, value: 'nest' },
      { title: `Next.js${detected === 'next' ? ' (detected)' : ''}`, value: 'next' },
    ],
    initial: detected === 'next' ? 1 : 0,
  })) as { framework?: Framework };

  if (!framework) {
    console.log(kleur.yellow('aborted'));
    return;
  }

  console.log(kleur.bold(`\nSetting up @webteamuxco/glitchtip-sdk for ${framework}\n`));
  appendEnvExample(cwd, framework);
  if (framework === 'nest') writeNestSnippet(cwd);
  if (framework === 'next') writeNextSnippet(cwd);

  console.log(kleur.bold('\nNext steps:'));
  console.log(`  1. ${kleur.cyan('pnpm dlx @webteamuxco/glitchtip-sdk dev:up')}  ${kleur.gray('# starts a local GlitchTip and writes the DSN to .env')}`);
  console.log(`  2. ${kleur.cyan('pnpm dev')}`);
}
