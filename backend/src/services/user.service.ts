import type {
    Role,
    User,
  } from "../generated/prisma/client";
  
  import { prisma } from "../lib/prisma";
  
  export interface UserView {
    id: string;
    name: string;
    email: string;
    role: User["role"];
    createdAt: string;
    updatedAt: string;
  }
  
  function toUserView(
    user: User,
  ): UserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
  
      createdAt:
        user.createdAt.toISOString(),
  
      updatedAt:
        user.updatedAt.toISOString(),
    };
  }
  
  export async function listUsers(
    role?: Role | null,
  ): Promise<UserView[]> {
    const users =
      await prisma.user.findMany({
        where: role
          ? {
              role,
            }
          : undefined,
  
        orderBy: [
          {
            role: "asc",
          },
          {
            name: "asc",
          },
        ],
      });
  
    return users.map(toUserView);
  }