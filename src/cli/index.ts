#!/usr/bin/env node
import kleur from 'kleur';
import { runInit } from './init.js';
import { devDown, devLogs, devReset, devUp } from './dev.js';

const HELP = `${kleur.bold('uxco-glitchtip')} — UXCO error tracking helper

Usage:
  uxco-glitchtip <command>

Commands:
  init           Scaffold the SDK into the current project (env vars, bootstrap file)
  dev:up         Start the local GlitchTip stack (Docker) and provision a project DSN
  dev:down       Stop the local stack (keeps data)
  dev:logs       Tail logs from web + worker
  dev:reset      Destroy local volumes (events, projects, users) and start fresh
  help           Show this message
`;

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'help';
  switch (cmd) {
    case 'init':
      await runInit();
      return;
    case 'dev:up':
    case 'dev':
      await devUp();
      return;
    case 'dev:down':
      await devDown();
      return;
    case 'dev:logs':
      await devLogs();
      return;
    case 'dev:reset':
      await devReset();
      return;
    case '-h':
    case '--help':
    case 'help':
      console.log(HELP);
      return;
    default:
      console.error(kleur.red(`unknown command: ${cmd}`));
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(kleur.red(err instanceof Error ? err.stack ?? err.message : String(err)));
  process.exit(1);
});
