import express from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .refine((value) => /^\+?[1-9]\d{6,14}$/.test(value), "Invalid phone number")
  .optional()
  .or(z.literal("").transform(() => undefined));

const signupSchema = z.object({
  firstname: z.string().trim().min(1).max(80),
  lastname: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: z.string().min(8).max(72),
  phone: phoneSchema,
}).strict();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
}).strict();

const invalidInput = (res) =>
  res.status(400).json({ error: true, message: "Invalid request data." });

export function createAuthRouter({ secret, authenticate }) {
  const router = express.Router();

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return invalidInput(res);

  const { firstname, lastname, email, password, phone } = parsed.data;

  try {
    const passwordHash = await bcryptjs.hash(password, 12);

    await prisma.user.create({
      data: {
        firstName: firstname,
        lastName: lastname,
        email,
        passwordHash,
        phone,
      },
    });

    return res.status(201).json({
      error: false,
      message: "Profile created successfully. Welcome to OfferingsbyMK!",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: true, message: "Unable to create account." });
    }

    return res.status(500).json({
      error: true,
      message: "Unable to create account. Something went wrong.",
    });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return invalidInput(res);

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    const isMatch = user ? await bcryptjs.compare(password, user.passwordHash) : false;
    if (!user || !isMatch || user.status !== "ACTIVE") {
      return res.status(401).json({ error: true, message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { email: user.email, role: user.role },
      secret,
      { algorithm: "HS256", expiresIn: "7d", subject: user.id }
    );

    return res.status(200).json({
      error: false,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstname: user.firstName,
        lastname: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return res.status(500).json({
      error: true,
      message: "Unable to login.",
    });
  }
});

router.get("/me", authenticate, (req, res) => {
  const { id, firstName, lastName, email, phone, status, role, createdAt, updatedAt } = req.user;
  return res.json({
    error: false,
    user: { id, firstname: firstName, lastname: lastName, email, phone, status, role, createdAt, updatedAt },
  });
});

  return router;
}
