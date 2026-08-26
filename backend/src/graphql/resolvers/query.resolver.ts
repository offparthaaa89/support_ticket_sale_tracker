import {
    requireAuthenticatedUser,
  } from "../../auth/authorization";
  
  import type {
    GraphQLContext,
  } from "../../auth/context";
  
  import {
    getCurrentUser,
  } from "../../services/auth.service";
  
  import {
    getTicket,
    listTickets,
    type TicketFilterInput,
  } from "../../services/ticket.service";
  
  interface TicketArgs {
    id: string;
  }
  
  interface TicketsArgs {
    filter?: TicketFilterInput | null;
    page?: number | null;
    limit?: number | null;
  }
  
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
  
        return getCurrentUser(
          authenticatedUser.id,
        );
      },
  
      ticket: (
        _parent: unknown,
        args: TicketArgs,
        context: GraphQLContext,
      ) => {
        const authenticatedUser =
          requireAuthenticatedUser(context);
  
        return getTicket(
          authenticatedUser,
          args.id,
        );
      },
  
      tickets: (
        _parent: unknown,
        args: TicketsArgs,
        context: GraphQLContext,
      ) => {
        const authenticatedUser =
          requireAuthenticatedUser(context);
  
        return listTickets(
          authenticatedUser,
          {
            filter: args.filter,
            page: args.page,
            limit: args.limit,
          },
        );
      },
    },
  };