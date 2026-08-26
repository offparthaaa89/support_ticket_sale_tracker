import { GraphQLError } from "graphql";

import type { GraphQLContext } from "./context";
import type { AuthenticatedUser } from "./jwt";

export function requireAuthenticatedUser(
  context: GraphQLContext,
): AuthenticatedUser {
  if (!context.user) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }

  return context.user;
}

export function requireAgent(
  context: GraphQLContext,
): AuthenticatedUser {
  const user = requireAuthenticatedUser(context);

  if (user.role !== "AGENT") {
    throw new GraphQLError("Agent access required", {
      extensions: {
        code: "FORBIDDEN",
      },
    });
  }

  return user;
}