const message: string = "Backend setup is ready";

const port: string = Bun.env.PORT ?? "not configured";

console.log(message);
console.log(`Bun version: ${Bun.version}`);
console.log(`Configured port: ${port}`);