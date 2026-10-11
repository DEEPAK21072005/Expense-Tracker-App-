// scripts/run-cli.js
// Cross-platform CLI runner that works on both Windows (with spaces/ampersands in path) and Linux/Render
const { spawn, spawnSync, execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];
const subArgs = args.slice(1);
const rest = subArgs.join(' ');

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
      case 'eslint': {
        const path = require('path');
        return path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
      }
      default:
        return null;
    }
  } catch (e) {
    return null;
  }
}

const binary = getBinaryPath(command);

if (binary) {
  if (command === 'next') {
    // For Next.js dev and start servers, use spawn
    const child = spawn(process.execPath, [binary, ...subArgs], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code, signal) => {
      process.exit(code !== null ? code : (signal ? 1 : 0));
    });

    child.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });
  } else {
    // For synchronous CLI commands (tsc, vitest, eslint, prisma), use spawnSync
    // This avoids cmd.exe quote-stripping issues with spaces or ampersands in paths
    const result = spawnSync(process.execPath, [binary, ...subArgs], {
      stdio: 'inherit',
      env: process.env,
    });

    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    process.exit(result.status !== null ? result.status : (result.signal ? 1 : 0));
  }
} else {
  execSync(`npx ${command} ${rest}`.trim(), { stdio: 'inherit', env: process.env });
}
