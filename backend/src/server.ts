import { createYoga } from "graphql-yoga";

import {
  createGraphQLContext,
} from "./auth/context";

import {
  schema,
} from "./graphql/schema";

const port =
  Number(
    Bun.env.PORT ??
      "4000",
  );

if (
  !Number.isInteger(port) ||
  port <= 0
) {
  throw new Error(
    "PORT must be a positive integer",
  );
}

const yoga = createYoga({
  schema,
  context:
    createGraphQLContext,

  maskedErrors: true,
});

const server =
  Bun.serve({
    port,

    fetch: (request) =>
      yoga.fetch(request),
  });

console.log(
  `GraphQL server running at http://localhost:${server.port}${yoga.graphqlEndpoint}`,
);