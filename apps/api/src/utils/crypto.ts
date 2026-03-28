import * as argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/env";

// Chaves JWT codificadas como Uint8Array (requisito da jose)
const ACCESS_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// ==================== PASSWORD ====================

// Argon2id é o algoritmo recomendado pela OWASP para hashing de senhas
// Resistente a ataques GPU, side-channel, e time-memory tradeoff
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MB — OWASP recomendação mínima
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ==================== JWT ====================

export interface TokenPayload {
  userId: string;
  type: "client" | "professional" | "admin";
  role: "client" | "professional" | "admin";
}

export async function generateAccessToken(
  payload: TokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .setIssuer("mechago")
    .sign(ACCESS_SECRET);
}

export async function generateRefreshToken(
  payload: TokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRY)
    .setIssuer("mechago")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer: "mechago",
  });
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, {
    issuer: "mechago",
  });
  return payload as unknown as TokenPayload;
}
