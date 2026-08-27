import {
    afterAll,
    beforeAll,
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    GraphQLError,
  } from "graphql";
  
  import type {
    AuthenticatedUser,
  } from "../../src/auth/jwt";
  
  import {
    prisma,
  } from "../../src/lib/prisma";
  
  import {
    addComment,
  } from "../../src/services/comment.service";
  
  import {
    assignTicket,
    createTicket,
    getTicket,
    resolveTicket,
    updateTicketStatus,
  } from "../../src/services/ticket.service";
  
  const TEST_EMAIL_PREFIX =
    "integration-stage6-";
  
  let reporterId = "";
  let secondReporterId = "";
  let agentId = "";
  let ticketId = "";
  
  function actor(
    id: string,
    role: "USER" | "AGENT",
  ): AuthenticatedUser {
    return {
      id,
      role,
    };
  }
  
  function expectGraphQLErrorCode(
    error: unknown,
    expectedCode: string,
  ): void {
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
  
  async function cleanup(): Promise<void> {
    const testUsers =
      await prisma.user.findMany({
        where: {
          email: {
            startsWith:
              TEST_EMAIL_PREFIX,
          },
        },
  
        select: {
          id: true,
        },
      });
  
    const userIds =
      testUsers.map(
        (user) => user.id,
      );
  
    if (userIds.length === 0) {
      return;
    }
  
    const testTickets =
      await prisma.ticket.findMany({
        where: {
          creatorId: {
            in: userIds,
          },
        },
  
        select: {
          id: true,
        },
      });
  
    const ticketIds =
      testTickets.map(
        (ticket) => ticket.id,
      );
  
    if (ticketIds.length > 0) {
      await prisma.comment.deleteMany({
        where: {
          ticketId: {
            in: ticketIds,
          },
        },
      });
  
      await prisma.ticket.deleteMany({
        where: {
          id: {
            in: ticketIds,
          },
        },
      });
    }
  
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  }
  
  describe(
    "real PostgreSQL ticket flow",
    () => {
      beforeAll(async () => {
        await cleanup();
  
        const reporter =
          await prisma.user.create({
            data: {
              name:
                "Integration Reporter",
  
              email:
                `${TEST_EMAIL_PREFIX}reporter@example.com`,
  
              passwordHash:
                "integration-test-hash",
  
              role:
                "USER",
            },
          });
  
        const secondReporter =
          await prisma.user.create({
            data: {
              name:
                "Integration Reporter Two",
  
              email:
                `${TEST_EMAIL_PREFIX}reporter-two@example.com`,
  
              passwordHash:
                "integration-test-hash",
  
              role:
                "USER",
            },
          });
  
        const agent =
          await prisma.user.create({
            data: {
              name:
                "Integration Agent",
  
              email:
                `${TEST_EMAIL_PREFIX}agent@example.com`,
  
              passwordHash:
                "integration-test-hash",
  
              role:
                "AGENT",
            },
          });
  
        reporterId =
          reporter.id;
  
        secondReporterId =
          secondReporter.id;
  
        agentId =
          agent.id;
      });
  
      afterAll(async () => {
        await cleanup();
  
        await prisma.$disconnect();
      });
  
      test(
        "creates a ticket and persists SLA information",
        async () => {
          const createdTicket =
            await createTicket(
              actor(
                reporterId,
                "USER",
              ),
              {
                title:
                  "Integration ticket",
  
                description:
                  "A valid ticket created by the PostgreSQL integration test.",
  
                priority:
                  "URGENT",
              },
            );
  
          ticketId =
            createdTicket.id;
  
          expect(
            createdTicket.status,
          ).toBe("OPEN");
  
          expect(
            createdTicket.creator.id,
          ).toBe(reporterId);
  
          expect(
            createdTicket.sla
              .firstResponseDueAt,
          ).toBeTruthy();
  
          expect(
            createdTicket.sla
              .resolutionDueAt,
          ).toBeTruthy();
  
          const persisted =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
            });
  
          expect(persisted).not.toBeNull();
  
          expect(
            persisted?.slaDeadline
              .toISOString(),
          ).toBe(
            createdTicket.sla
              .resolutionDueAt,
          );
        },
      );
  
      test(
        "rejects invalid ticket validation before persistence",
        async () => {
          try {
            await createTicket(
              actor(
                reporterId,
                "USER",
              ),
              {
                title:
                  "x",
  
                description:
                  "This description is long enough.",
  
                priority:
                  "HIGH",
              },
            );
  
            throw new Error(
              "Expected validation to fail",
            );
          } catch (
            error: unknown
          ) {
            expectGraphQLErrorCode(
              error,
              "VALIDATION_ERROR",
            );
          }
  
          const count =
            await prisma.ticket.count({
              where: {
                creatorId:
                  reporterId,
  
                title:
                  "x",
              },
            });
  
          expect(count).toBe(0);
        },
      );
  
      test(
        "rejects ticket creation by an AGENT",
        async () => {
          try {
            await createTicket(
              actor(
                agentId,
                "AGENT",
              ),
              {
                title:
                  "Agent-created ticket",
  
                description:
                  "Agents must not create reporter tickets.",
  
                priority:
                  "LOW",
              },
            );
  
            throw new Error(
              "Expected authorization to fail",
            );
          } catch (
            error: unknown
          ) {
            expectGraphQLErrorCode(
              error,
              "FORBIDDEN",
            );
          }
        },
      );
  
      test(
        "prevents another reporter from reading the ticket",
        async () => {
          try {
            await getTicket(
              actor(
                secondReporterId,
                "USER",
              ),
              ticketId,
            );
  
            throw new Error(
              "Expected ownership check to fail",
            );
          } catch (
            error: unknown
          ) {
            expectGraphQLErrorCode(
              error,
              "FORBIDDEN",
            );
          }
        },
      );
  
      test(
        "reporter comment persists without setting firstResponseAt",
        async () => {
          const comment =
            await addComment(
              actor(
                reporterId,
                "USER",
              ),
              {
                ticketId,
  
                content:
                  "Reporter adds more context.",
              },
            );
  
          expect(
            comment.content,
          ).toBe(
            "Reporter adds more context.",
          );
  
          const persisted =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
  
              select: {
                firstResponseAt:
                  true,
              },
            });
  
          expect(
            persisted?.firstResponseAt,
          ).toBeNull();
        },
      );
  
      test(
        "first agent comment records firstResponseAt exactly once",
        async () => {
          await addComment(
            actor(
              agentId,
              "AGENT",
            ),
            {
              ticketId,
  
              content:
                "Agent first response.",
            },
          );
  
          const afterFirstResponse =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
  
              select: {
                firstResponseAt:
                  true,
              },
            });
  
          const firstResponseAt =
            afterFirstResponse
              ?.firstResponseAt;
  
          expect(
            firstResponseAt,
          ).not.toBeNull();
  
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                10,
              ),
          );
  
          await addComment(
            actor(
              agentId,
              "AGENT",
            ),
            {
              ticketId,
  
              content:
                "Agent follow-up response.",
            },
          );
  
          const afterSecondResponse =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
  
              select: {
                firstResponseAt:
                  true,
              },
            });
  
          expect(
            afterSecondResponse
              ?.firstResponseAt
              ?.toISOString(),
          ).toBe(
            firstResponseAt
              ?.toISOString(),
          );
        },
      );
  
      test(
        "rejects assignment to a non-agent user",
        async () => {
          try {
            await assignTicket({
              ticketId,
              agentId:
                secondReporterId,
            });
  
            throw new Error(
              "Expected assignment to fail",
            );
          } catch (
            error: unknown
          ) {
            expectGraphQLErrorCode(
              error,
              "BAD_USER_INPUT",
            );
          }
        },
      );
  
      test(
        "assigns the ticket to an AGENT",
        async () => {
          const assigned =
            await assignTicket({
              ticketId,
              agentId,
            });
  
          expect(
            assigned.assignedAgent
              ?.id,
          ).toBe(agentId);
  
          const persisted =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
  
              select: {
                assignedAgentId:
                  true,
              },
            });
  
          expect(
            persisted
              ?.assignedAgentId,
          ).toBe(agentId);
        },
      );
  
      test(
        "rejects invalid OPEN to RESOLVED transition",
        async () => {
          try {
            await resolveTicket(
              ticketId,
            );
  
            throw new Error(
              "Expected transition to fail",
            );
          } catch (
            error: unknown
          ) {
            expectGraphQLErrorCode(
              error,
              "VALIDATION_ERROR",
            );
          }
        },
      );
  
      test(
        "moves ticket through IN_PROGRESS to RESOLVED and persists resolvedAt",
        async () => {
          const inProgress =
            await updateTicketStatus({
              ticketId,
              status:
                "IN_PROGRESS",
            });
  
          expect(
            inProgress.status,
          ).toBe(
            "IN_PROGRESS",
          );
  
          const resolved =
            await resolveTicket(
              ticketId,
            );
  
          expect(
            resolved.status,
          ).toBe(
            "RESOLVED",
          );
  
          expect(
            resolved.resolvedAt,
          ).not.toBeNull();
  
          const persisted =
            await prisma.ticket.findUnique({
              where: {
                id: ticketId,
              },
  
              include: {
                comments: {
                  orderBy: {
                    createdAt:
                      "asc",
                  },
                },
              },
            });
  
          expect(
            persisted?.status,
          ).toBe(
            "RESOLVED",
          );
  
          expect(
            persisted?.resolvedAt,
          ).not.toBeNull();
  
          expect(
            persisted?.firstResponseAt,
          ).not.toBeNull();
  
          expect(
            persisted?.assignedAgentId,
          ).toBe(
            agentId,
          );
  
          expect(
            persisted?.comments.length,
          ).toBe(3);
        },
      );
    },
  );