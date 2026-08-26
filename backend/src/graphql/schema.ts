import { readFileSync } from "node:fs";
import { createSchema } from "graphql-yoga";

import { queryResolvers } from "./resolvers/query.resolver";

const typeDefs = readFileSync(
  new URL("./schema.graphql", import.meta.url),
  "utf8",
);

export const schema = createSchema({
  typeDefs,
  resolvers: [queryResolvers],
});
