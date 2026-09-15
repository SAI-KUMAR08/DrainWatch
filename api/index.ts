import app from '../artifacts/api-server/src/app';
import { seedDemoReports } from '../artifacts/api-server/src/lib/drainwatch';

let seeded = false;

export default async function handler(req: any, res: any) {
  if (!seeded) {
    await seedDemoReports();
    seeded = true;
  }

  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}