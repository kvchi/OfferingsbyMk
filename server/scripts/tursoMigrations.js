import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MIGRATION_TABLE = '_ShopSphareMigration';

const migrationChecksum = (sql) => createHash('sha256').update(sql).digest('hex');

export function readMigrations(migrationsRoot) {
  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_[A-Za-z0-9_-]+$/.test(entry.name))
    .map((entry) => {
      const sql = readFileSync(join(migrationsRoot, entry.name, 'migration.sql'), 'utf8');
      if (sql.trim().length === 0) throw new Error(`Migration ${entry.name} is empty.`);
      return { name: entry.name, sql, checksum: migrationChecksum(sql) };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function applyTrackedMigrations({ client, migrations }) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "${MIGRATION_TABLE}" (
      "name" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "appliedAt" TEXT NOT NULL
    )
  `);

  let applied = 0;
  let skipped = 0;
  for (const migration of migrations) {
    const existing = await client.execute({
      sql: `SELECT "checksum" FROM "${MIGRATION_TABLE}" WHERE "name" = ?`,
      args: [migration.name],
    });
    if (existing.rows.length > 0) {
      if (existing.rows[0].checksum !== migration.checksum) {
        throw new Error(`Applied migration ${migration.name} no longer matches its checked-in SQL.`);
      }
      skipped += 1;
      continue;
    }

    const transaction = await client.transaction('write');
    try {
      const concurrent = await transaction.execute({
        sql: `SELECT "checksum" FROM "${MIGRATION_TABLE}" WHERE "name" = ?`,
        args: [migration.name],
      });
      if (concurrent.rows.length > 0) {
        if (concurrent.rows[0].checksum !== migration.checksum) {
          throw new Error(`Applied migration ${migration.name} no longer matches its checked-in SQL.`);
        }
        await transaction.commit();
        skipped += 1;
        continue;
      }

      await transaction.executeMultiple(migration.sql);
      await transaction.execute({
        sql: `INSERT INTO "${MIGRATION_TABLE}" ("name", "checksum", "appliedAt") VALUES (?, ?, ?)`,
        args: [migration.name, migration.checksum, new Date().toISOString()],
      });
      await transaction.commit();
      applied += 1;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Preserve the original migration error.
      }
      throw error;
    }
  }

  return { applied, skipped, total: migrations.length };
}
