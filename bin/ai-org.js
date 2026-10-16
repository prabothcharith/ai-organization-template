#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'src', 'cli.ts');
const result = spawnSync(process.execPath, ['--experimental-strip-types', entry, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});
if (result.error) {
  console.error(`Unable to start ai-org: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
