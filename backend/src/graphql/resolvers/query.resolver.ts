import { requireAuthenticatedUser } from "../../auth/authorization";
import type { GraphQLContext } from "../../auth/context";
import { getCurrentUser } from "../../services/auth.service";

export const queryResolvers = {
  Query: {
    health: (): string => "OK",

    me: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext,
    ) => {
      const authenticatedUser =
        requireAuthenticatedUser(context);

      return getCurrentUser(authenticatedUser.id);
    },
  },
};