import { GraphQLError } from "graphql";

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
      if (!context.user) {
        throw new GraphQLError("Authentication required", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      return getCurrentUser(context.user.id);
    },
  },
};