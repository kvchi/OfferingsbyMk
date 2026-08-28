import { z } from 'zod';
import {
  MAX_CART_QUANTITY,
  SUPPORTED_COUNTRY,
} from './constants.js';

export const MAX_DISTINCT_CART_LINES = 50;
const MAX_RAW_CART_LINES = 100;
const unsafeTextPattern = /[\u0000-\u001f\u007f<>]/;
const productIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ');

const requiredText = ({ fieldName, min, max }) => z
  .string()
  .trim()
  .min(min, `${fieldName} is too short`)
  .max(max, `${fieldName} is too long`)
  .refine((value) => !unsafeTextPattern.test(value), `${fieldName} contains unsupported characters`)
  .transform(normalizeWhitespace);

const optionalText = ({ fieldName, min, max, pattern }) => z
  .string()
  .trim()
  .max(max, `${fieldName} is too long`)
  .refine((value) => value.length === 0 || value.length >= min, `${fieldName} is too short`)
  .refine((value) => !unsafeTextPattern.test(value), `${fieldName} contains unsupported characters`)
  .refine((value) => value.length === 0 || !pattern || pattern.test(value), `${fieldName} is invalid`)
  .transform((value) => value.length === 0 ? undefined : normalizeWhitespace(value))
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(11)
  .max(30)
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .refine((value) => /^(?:0[789]\d{9}|\+234[789]\d{9})$/.test(value), 'Invalid Nigerian phone number')
  .transform((value) => value.startsWith('0') ? `+234${value.slice(1)}` : value);

const countrySchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => value === 'nigeria' || value === 'ng', 'Country must be Nigeria or NG')
  .transform(() => SUPPORTED_COUNTRY);

export const deliverySchema = z.object({
  recipientName: requiredText({ fieldName: 'recipientName', min: 2, max: 100 }),
  phone: phoneSchema,
  addressLine1: requiredText({ fieldName: 'addressLine1', min: 3, max: 160 }),
  addressLine2: optionalText({ fieldName: 'addressLine2', min: 3, max: 160 }),
  cityOrLga: requiredText({ fieldName: 'cityOrLga', min: 2, max: 100 }),
  state: requiredText({ fieldName: 'state', min: 2, max: 80 }),
  postalCode: optionalText({ fieldName: 'postalCode', min: 6, max: 6, pattern: /^\d{6}$/ }),
  country: countrySchema,
}).strict();

const cartItemSchema = z.object({
  productId: z.string().trim().min(1).max(100).regex(productIdPattern),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
}).strict();

const cartItemsSchema = z
  .array(cartItemSchema)
  .min(1)
  .max(MAX_RAW_CART_LINES)
  .superRefine((items, context) => {
    const quantities = new Map();
    for (const [index, item] of items.entries()) {
      const combined = (quantities.get(item.productId) ?? 0) + item.quantity;
      quantities.set(item.productId, combined);
      if (combined > MAX_CART_QUANTITY) {
        context.addIssue({
          code: 'custom',
          message: `Combined quantity cannot exceed ${MAX_CART_QUANTITY}`,
          path: [index, 'quantity'],
        });
      }
    }
    if (quantities.size > MAX_DISTINCT_CART_LINES) {
      context.addIssue({
        code: 'custom',
        message: `Cart cannot exceed ${MAX_DISTINCT_CART_LINES} distinct products`,
      });
    }
  })
  .transform((items) => {
    const quantities = new Map();
    for (const item of items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    return [...quantities]
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((left, right) => left.productId.localeCompare(right.productId));
  });

export const checkoutRequestSchema = z.object({
  items: cartItemsSchema,
  delivery: deliverySchema,
}).strict();

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const orderListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export const orderIdSchema = z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
