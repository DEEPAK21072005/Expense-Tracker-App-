// scripts/run-cli.js
// Cross-platform CLI runner that works on both Windows (with spaces/ampersands in path) and Linux/Render
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];
const rest = args.slice(1).join(' ');

function getBinaryPath(cmd) {
  try {
    switch (cmd) {
      case 'prisma':
        return require.resolve('prisma/build/index.js');
      case 'next':
        return require.resolve('next/dist/bin/next');
      case 'tsc':
        return require.resolve('typescript/bin/tsc');
      case 'vitest':
        return require.resolve('vitest/vitest.mjs');
      default:
        return null;
    }
  } catch (e) {
    return null;
  }
}

const binary = getBinaryPath(command);

if (binary) {
  execSync(`node "${binary}" ${rest}`.trim(), { stdio: 'inherit' });
} else {
  execSync(`npx ${command} ${rest}`.trim(), { stdio: 'inherit' });
}
