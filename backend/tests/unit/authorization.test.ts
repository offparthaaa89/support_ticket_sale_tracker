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
  
  describe(
    "requireAuthenticatedUser",
    () => {
      test(
        "returns an authenticated user",
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
        "throws UNAUTHENTICATED when no user exists",
        () => {
          const context =
            createContext(null);
  
          try {
            requireAuthenticatedUser(
              context,
            );
  
            throw new Error(
              "Expected authentication to fail",
            );
          } catch (
            error: unknown
          ) {
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
              "UNAUTHENTICATED",
            );
          }
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
  
          try {
            requireAgent(context);
  
            throw new Error(
              "Expected authorization to fail",
            );
          } catch (
            error: unknown
          ) {
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
              "FORBIDDEN",
            );
          }
        },
      );
    },
  );