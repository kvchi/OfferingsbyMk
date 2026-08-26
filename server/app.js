import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pathToFileURL } from "node:url";
import { createAuthRouter } from "./routes/auth.js";
import { createAuthenticate } from "./middleware/authenticate.js";
import { loadEnv } from "./config/env.js";

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
app.use("/api/auth", authLimiter, createAuthRouter({ secret: env.SECRET, authenticate }));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });
}
