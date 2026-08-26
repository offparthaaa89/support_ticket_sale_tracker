import {
    afterAll,
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    PrismaPg,
  } from "@prisma/adapter-pg";
  
  import {
    PrismaClient,
  } from "../../src/generated/prisma/client";
  
  const testDatabaseUrl =
    Bun.env.TEST_DATABASE_URL;
  
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is required for integration tests",
    );
  }
  
  const adapter =
    new PrismaPg({
      connectionString:
        testDatabaseUrl,
    });
  
  const prisma =
    new PrismaClient({
      adapter,
    });
  
  describe(
    "PostgreSQL integration",
    () => {
      test(
        "persists a user and ticket through Prisma and reads them back",
        async () => {
          // Arrange
          const email =
            `integration-${crypto.randomUUID()}@example.com`;
  
          const passwordHash =
            await Bun.password.hash(
              "IntegrationPass123",
              "argon2id",
            );
  
          let userId:
            | string
            | null = null;
  
          let ticketId:
            | string
            | null = null;
  
          try {
            // Act: create a real user
            const user =
              await prisma.user.create({
                data: {
                  name:
                    "Integration Test User",
  
                  email,
  
                  passwordHash,
                },
              });
  
            userId = user.id;
  
            const createdAt =
              new Date(
                "2026-08-24T10:00:00Z",
              );
  
            const slaDeadline =
              new Date(
                "2026-08-24T14:00:00Z",
              );
  
            // Act: create a real ticket
            const ticket =
              await prisma.ticket.create({
                data: {
                  title:
                    "Integration test ticket",
  
                  description:
                    "This ticket verifies real PostgreSQL persistence through Prisma.",
  
                  priority: "HIGH",
  
                  creatorId:
                    user.id,
  
                  createdAt,
  
                  slaDeadline,
                },
              });
  
            ticketId =
              ticket.id;
  
            // Act: query the persisted ticket
            const persistedTicket =
              await prisma.ticket.findUnique({
                where: {
                  id: ticket.id,
                },
  
                include: {
                  creator: true,
                },
              });
  
            // Assert
            expect(
              persistedTicket,
            ).not.toBeNull();
  
            if (!persistedTicket) {
              throw new Error(
                "Expected persisted ticket to exist",
              );
            }
  
            expect(
              persistedTicket.id,
            ).toBe(
              ticket.id,
            );
  
            expect(
              persistedTicket.title,
            ).toBe(
              "Integration test ticket",
            );
  
            expect(
              persistedTicket.priority,
            ).toBe(
              "HIGH",
            );
  
            expect(
              persistedTicket.status,
            ).toBe(
              "OPEN",
            );
  
            expect(
              persistedTicket.assignedAgentId,
            ).toBeNull();
  
            expect(
              persistedTicket.firstResponseAt,
            ).toBeNull();
  
            expect(
              persistedTicket.creator.id,
            ).toBe(
              user.id,
            );
  
            expect(
              persistedTicket.creator.email,
            ).toBe(
              email,
            );
  
            expect(
              persistedTicket.creator.role,
            ).toBe(
              "USER",
            );
  
            expect(
              persistedTicket.createdAt.toISOString(),
            ).toBe(
              "2026-08-24T10:00:00.000Z",
            );
  
            expect(
              persistedTicket.slaDeadline.toISOString(),
            ).toBe(
              "2026-08-24T14:00:00.000Z",
            );
  
            const persistedTicketCount =
              await prisma.ticket.count({
                where: {
                  creatorId:
                    user.id,
                },
              });
  
            expect(
              persistedTicketCount,
            ).toBe(1);
          } finally {
            /*
             * Cleanup matters because integration tests
             * should be repeatable.
             *
             * Ticket must be deleted before User because
             * Ticket.creator uses onDelete: Restrict.
             */
  
            if (ticketId) {
              await prisma.ticket.deleteMany({
                where: {
                  id: ticketId,
                },
              });
            }
  
            if (userId) {
              await prisma.user.deleteMany({
                where: {
                  id: userId,
                },
              });
            }
          }
        },
      );
    },
  );
  
  afterAll(async () => {
    await prisma.$disconnect();
  });