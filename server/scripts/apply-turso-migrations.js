import 'dotenv/config';
import { createClient } from '@libsql/client';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabaseConfig } from '../config/database.js';
import { applyTrackedMigrations, readMigrations } from './tursoMigrations.js';

if (process.env.NODE_ENV !== 'production' || process.env.DATABASE_MODE !== 'turso') {
  throw new Error('Remote migration initialization requires NODE_ENV=production and DATABASE_MODE=turso.');
}

const database = resolveDatabaseConfig(process.env);
const client = createClient({ url: database.url, authToken: database.authToken });
const serverRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

try {
  const migrations = readMigrations(resolve(serverRoot, 'prisma', 'migrations'));
  const result = await applyTrackedMigrations({ client, migrations });
  console.log(`Remote migration check complete: ${result.applied} applied, ${result.skipped} already applied.`);
} finally {
  client.close();
}
