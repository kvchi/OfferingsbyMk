import { prisma } from '../config/prisma.js';

const assertIdentifier = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
};

export function ownedOrderWhere(authenticatedUserId, orderId) {
  return {
    id: assertIdentifier(orderId, 'orderId'),
    userId: assertIdentifier(authenticatedUserId, 'authenticatedUserId'),
  };
}

export function findOwnedOrder({ db = prisma, authenticatedUserId, orderId, include }) {
  return db.order.findFirst({
    where: ownedOrderWhere(authenticatedUserId, orderId),
    include,
  });
}
