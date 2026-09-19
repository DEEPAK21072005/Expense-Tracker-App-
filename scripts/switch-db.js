// scripts/switch-db.js
// Automatically configures Prisma provider (PostgreSQL vs SQLite) based on DATABASE_URL
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

if (isPostgres) {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  console.log('[DB Switch] Configured Prisma for PostgreSQL (hosted database)');
  fs.writeFileSync(schemaPath, schema);

  try {
    console.log('[DB Switch] Pushing schema to PostgreSQL database...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('[DB Switch] Schema successfully synced to PostgreSQL!');
  } catch (err) {
    console.warn('[DB Switch] Notice during prisma db push:', err.message);
  }
} else {
  schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  console.log('[DB Switch] Configured Prisma for SQLite (local database)');
  fs.writeFileSync(schemaPath, schema);
}
