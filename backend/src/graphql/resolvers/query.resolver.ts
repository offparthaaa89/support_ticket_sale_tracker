import {
    requireAgent,
    requireAuthenticatedUser,
  } from "../../auth/authorization";
  
  import type {
    GraphQLContext,
  } from "../../auth/context";
  
  import type {
    Role,
  } from "../../generated/prisma/client";
  
  import {
    getCurrentUser,
  } from "../../services/auth.service";
  
  import {
    getTicketDashboard,
  } from "../../services/dashboard.service";
  
  import {
    listHolidays,
  } from "../../services/holiday.service";
  
  import {
    getTicket,
    listTicketPage,
    listTicketsCursor,
    type TicketFilterInput,
  } from "../../services/ticket.service";
  
  import {
    listUsers,
  } from "../../services/user.service";
  
  interface TicketArgs {
    id: string;
  }
  
  interface TicketsArgs {
    filter?: TicketFilterInput | null;
    take?: number | null;
    cursor?: string | null;
  }
  
  interface TicketPageArgs {
    filter?: TicketFilterInput | null;
    page?: number | null;
    limit?: number | null;
  }
  
  interface UsersArgs {
    role?: Role | null;
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
          requireAuthenticatedUser(
            context,
          );
  
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
          requireAuthenticatedUser(
            context,
          );
  
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
          requireAuthenticatedUser(
            context,
          );
  
        return listTicketsCursor(
          authenticatedUser,
          {
            filter: args.filter,
            take: args.take,
            cursor: args.cursor,
          },
        );
      },
  
      ticketPage: (
        _parent: unknown,
        args: TicketPageArgs,
        context: GraphQLContext,
      ) => {
        const authenticatedUser =
          requireAuthenticatedUser(
            context,
          );
  
        return listTicketPage(
          authenticatedUser,
          {
            filter: args.filter,
            page: args.page,
            limit: args.limit,
          },
        );
      },
  
      dashboard: (
        _parent: unknown,
        _args: unknown,
        context: GraphQLContext,
      ) => {
        const authenticatedUser =
          requireAuthenticatedUser(
            context,
          );
  
        return getTicketDashboard(
          authenticatedUser,
        );
      },
  
      users: (
        _parent: unknown,
        args: UsersArgs,
        context: GraphQLContext,
      ) => {
        requireAgent(
          context,
        );
  
        return listUsers(
          args.role ?? null,
        );
      },
  
      holidays: (
        _parent: unknown,
        _args: unknown,
        context: GraphQLContext,
      ) => {
        requireAuthenticatedUser(
          context,
        );
  
        return listHolidays();
      },
    },
  };