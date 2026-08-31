import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const unauthorized = (res) =>
  res.status(401).json({ error: true, message: "Authentication required." });

export function createAuthenticate(secret) {
  return async function authenticate(req, res, next) {
    const authorization = req.get("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) return unauthorized(res);

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload !== "object" || typeof payload.sub !== "string") {
        return unauthorized(res);
      }

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status !== "ACTIVE") return unauthorized(res);
      const tokenAuthVersion = payload.av === undefined ? 0 : payload.av;
      if (!Number.isInteger(tokenAuthVersion) || tokenAuthVersion !== user.authVersion) {
        return unauthorized(res);
      }

      req.user = user;
      next();
    } catch {
      return unauthorized(res);
    }
  };
}
