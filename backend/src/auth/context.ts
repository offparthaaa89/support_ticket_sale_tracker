import {
    verifyAccessToken,
    type AuthenticatedUser,
  } from "./jwt";
  
  export interface GraphQLContext {
    request: Request;
    user: AuthenticatedUser | null;
  }
  
  export async function createGraphQLContext({
    request,
  }: {
    request: Request;
  }): Promise<GraphQLContext> {
    const authorization = request.headers.get("authorization");
  
    if (!authorization) {
      return {
        request,
        user: null,
      };
    }
  
    const parts = authorization.trim().split(/\s+/);
  
    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return {
        request,
        user: null,
      };
    }
  
    const user = await verifyAccessToken(parts[1]);
  
    return {
      request,
      user,
    };
  }