import { jwtVerify, SignJWT } from "jose";

import { env } from "../config/env";

type UserRole = "USER" | "AGENT";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

const secret = new TextEncoder().encode(env.jwtSecret);

function isUserRole(value: unknown): value is UserRole {
  return value === "USER" || value === "AGENT";
}

export async function createAccessToken(
  user: AuthenticatedUser,
): Promise<string> {
  return new SignJWT({
    role: user.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!payload.sub || !isUserRole(payload.role)) {
      return null;
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  } catch {
    return null;
  }
}