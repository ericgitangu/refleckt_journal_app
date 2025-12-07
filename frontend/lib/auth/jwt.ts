import jwt from "jsonwebtoken";

export interface BackendJwtClaims {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Generate a JWT token for the backend API
 * This token is signed with JWT_SECRET and contains the claims expected by the Lambda authorizer
 */
export function generateBackendToken(user: {
  id: string;
  email: string;
  name?: string;
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[JWT] JWT_SECRET is not set. Available env vars:", Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SECRET')));
    throw new Error("JWT_SECRET environment variable is not set");
  }

  console.log("[JWT] Generating token for user:", user.email, "with secret length:", secret.length);

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 24 * 60 * 60; // 24 hours

  const claims: BackendJwtClaims = {
    sub: user.id,
    email: user.email,
    tenant_id: "default", // Default tenant for single-tenant setup
    role: "user",
    iat: now,
    exp: now + expiresIn,
  };

  return jwt.sign(claims, secret, { algorithm: "HS256" });
}

/**
 * Verify a backend JWT token
 */
export function verifyBackendToken(token: string): BackendJwtClaims | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    return jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as BackendJwtClaims;
  } catch {
    return null;
  }
}
