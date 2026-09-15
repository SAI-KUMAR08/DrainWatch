/**
 * Vercel Build Output API v3 script.
 *
 * Vercel's `framework: "vite"` preset ignores the `outputDirectory` override
 * in vercel.json for monorepos where the Vite app lives in a subdirectory.
 * This script bypasses framework detection entirely by writing the
 * `.vercel/output/` directory structure directly.
 *
 * Docs: https://vercel.com/docs/build-output-api/v3
 */

import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { execSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Some CommonJS packages (pino plugins, esbuild plugins) need `require`.
globalThis.require = createRequire(import.meta.url);

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function main() {
  // ── 1. Build the Vite frontend ──────────────────────────────────────────
  console.log('\n[vercel-build] Building frontend (Vite)…');
  execSync('pnpm --filter @workspace/drainwatch run build', {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production' },
  });

  // ── 2. Set up .vercel/output skeleton ───────────────────────────────────
  const vercelOutput = path.join(root, '.vercel', 'output');
  await rm(vercelOutput, { recursive: true, force: true });

  // ── 3. Copy static assets ───────────────────────────────────────────────
  const staticDir = path.join(vercelOutput, 'static');
  await mkdir(staticDir, { recursive: true });
  await cp(
    path.join(root, 'artifacts', 'drainwatch', 'dist'),
    staticDir,
    { recursive: true },
  );
  console.log('[vercel-build] Static files copied to .vercel/output/static/');

  // ── 4. Bundle api/index.ts into a Vercel Node function ──────────────────
  console.log('[vercel-build] Bundling API function…');
  const funcDir = path.join(vercelOutput, 'functions', 'api', 'index.func');
  await mkdir(funcDir, { recursive: true });

  // Use esbuild binary (available at repo-root node_modules/.bin/esbuild
  // via pnpm workspace linking from artifacts/api-server devDependencies).
  const esbuildBin = path.join(root, 'node_modules', '.bin', 'esbuild');
  const outFile = path.join(funcDir, 'index.mjs');
  const entryPoint = path.join(root, 'api', 'index.ts');

  // CJS compat shim — same pattern as artifacts/api-server/build.mjs.
  const bannerJs = [
    "import { createRequire as __crReq } from 'node:module';",
    "import __bPath from 'node:path';",
    "import __bUrl from 'node:url';",
    "globalThis.require = __crReq(import.meta.url);",
    "globalThis.__filename = __bUrl.fileURLToPath(import.meta.url);",
    "globalThis.__dirname = __bPath.dirname(globalThis.__filename);",
  ].join(' ');

  // Use spawnSync with an array — avoids all shell quoting / space issues.
  const esbuildResult = spawnSync(
    esbuildBin,
    [
      entryPoint,
      '--bundle',
      '--platform=node',
      '--format=esm',
      `--outfile=${outFile}`,
      '--external:pg-native',
      '--external:pino-pretty', // dev only (logger.ts guards NODE_ENV)
      '--external:*.node',
      `--banner:js=${bannerJs}`,
    ],
    { stdio: 'inherit', cwd: root },
  );
  if (esbuildResult.status !== 0) process.exit(esbuildResult.status ?? 1);

  // ── 5. Write .vc-config.json for the function ────────────────────────────
  await writeFile(
    path.join(funcDir, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs22.x',
        handler: 'index.mjs',
        launcherType: 'Nodejs',
        maxDuration: 60,
      },
      null,
      2,
    ),
  );

  // ── 6. Write top-level routing config ────────────────────────────────────
  await writeFile(
    path.join(vercelOutput, 'config.json'),
    JSON.stringify(
      {
        version: 3,
        routes: [
          // Route /api/* to the serverless function
          { src: '/api/(.*)', dest: '/api/index' },
          // Serve static files from .vercel/output/static/
          { handle: 'filesystem' },
          // SPA fallback — all other routes serve index.html
          { src: '/(.*)', dest: '/index.html' },
        ],
      },
      null,
      2,
    ),
  );

  console.log('[vercel-build] .vercel/output/ created successfully ✓');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
