import {
    requireAgent,
    requireAuthenticatedUser,
  } from "../../auth/authorization";
  
  import type {
    GraphQLContext,
  } from "../../auth/context";
  
  import {
    loginUser,
    registerUser,
    type LoginInput,
    type RegisterInput,
  } from "../../services/auth.service";
  
  import {
    assignTicket,
    createTicket,
    updateTicketStatus,
    type AssignTicketInput,
    type CreateTicketInput,
    type UpdateTicketStatusInput,
  } from "../../services/ticket.service";
  
  interface RegisterArgs {
    input: RegisterInput;
  }
  
  interface LoginArgs {
    input: LoginInput;
  }
  
  interface CreateTicketArgs {
    input: CreateTicketInput;
  }
  
  interface AssignTicketArgs {
    input: AssignTicketInput;
  }
  
  interface UpdateTicketStatusArgs {
    input: UpdateTicketStatusInput;
  }
  
  export const mutationResolvers = {
    Mutation: {
      register: (
        _parent: unknown,
        args: RegisterArgs,
      ) => registerUser(args.input),
  
      login: (
        _parent: unknown,
        args: LoginArgs,
      ) => loginUser(args.input),
  
      createTicket: (
        _parent: unknown,
        args: CreateTicketArgs,
        context: GraphQLContext,
      ) => {
        const authenticatedUser =
          requireAuthenticatedUser(context);
  
        return createTicket(
          authenticatedUser,
          args.input,
        );
      },
  
      assignTicket: (
        _parent: unknown,
        args: AssignTicketArgs,
        context: GraphQLContext,
      ) => {
        requireAgent(context);
  
        return assignTicket(args.input);
      },
  
      updateTicketStatus: (
        _parent: unknown,
        args: UpdateTicketStatusArgs,
        context: GraphQLContext,
      ) => {
        requireAgent(context);
  
        return updateTicketStatus(
          args.input,
        );
      },
    },
  };