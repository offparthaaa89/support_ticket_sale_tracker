import { createYoga } from "graphql-yoga";

import { schema } from "./graphql/schema";

const port = Number(Bun.env.PORT ?? "4000");

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer");
}

const yoga = createYoga({
  schema,

  context: ({ request }) => ({
    request,
  }),
});

const server = Bun.serve({
  port,
  fetch: yoga,
});

console.log(
  `GraphQL server running at http://localhost:${server.port}${yoga.graphqlEndpoint}`,
);