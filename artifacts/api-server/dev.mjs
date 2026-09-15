import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const environment = { ...process.env, NODE_ENV: 'development' };

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(packageManager, args, {
      cwd: artifactDir,
      env: environment,
      stdio: 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code ?? 'unknown'}`));
    });
  });
}

try {
  await run(['run', 'build']);
  await run(['run', 'start']);
} catch (error) {
  console.error(error);
  process.exit(1);
}