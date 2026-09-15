import { unlinkSync } from 'node:fs';

for (const file of ['package-lock.json', 'yarn.lock']) {
  try {
    unlinkSync(file);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const userAgent = process.env.npm_config_user_agent ?? '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm for this workspace.');
  process.exit(1);
}