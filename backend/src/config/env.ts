const databaseUrl = Bun.env.DATABASE_URL;
const jwtSecret = Bun.env.JWT_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

if (new TextEncoder().encode(jwtSecret).length < 32) {
  throw new Error("JWT_SECRET must be at least 32 bytes");
}

export const env = {
  databaseUrl,
  jwtSecret,
};