import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { prisma } from '../config/prisma.js';

export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const hashResetToken = (token) => createHash('sha256').update(token, 'utf8').digest('hex');
export const generateResetToken = () => randomBytes(RESET_TOKEN_BYTES).toString('hex');

export class InvalidResetTokenError extends Error {
  constructor() {
    super('This password reset link is invalid or has expired.');
    this.name = 'InvalidResetTokenError';
  }
}

const invalidReset = () => new InvalidResetTokenError();

export async function issuePasswordReset({
  email,
  emailService,
  appBaseUrl,
  ttlMinutes,
  db = prisma,
  now = () => new Date(),
  tokenFactory = generateResetToken,
}) {
  const requestedAt = now();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    hashResetToken(tokenFactory());
    return { eligible: false, delivered: false };
  }

  const rawToken = tokenFactory();
  if (!RESET_TOKEN_PATTERN.test(rawToken)) throw new TypeError('Reset token factory returned an invalid token');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(requestedAt.getTime() + ttlMinutes * 60_000);
  const record = await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: requestedAt },
    });
    return tx.passwordResetToken.create({
      data: { id: randomUUID(), userId: user.id, tokenHash, expiresAt, createdAt: requestedAt },
    });
  });

  const resetUrl = new URL('/reset-password', appBaseUrl);
  resetUrl.searchParams.set('token', rawToken);
  try {
    await emailService.sendPasswordReset({
      to: user.email,
      resetUrl: resetUrl.toString(),
      expiresInMinutes: ttlMinutes,
    });
    return { eligible: true, delivered: true };
  } catch {
    await db.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: now() },
    });
    return { eligible: true, delivered: false };
  }
}

export async function consumePasswordReset({
  token,
  newPassword,
  db = prisma,
  now = () => new Date(),
}) {
  const tokenHash = hashResetToken(token);
  const passwordHash = await bcryptjs.hash(newPassword, 12);
  const consumedAt = now();

  try {
    return await db.$transaction(async (tx) => {
      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!record || record.consumedAt || record.invalidatedAt
        || record.expiresAt <= consumedAt || record.user.status !== 'ACTIVE') throw invalidReset();

      const claim = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: consumedAt },
        },
        data: { consumedAt },
      });
      if (claim.count !== 1) throw invalidReset();

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, authVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          consumedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: consumedAt },
      });
      return { userId: record.userId };
    });
  } catch (error) {
    if (error instanceof InvalidResetTokenError || ['P2034', 'P2028'].includes(error?.code)) throw invalidReset();
    throw error;
  }
}
