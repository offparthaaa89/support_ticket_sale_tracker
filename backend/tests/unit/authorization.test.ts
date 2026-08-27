import {
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    GraphQLError,
  } from "graphql";
  
  import {
    requireAgent,
    requireAuthenticatedUser,
  } from "../../src/auth/authorization";
  
  import type {
    GraphQLContext,
  } from "../../src/auth/context";
  
  function createContext(
    role: "USER" | "AGENT" | null,
  ): GraphQLContext {
    return {
      request:
        new Request(
          "http://localhost/graphql",
        ),
  
      user:
        role === null
          ? null
          : {
              id:
                role === "AGENT"
                  ? "agent-id"
                  : "user-id",
  
              role,
            },
    };
  }
  
  function expectGraphQLErrorCode(
    callback: () => unknown,
    expectedCode: string,
  ): void {
    try {
      callback();
  
      throw new Error(
        "Expected GraphQL error",
      );
    } catch (error: unknown) {
      expect(
        error,
      ).toBeInstanceOf(
        GraphQLError,
      );
  
      if (
        !(
          error instanceof
          GraphQLError
        )
      ) {
        throw error;
      }
  
      expect(
        error.extensions.code,
      ).toBe(
        expectedCode,
      );
    }
  }
  
  describe(
    "requireAuthenticatedUser",
    () => {
      test(
        "returns an authenticated USER",
        () => {
          const context =
            createContext("USER");
  
          const user =
            requireAuthenticatedUser(
              context,
            );
  
          expect(user.id).toBe(
            "user-id",
          );
  
          expect(user.role).toBe(
            "USER",
          );
        },
      );
  
      test(
        "returns an authenticated AGENT",
        () => {
          const context =
            createContext("AGENT");
  
          const user =
            requireAuthenticatedUser(
              context,
            );
  
          expect(user.id).toBe(
            "agent-id",
          );
  
          expect(user.role).toBe(
            "AGENT",
          );
        },
      );
  
      test(
        "throws UNAUTHENTICATED when no user exists",
        () => {
          const context =
            createContext(null);
  
          expectGraphQLErrorCode(
            () =>
              requireAuthenticatedUser(
                context,
              ),
            "UNAUTHENTICATED",
          );
        },
      );
    },
  );
  
  describe(
    "requireAgent",
    () => {
      test(
        "allows an AGENT",
        () => {
          const context =
            createContext("AGENT");
  
          const agent =
            requireAgent(context);
  
          expect(agent.id).toBe(
            "agent-id",
          );
  
          expect(agent.role).toBe(
            "AGENT",
          );
        },
      );
  
      test(
        "throws FORBIDDEN for a USER",
        () => {
          const context =
            createContext("USER");
  
          expectGraphQLErrorCode(
            () =>
              requireAgent(context),
            "FORBIDDEN",
          );
        },
      );
  
      test(
        "throws UNAUTHENTICATED when no user exists",
        () => {
          const context =
            createContext(null);
  
          expectGraphQLErrorCode(
            () =>
              requireAgent(context),
            "UNAUTHENTICATED",
          );
        },
      );
    },
  );