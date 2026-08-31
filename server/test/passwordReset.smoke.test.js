import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { hashResetToken } from '../auth/passwordReset.js';

if (process.env.NODE_ENV !== 'test' || process.env.DATABASE_URL !== 'file:./test.db') {
  throw new Error('Password reset tests require the isolated test database runner');
}

const { app, emailService } = await import('../app.js');
const { prisma } = await import('../config/prisma.js');

const email = 'password-reset@shopsphare.invalid';
const missingEmail = 'missing-reset@shopsphare.invalid';
const disabledEmail = 'disabled-reset@shopsphare.invalid';
const originalPassword = 'OriginalPass!2486';
const updatedPassword = 'UpdatedPass!2486';
const genericMessage = 'If an eligible account exists for that email, password reset instructions have been sent.';

const readLatestToken = () => {
  const deliveries = emailService.getTestDeliveries();
  assert.ok(deliveries.length > 0);
  const resetUrl = new URL(deliveries.at(-1).resetUrl);
  const token = resetUrl.searchParams.get('token');
  assert.match(token, /^[a-f0-9]{64}$/);
  return token;
};

before(async () => {
  assert.equal(await prisma.user.count(), 0, 'fresh database must start with zero users');
  emailService.clearTestDeliveries();
  const signup = await request(app).post('/api/auth/signup').send({
    firstname: 'Password',
    lastname: 'Reset',
    email,
    password: originalPassword,
  });
  assert.equal(signup.status, 201);
});

after(async () => {
  emailService.clearTestDeliveries();
  await prisma.user.deleteMany();
  assert.equal(await prisma.passwordResetToken.count(), 0);
  assert.equal(await prisma.user.count(), 0, 'password-reset cleanup must restore zero users');
  await prisma.$disconnect();
});

test('forgot-password is non-enumerating and stores only a token hash', async () => {
  const existing = await request(app).post('/api/auth/forgot-password').send({ email });
  const missing = await request(app).post('/api/auth/forgot-password').send({ email: missingEmail });

  assert.equal(existing.status, 202);
  assert.equal(missing.status, 202);
  assert.deepEqual(existing.body, missing.body);
  assert.equal(existing.body.message, genericMessage);
  assert.equal(emailService.getTestDeliveries().length, 1);

  const rawToken = readLatestToken();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(rawToken) },
  });
  assert.ok(record);
  assert.notEqual(record.tokenHash, rawToken);
  assert.equal(record.consumedAt, null);
  assert.equal(record.invalidatedAt, null);
});

test('a newer request invalidates the previous reset link', async () => {
  const previousToken = readLatestToken();
  const response = await request(app).post('/api/auth/forgot-password').send({ email });
  assert.equal(response.status, 202);
  assert.equal(emailService.getTestDeliveries().length, 2);

  const rejected = await request(app).post('/api/auth/reset-password').send({
    token: previousToken,
    newPassword: updatedPassword,
    confirmPassword: updatedPassword,
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.code, 'INVALID_RESET_TOKEN');
});

test('reset-password changes the password, consumes the link, and revokes existing sessions', async () => {
  const token = readLatestToken();
  const loginBeforeReset = await request(app).post('/api/auth/login').send({
    email,
    password: originalPassword,
  });
  assert.equal(loginBeforeReset.status, 200);

  const mismatch = await request(app).post('/api/auth/reset-password').send({
    token,
    newPassword: updatedPassword,
    confirmPassword: 'DifferentPass!2486',
  });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.code, 'PASSWORD_MISMATCH');

  const reset = await request(app).post('/api/auth/reset-password').send({
    token,
    newPassword: updatedPassword,
    confirmPassword: updatedPassword,
  });
  assert.equal(reset.status, 200);

  const reused = await request(app).post('/api/auth/reset-password').send({
    token,
    newPassword: originalPassword,
    confirmPassword: originalPassword,
  });
  assert.equal(reused.status, 400);
  assert.equal(reused.body.code, 'INVALID_RESET_TOKEN');

  const oldPasswordLogin = await request(app).post('/api/auth/login').send({
    email,
    password: originalPassword,
  });
  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await request(app).post('/api/auth/login').send({
    email,
    password: updatedPassword,
  });
  assert.equal(newPasswordLogin.status, 200);

  const revokedSession = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${loginBeforeReset.body.token}`);
  assert.equal(revokedSession.status, 401);

  const currentSession = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${newPasswordLogin.body.token}`);
  assert.equal(currentSession.status, 200);

  const consumed = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  assert.ok(consumed?.consumedAt);
  const user = await prisma.user.findUnique({ where: { email } });
  assert.equal(user?.authVersion, 1);
});

test('expired links and disabled accounts retain the generic safe behavior', async () => {
  const requested = await request(app).post('/api/auth/forgot-password').send({ email });
  assert.equal(requested.status, 202);
  const expiredToken = readLatestToken();
  await prisma.passwordResetToken.update({
    where: { tokenHash: hashResetToken(expiredToken) },
    data: { expiresAt: new Date(Date.now() - 1_000) },
  });

  const expired = await request(app).post('/api/auth/reset-password').send({
    token: expiredToken,
    newPassword: originalPassword,
    confirmPassword: originalPassword,
  });
  assert.equal(expired.status, 400);
  assert.equal(expired.body.code, 'INVALID_RESET_TOKEN');

  await prisma.user.create({
    data: {
      firstName: 'Disabled',
      lastName: 'Account',
      email: disabledEmail,
      passwordHash: 'not-used',
      status: 'DISABLED',
    },
  });
  const deliveryCount = emailService.getTestDeliveries().length;
  const disabled = await request(app).post('/api/auth/forgot-password').send({ email: disabledEmail });
  assert.equal(disabled.status, 202);
  assert.equal(disabled.body.message, genericMessage);
  assert.equal(emailService.getTestDeliveries().length, deliveryCount);
});
