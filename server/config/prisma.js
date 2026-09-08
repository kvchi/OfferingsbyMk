import 'dotenv/config';
import { createClient as createLibsqlClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import { resolveDatabaseConfig } from './database.js';

export function createPrismaClient({ source = process.env, createClient = createLibsqlClient } = {}) {
  const database = resolveDatabaseConfig(source);
  if (database.mode === 'local') return new PrismaClient();

  const libsql = createClient({ url: database.url, authToken: database.authToken });
  return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
}

const prismaKey = Symbol.for('shopsphare.prisma');
export const prisma = globalThis[prismaKey] ?? createPrismaClient();
globalThis[prismaKey] = prisma;
