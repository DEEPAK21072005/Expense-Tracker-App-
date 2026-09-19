// scripts/run-cli.js
// Cross-platform CLI runner that works on both Windows (with spaces/ampersands in path) and Linux/Render
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1).join(' ');

if (process.platform !== 'win32') {
  // On Linux (Render / Docker / CI):
  execSync(`npx ${command} ${rest}`.trim(), { stdio: 'inherit' });
} else {
  // On Windows: use require.resolve to bypass cmd.exe & splitting
  if (command === 'prisma') {
    const cli = require.resolve('prisma/build/index.js');
    execSync(`node "${cli}" ${rest}`.trim(), { stdio: 'inherit' });
  } else if (command === 'next') {
    const cli = require.resolve('next/dist/bin/next');
    execSync(`node "${cli}" ${rest}`.trim(), { stdio: 'inherit' });
  } else if (command === 'tsc') {
    const cli = require.resolve('typescript/bin/tsc');
    execSync(`node "${cli}" ${rest}`.trim(), { stdio: 'inherit' });
  } else if (command === 'vitest') {
    const cli = require.resolve('vitest/vitest.mjs');
    execSync(`node "${cli}" ${rest}`.trim(), { stdio: 'inherit' });
  } else {
    execSync(`npx ${command} ${rest}`.trim(), { stdio: 'inherit' });
  }
}
