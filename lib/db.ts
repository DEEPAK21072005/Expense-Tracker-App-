import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

function prepareDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NODE_ENV === 'production' ? 'file:/tmp/dev.db' : 'file:./dev.db';
  }

  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:')) {
    const rawPath = url.replace(/^file:/, '');
    const isTmp = rawPath.startsWith('/tmp') || rawPath.startsWith('\\tmp');
    if (isTmp) {
      try {
        const dir = path.dirname(rawPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(rawPath) || fs.statSync(rawPath).size === 0) {
          const candidates = [
            path.join(process.cwd(), 'prisma', 'template.db'),
            path.join(process.cwd(), 'prisma', 'dev.db'),
            path.resolve('prisma/template.db'),
            path.resolve('prisma/dev.db'),
            path.join(__dirname, '..', '..', 'prisma', 'template.db'),
            path.join(__dirname, '..', 'prisma', 'template.db'),
          ];
          for (const candidate of candidates) {
            try {
              if (fs.existsSync(candidate) && fs.statSync(candidate).size > 0) {
                fs.copyFileSync(candidate, rawPath);
                console.log(`[Database] Initialized SQLite at ${rawPath} from template (${candidate})`);
                return;
              }
            } catch {
              // try next candidate
            }
          }
        }
      } catch (err) {
        console.error('[Database] Failed preparing SQLite in /tmp:', err);
      }
    }
  }
}

prepareDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
