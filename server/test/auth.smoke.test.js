import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createSignupPayload } from "../../client/src/utils/authPayload.mjs";

if (process.env.NODE_ENV !== "test" || process.env.DATABASE_URL !== "file:./test.db") {
  throw new Error("Authentication tests require the isolated test database runner");
}

const { app } = await import("../app.js");
const { prisma } = await import("../config/prisma.js");

const email = "smoke-test@shopsphare.invalid";
const password = "SmokeTest!2486";
const frontendSignupPayload = createSignupPayload({
  firstname: "Smoke",
  lastname: "Tester",
  email: "  SMOKE-TEST@SHOPSPHARE.INVALID ",
  password,
  phone: "+2348012345678",
  confirm_password: password,
});

before(async () => {
  assert.equal(await prisma.user.count(), 0, "fresh database must start with zero users");
});

after(async () => {
  await prisma.user.deleteMany({ where: { email } });
  assert.equal(await prisma.user.count(), 0, "smoke-test cleanup must restore zero users");
  await prisma.$disconnect();
});

test("frontend signup payload contract creates a normalized account", async () => {
  assert.deepEqual(Object.keys(frontendSignupPayload).sort(), [
    "email",
    "firstname",
    "lastname",
    "password",
    "phone",
  ]);
  const response = await request(app).post("/api/auth/signup").send(frontendSignupPayload);

  assert.equal(response.status, 201);
  const user = await prisma.user.findUnique({ where: { email } });
  assert.equal(user?.email, email);
  assert.equal(user?.phone, "+2348012345678");
  assert.equal(user?.status, "ACTIVE");
  assert.equal(user?.role, "CUSTOMER");
});

test('health, exact CORS allow-listing, and one-hop proxy trust are deployment-safe', async () => {
  const health = await request(app).get('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok' });

  const allowed = await request(app).get('/health').set('Origin', 'https://offeringsby-mk.vercel.app');
  assert.equal(allowed.headers['access-control-allow-origin'], 'https://offeringsby-mk.vercel.app');
  const local = await request(app).get('/health').set('Origin', 'http://localhost:5174');
  assert.equal(local.headers['access-control-allow-origin'], 'http://localhost:5174');
  const rejected = await request(app).get('/health').set('Origin', 'https://untrusted.example.invalid');
  assert.equal(rejected.headers['access-control-allow-origin'], undefined);

  const trustProxy = app.get('trust proxy fn');
  assert.equal(trustProxy('127.0.0.1', 0), true);
  assert.equal(trustProxy('127.0.0.1', 1), false);
});

test("signup accepts an omitted optional phone", async () => {
  const optionalPhoneEmail = "no-phone@shopsphare.invalid";
  const response = await request(app).post("/api/auth/signup").send({
    firstname: "No",
    lastname: "Phone",
    email: optionalPhoneEmail,
    password,
  });

  assert.equal(response.status, 201);
  const user = await prisma.user.findUnique({ where: { email: optionalPhoneEmail } });
  assert.equal(user?.phone, null);
  await prisma.user.delete({ where: { email: optionalPhoneEmail } });
});

test("duplicate email is handled safely", async () => {
  const response = await request(app).post("/api/auth/signup").send({
    firstname: "Duplicate",
    lastname: "Tester",
    email,
    password,
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, "Unable to create account.");
});

test("invalid logins return the same generic error", async () => {
  const missingUser = await request(app)
    .post("/api/auth/login")
    .send({ email: "missing@shopsphare.invalid", password });
  const wrongPassword = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Incorrect!2486" });

  assert.equal(missingUser.status, 401);
  assert.equal(wrongPassword.status, 401);
  assert.equal(missingUser.body.message, "Invalid email or password.");
  assert.equal(wrongPassword.body.message, missingUser.body.message);
});

test("login returns a JWT accepted by the protected endpoint", async () => {
  const login = await request(app).post("/api/auth/login").send({ email, password });
  assert.equal(login.status, 200);
  assert.equal(typeof login.body.token, "string");

  const rejected = await request(app)
    .get("/api/auth/me")
    .set("Authorization", "Bearer invalid-token");
  assert.equal(rejected.status, 401);

  const authenticated = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`);
  assert.equal(authenticated.status, 200);
  assert.equal(authenticated.body.user.email, email);
  assert.equal(authenticated.headers["x-content-type-options"], "nosniff");

  await prisma.user.update({ where: { email }, data: { status: "DISABLED" } });
  const disabled = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`);
  assert.equal(disabled.status, 401);
});
