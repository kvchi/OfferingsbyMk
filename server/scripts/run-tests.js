import { existsSync, rmSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const serverRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const prismaRoot = resolve(serverRoot, "prisma");
const developmentDatabase = resolve(prismaRoot, "dev.db");
const testArtifacts = [
  "test.db", "test.db-journal", "test.db-wal", "test.db-shm",
  "adapter-test.db", "adapter-test.db-journal", "adapter-test.db-wal", "adapter-test.db-shm",
].map((name) =>
  resolve(prismaRoot, name)
);

for (const target of testArtifacts) {
  if (!target.startsWith(`${prismaRoot}${sep}`) || target === developmentDatabase) {
    throw new Error("Refusing to clean a database outside the isolated test scope");
  }
}

const fingerprint = (path) => {
  if (!existsSync(path)) return null;
  return {
    size: statSync(path).size,
    hash: createHash("sha256").update(readFileSync(path)).digest("hex"),
  };
};

const developmentBefore = fingerprint(developmentDatabase);
const testEnv = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_MODE: "local",
  DATABASE_URL: "file:./test.db",
  SECRET: "shopsphare-isolated-test-secret-32-characters",
  CORS_ORIGINS: "https://offeringsby-mk.vercel.app,http://localhost:5174",
  TRUST_PROXY_HOPS: "1",
  PAYSTACK_SECRET_KEY: ["sk", "test", "unit", "only", "not", "a", "credential"].join("_"),
  PAYSTACK_CALLBACK_URL: "http://localhost:5174/payments/paystack/callback",
  APP_BASE_URL: "http://localhost:5174",
  PASSWORD_RESET_TTL_MINUTES: "30",
  EMAIL_DELIVERY_MODE: "test",
};
const prismaCli = resolve(serverRoot, "node_modules", "prisma", "build", "index.js");

const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    cwd: serverRoot,
    env: testEnv,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status === 0;
};

try {
  for (const target of testArtifacts) rmSync(target, { force: true });
  if (run([prismaCli, "migrate", "deploy"])) {
    if (run(["--test", "test/databaseAdapter.test.js"])) {
      if (run(["--test", "test/deployment.test.js"])) {
        if (run(["--test", "test/emailService.test.js"])) {
          if (run(["--test", "test/auth.smoke.test.js"])) {
            if (run(["--test", "test/passwordReset.smoke.test.js"])) {
              if (run(["--test", "test/commerce.smoke.test.js"])) {
                if (run(["--test", "test/checkout.smoke.test.js"])) {
                  run(["--test", "test/payment.smoke.test.js"]);
                }
              }
            }
          }
        }
      }
    }
  }
} finally {
  for (const target of testArtifacts) rmSync(target, { force: true });
  const developmentAfter = fingerprint(developmentDatabase);
  if (JSON.stringify(developmentAfter) !== JSON.stringify(developmentBefore)) {
    throw new Error("Development database changed while running isolated tests");
  }
}
