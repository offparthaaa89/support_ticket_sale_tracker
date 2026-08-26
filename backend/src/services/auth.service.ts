import { GraphQLError } from "graphql";

import { createAccessToken } from "../auth/jwt";
import { prisma } from "../lib/prisma";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "AGENT";
  createdAt: string;
  updatedAt: string;
}

interface AuthPayload {
  token: string;
  user: PublicUser;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: "USER" | "AGENT";
  createdAt: Date;
  updatedAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function validateRegistration(input: RegisterInput): {
  name: string;
  email: string;
  password: string;
} {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (name.length < 2 || name.length > 100) {
    throw new GraphQLError(
      "Name must be between 2 and 100 characters",
      {
        extensions: {
          code: "BAD_USER_INPUT",
        },
      },
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email.length > 254 || !emailPattern.test(email)) {
    throw new GraphQLError("A valid email address is required", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  if (password.length < 8 || password.length > 128) {
    throw new GraphQLError(
      "Password must be between 8 and 128 characters",
      {
        extensions: {
          code: "BAD_USER_INPUT",
        },
      },
    );
  }

  return {
    name,
    email,
    password,
  };
}

function invalidCredentials(): never {
  throw new GraphQLError("Invalid email or password", {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
}

export async function registerUser(
  input: RegisterInput,
): Promise<AuthPayload> {
  const validated = validateRegistration(input);

  const existingUser = await prisma.user.findUnique({
    where: {
      email: validated.email,
    },
  });

  if (existingUser) {
    throw new GraphQLError(
      "An account with this email already exists",
      {
        extensions: {
          code: "BAD_USER_INPUT",
        },
      },
    );
  }

  const passwordHash = await Bun.password.hash(
    validated.password,
    "argon2id",
  );

  const user = await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      passwordHash,
    },
  });

  const token = await createAccessToken({
    id: user.id,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
}

export async function loginUser(
  input: LoginInput,
): Promise<AuthPayload> {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return invalidCredentials();
  }

  const passwordMatches = await Bun.password.verify(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return invalidCredentials();
  }

  const token = await createAccessToken({
    id: user.id,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
}

export async function getCurrentUser(
  userId: string,
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new GraphQLError(
      "Authenticated user no longer exists",
      {
        extensions: {
          code: "UNAUTHENTICATED",
        },
      },
    );
  }

  return toPublicUser(user);
}