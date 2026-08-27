import {
    canTransitionTicketStatus,
  } from "./ticket-rules";

import { GraphQLError } from "graphql";

import type { AuthenticatedUser } from "../auth/jwt";

import type {
  Comment,
  Ticket,
  TicketPriority,
  TicketStatus,
  User,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import {
  calculateTicketSLADueTimes,
  getTicketSLAInfo,
  type SLAState,
} from "./sla.service";

import {
  getHolidayDates,
} from "./holiday.service";

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
}

export interface AssignTicketInput {
  ticketId: string;
  agentId: string;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  status: TicketStatus;
}

export interface TicketFilterInput {
  status?: TicketStatus | null;
  priority?: TicketPriority | null;
  assignedAgentId?: string | null;
  slaState?: SLAState | null;
}

export interface ListTicketsInput {
  filter?: TicketFilterInput | null;
  page?: number | null;
  limit?: number | null;
}

export interface ListTicketsCursorInput {
  filter?: TicketFilterInput | null;
  take?: number | null;
  cursor?: string | null;
}

type CommentWithAuthor = Comment & {
  author: User;
};

type TicketWithRelations = Ticket & {
  creator: User;
  assignedAgent: User | null;
  comments: CommentWithAuthor[];
};

interface UserView {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  createdAt: string;
  updatedAt: string;
}

interface CommentView {
  id: string;
  content: string;
  author: UserView;
  createdAt: string;
}

interface TicketSLAView {
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstResponseState: SLAState;
  resolutionState: SLAState;
  overallState: SLAState;
  firstResponseRemainingMinutes: number;
  resolutionRemainingMinutes: number;
}

export interface TicketView {
  id: string;
  title: string;
  description: string;
  priority: Ticket["priority"];
  status: Ticket["status"];
  creator: UserView;
  assignedAgent: UserView | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  sla: TicketSLAView;

  /*
   * Temporary compatibility fields.
   * Existing frontend still uses these.
   */
  slaDeadline: string;
  slaState: SLAState;

  createdAt: string;
  updatedAt: string;
  comments: CommentView[];
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function badUserInput(
  message: string,
): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "BAD_USER_INPUT",
    },
  });
}

function validationError(
  message: string,
): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "VALIDATION_ERROR",
    },
  });
}

function notFound(
  message: string,
): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
}

function forbidden(
  message: string,
): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
}

function assertUuid(
  value: string,
  fieldName: string,
): void {
  if (!uuidPattern.test(value)) {
    badUserInput(
      `${fieldName} must be a valid UUID`,
    );
  }
}

function toUserView(
  user: User,
): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt:
      user.createdAt.toISOString(),
    updatedAt:
      user.updatedAt.toISOString(),
  };
}

function toTicketView(
  ticket: TicketWithRelations,
  holidays: readonly Date[],
  now: Date = new Date(),
): TicketView {
  const sla =
    getTicketSLAInfo({
      createdAt: ticket.createdAt,
      priority: ticket.priority,
      firstResponseAt:
        ticket.firstResponseAt,
      resolvedAt:
        ticket.resolvedAt,
      holidays,
      now,
    });

  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,

    creator:
      toUserView(ticket.creator),

    assignedAgent:
      ticket.assignedAgent
        ? toUserView(
            ticket.assignedAgent,
          )
        : null,

    firstResponseAt:
      ticket.firstResponseAt
        ?.toISOString() ??
      null,

    resolvedAt:
      ticket.resolvedAt
        ?.toISOString() ??
      null,

    sla: {
      firstResponseDueAt:
        sla.firstResponseDueAt
          .toISOString(),

      resolutionDueAt:
        sla.resolutionDueAt
          .toISOString(),

      firstResponseState:
        sla.firstResponseState,

      resolutionState:
        sla.resolutionState,

      overallState:
        sla.overallState,

      firstResponseRemainingMinutes:
        sla.firstResponseRemainingMinutes,

      resolutionRemainingMinutes:
        sla.resolutionRemainingMinutes,
    },

    /*
     * Legacy frontend compatibility.
     */
    slaDeadline:
      sla.resolutionDueAt
        .toISOString(),

    slaState:
      sla.overallState,

    createdAt:
      ticket.createdAt.toISOString(),

    updatedAt:
      ticket.updatedAt.toISOString(),

    comments:
      ticket.comments.map(
        (comment) => ({
          id: comment.id,
          content: comment.content,

          author:
            toUserView(
              comment.author,
            ),

          createdAt:
            comment.createdAt
              .toISOString(),
        }),
      ),
  };
}

