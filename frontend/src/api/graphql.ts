interface GraphQLErrorItem {
    message: string;
    extensions?: {
      code?: string;
    };
  }
  
  interface GraphQLResponse<TData> {
    data?: TData;
    errors?: GraphQLErrorItem[];
  }
  
  export class GraphQLRequestError extends Error {
    readonly code: string | undefined;
  
    constructor(
      message: string,
      code?: string,
    ) {
      super(message);
  
      this.name = "GraphQLRequestError";
      this.code = code;
    }
  }
  
  const graphqlUrl =
    import.meta.env.VITE_GRAPHQL_URL ??
    "http://localhost:4000/graphql";
  
  export async function graphqlRequest<
    TData,
    TVariables = undefined,
  >(
    query: string,
    variables?: TVariables,
    accessToken?: string,
  ): Promise<TData> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
  
    if (accessToken) {
      headers.Authorization =
        `Bearer ${accessToken}`;
    }
  
    const response = await fetch(
      graphqlUrl,
      {
        method: "POST",
        headers,
  
        body: JSON.stringify({
          query,
          variables,
        }),
      },
    );
  
    if (!response.ok) {
      throw new GraphQLRequestError(
        `Request failed with status ${response.status}`,
      );
    }
  
    const result =
      (await response.json()) as GraphQLResponse<TData>;
  
    const firstError =
      result.errors?.[0];
  
    if (firstError) {
      throw new GraphQLRequestError(
        firstError.message,
        firstError.extensions?.code,
      );
    }
  
    if (!result.data) {
      throw new GraphQLRequestError(
        "GraphQL response did not contain data",
      );
    }
  
    return result.data;
  }