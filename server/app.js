import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pathToFileURL } from "node:url";
import { createAuthRouter } from "./routes/auth.js";
import { createCheckoutRouter } from "./routes/checkout.js";
import { createOrdersRouter } from "./routes/orders.js";
import { createAuthenticate } from "./middleware/authenticate.js";
import { loadEnv } from "./config/env.js";
import { createPaystackClient } from "./payments/paystack.js";
import { createPaystackWebhookRouter } from "./routes/paystackWebhook.js";

dotenv.config();

const env = loadEnv();
export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use('/api/payments/paystack/webhook', createPaystackWebhookRouter({
  secretKey: env.PAYSTACK_SECRET_KEY,
}));
app.use(express.json());
app.use(cookieParser(env.SECRET));

app.get("/", (req, res) => {
  res.json({ message: "ShopSphare API is running" });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: true, message: "Too many requests. Please try again later." },
});
const authenticate = createAuthenticate(env.SECRET);
const paystackClient = createPaystackClient({
  secretKey: env.PAYSTACK_SECRET_KEY,
  timeoutMs: env.PAYSTACK_TIMEOUT_MS,
});
app.use("/api/auth", authLimiter, createAuthRouter({ secret: env.SECRET, authenticate }));
app.use("/api/checkout", createCheckoutRouter({ authenticate }));
app.use("/api/orders", createOrdersRouter({
  authenticate,
  paystackClient,
  paystackCallbackUrl: env.PAYSTACK_CALLBACK_URL,
}));

app.use((error, req, res, next) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: true,
      code: "VALIDATION_ERROR",
      message: "Invalid JSON request.",
    });
  }
  return next(error);
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
}