function validateCreateTicketInput(
  input: CreateTicketInput,
): CreateTicketInput {
  const title = input.title.trim();

  const description =
    input.description.trim();

  if (
    title.length < 3 ||
    title.length > 120
  ) {
    validationError(
      "Title must be between 3 and 120 characters",
    );
  }

  if (
    description.length < 10 ||
    description.length > 5000
  ) {
    validationError(
      "Description must be between 10 and 5000 characters",
    );
  }

  return {
    title,
    description,
    priority: input.priority,
  };
}

export async function createTicket(
  actor: AuthenticatedUser,
  input: CreateTicketInput,
): Promise<TicketView> {
  if (actor.role !== "USER") {
    forbidden(
      "Only customers can create support tickets",
    );
  }

  const validated =
    validateCreateTicketInput(input);

  const createdAt =
    new Date();

  const holidays =
    await getHolidayDates();

  const {
    resolutionDueAt,
  } =
    calculateTicketSLADueTimes(
      createdAt,
      validated.priority,
      holidays,
    );

  const ticket =
    await prisma.ticket.create({
      data: {
        title: validated.title,
        description:
          validated.description,
        priority:
          validated.priority,

        creatorId:
          actor.id,

        createdAt,

        slaDeadline:
          resolutionDueAt,
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  return toTicketView(
    ticket,
    holidays,
  );
}

export async function getTicket(
  actor: AuthenticatedUser,
  ticketId: string,
): Promise<TicketView> {
  assertUuid(
    ticketId,
    "ticketId",
  );

  const [
    ticket,
    holidays,
  ] = await Promise.all([
    prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),

    getHolidayDates(),
  ]);

  if (!ticket) {
    notFound("Ticket not found");
  }

  if (
    actor.role === "USER" &&
    ticket.creatorId !== actor.id
  ) {
    forbidden(
      "You do not have access to this ticket",
    );
  }

  return toTicketView(
    ticket,
    holidays,
  );
}

export async function listTicketPage(
  actor: AuthenticatedUser,
  input: ListTicketsInput,
) {
  const page =
    input.page ?? 1;

  const limit =
    input.limit ?? 10;

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    validationError(
      "Page must be an integer greater than or equal to 1",
    );
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    validationError(
      "Limit must be an integer between 1 and 100",
    );
  }

  const filter =
    input.filter ?? undefined;

  const assignedAgentId =
    filter?.assignedAgentId ??
    undefined;

  if (
    assignedAgentId !== undefined
  ) {
    assertUuid(
      assignedAgentId,
      "assignedAgentId",
    );
  }

  const where = {
    ...(actor.role === "USER"
      ? {
          creatorId:
            actor.id,
        }
      : {}),

    ...(filter?.status
      ? {
          status:
            filter.status,
        }
      : {}),

    ...(filter?.priority
      ? {
          priority:
            filter.priority,
        }
      : {}),

    ...(assignedAgentId !==
    undefined
      ? {
          assignedAgentId,
        }
      : {}),
  };

  const skip =
    (page - 1) * limit;

  const [
    tickets,
    total,
    holidays,
  ] = await Promise.all([
      prisma.ticket.findMany({
        where,

        skip,
        take: limit,

        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],

        include: {
          creator: true,
          assignedAgent: true,

          comments: {
            include: {
              author: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),

      prisma.ticket.count({
        where,
      }),

      getHolidayDates(),
    ]);

  const now = new Date();

  return {
    items: tickets.map(
      (ticket) =>
        toTicketView(
          ticket,
          holidays,
          now,
        ),
    ),

    page,
    limit,
    total,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total / limit,
          ),
  };
}

export async function assignTicket(
  input: AssignTicketInput,
): Promise<TicketView> {
  assertUuid(
    input.ticketId,
    "ticketId",
  );

  assertUuid(
    input.agentId,
    "agentId",
  );

  const [
    ticket,
    targetAgent,
    holidays,
  ] = await Promise.all([
    prisma.ticket.findUnique({
      where: {
        id: input.ticketId,
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),

    prisma.user.findUnique({
      where: {
        id: input.agentId,
      },
    }),

    getHolidayDates(),
  ]);

  if (!ticket) {
    notFound("Ticket not found");
  }

  if (!targetAgent) {
    notFound(
      "Selected user not found",
    );
  }

  if (
    targetAgent.role !== "AGENT"
  ) {
    badUserInput(
      "Selected user is not a support agent",
    );
  }

  if (
    ticket.assignedAgentId ===
    targetAgent.id
  ) {
    return toTicketView(
      ticket,
      holidays,
    );
  }

  const updatedTicket =
    await prisma.ticket.update({
      where: {
        id: ticket.id,
      },

      data: {
        assignedAgentId:
          targetAgent.id,
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  return toTicketView(
    updatedTicket,
    holidays,
  );
}

export async function updateTicketStatus(
  input: UpdateTicketStatusInput,
): Promise<TicketView> {
  assertUuid(
    input.ticketId,
    "ticketId",
  );

  const [
    ticket,
    holidays,
  ] = await Promise.all([
    prisma.ticket.findUnique({
      where: {
        id: input.ticketId,
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),

    getHolidayDates(),
  ]);

  if (!ticket) {
    notFound("Ticket not found");
  }

  if (
    ticket.status === input.status
  ) {
    validationError(
      `Ticket is already ${input.status}`,
    );
  }

  if (
    !canTransitionTicketStatus(
      ticket.status,
      input.status,
    )
  ) {
    validationError(
      `Invalid status transition from ${ticket.status} to ${input.status}`,
    );
  }

  const updatedTicket =
    await prisma.ticket.update({
      where: {
        id: ticket.id,
      },

      data: {
        status: input.status,

        ...(input.status === "RESOLVED"
          ? {
              resolvedAt:
                new Date(),
            }
          : {}),
      },

      include: {
        creator: true,
        assignedAgent: true,

        comments: {
          include: {
            author: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  return toTicketView(
    updatedTicket,
    holidays,
  );
}

export async function resolveTicket(
  ticketId: string,
): Promise<TicketView> {
  return updateTicketStatus({
    ticketId,
    status: "RESOLVED",
  });
}

export async function listTicketsCursor(
  actor: AuthenticatedUser,
  input: ListTicketsCursorInput,
) {
  const take =
    input.take ?? 10;

  if (
    !Number.isInteger(take) ||
    take < 1 ||
    take > 100
  ) {
    validationError(
      "Take must be an integer between 1 and 100",
    );
  }

  const cursor =
    input.cursor?.trim() ||
    undefined;

  if (cursor) {
    assertUuid(
      cursor,
      "cursor",
    );
  }

  const filter =
    input.filter ??
    undefined;

  const assignedAgentId =
    filter?.assignedAgentId ??
    undefined;

  if (assignedAgentId) {
    assertUuid(
      assignedAgentId,
      "assignedAgentId",
    );
  }

  const where = {
    ...(actor.role === "USER"
      ? {
          creatorId:
            actor.id,
        }
      : {}),

    ...(filter?.status
      ? {
          status:
            filter.status,
        }
      : {}),

    ...(filter?.priority
      ? {
          priority:
            filter.priority,
        }
      : {}),

    ...(assignedAgentId
      ? {
          assignedAgentId,
        }
      : {}),
  };

  const holidays =
    await getHolidayDates();

  const now =
    new Date();

  const desiredSLAState =
    filter?.slaState ??
    undefined;

  const batchSize =
    Math.min(
      100,
      Math.max(
        take * 2,
        20,
      ),
    );

  const matchingTickets:
    TicketView[] = [];

  let scanCursor =
    cursor;

  let reachedEnd =
    false;

  while (
    matchingTickets.length <
      take + 1 &&
    !reachedEnd
  ) {
    const tickets =
      await prisma.ticket.findMany({
        where,

        take: batchSize,

        ...(scanCursor
          ? {
              cursor: {
                id: scanCursor,
              },

              skip: 1,
            }
          : {}),

        orderBy: [
          {
            createdAt:
              "desc",
          },
          {
            id:
              "desc",
          },
        ],

        include: {
          creator: true,
          assignedAgent: true,

          comments: {
            include: {
              author: true,
            },

            orderBy: {
              createdAt:
                "asc",
            },
          },
        },
      });

    if (tickets.length === 0) {
      reachedEnd = true;
      break;
    }

    for (const ticket of tickets) {
      const ticketView =
        toTicketView(
          ticket,
          holidays,
          now,
        );

      if (
        !desiredSLAState ||
        ticketView
          .sla
          .overallState ===
          desiredSLAState
      ) {
        matchingTickets.push(
          ticketView,
        );
      }

      if (
        matchingTickets.length >=
        take + 1
      ) {
        break;
      }
    }

    if (
      tickets.length <
      batchSize
    ) {
      reachedEnd = true;
    }

    const lastScannedTicket =
      tickets[
        tickets.length - 1
      ];

    if (lastScannedTicket) {
      scanCursor =
        lastScannedTicket.id;
    }
  }

  const hasNextPage =
    matchingTickets.length >
    take;

  const nodes =
    matchingTickets.slice(
      0,
      take,
    );

  const lastNode =
    nodes[
      nodes.length - 1
    ];

  return {
    nodes,

    pageInfo: {
      hasNextPage,

      endCursor:
        lastNode?.id ??
        null,
    },
  };
}