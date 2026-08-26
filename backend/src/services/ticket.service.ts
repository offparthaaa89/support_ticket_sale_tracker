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
}

export interface ListTicketsInput {
  filter?: TicketFilterInput | null;
  page?: number | null;
  limit?: number | null;
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

interface TicketView {
  id: string;
  title: string;
  description: string;
  priority: Ticket["priority"];
  status: Ticket["status"];
  creator: UserView;
  assignedAgent: UserView | null;
  firstResponseAt: string | null;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
  comments: CommentView[];
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const temporarySlaHours: Record<TicketPriority, number> = {
  URGENT: 2,
  HIGH: 4,
  MEDIUM: 8,
  LOW: 16,
};

const allowedStatusTransitions: Record<
  TicketStatus,
  readonly TicketStatus[]
> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

function badUserInput(message: string): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "BAD_USER_INPUT",
    },
  });
}

function validationError(message: string): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "VALIDATION_ERROR",
    },
  });
}

function notFound(message: string): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
}

function forbidden(message: string): never {
  throw new GraphQLError(message, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
}

function assertUuid(value: string, fieldName: string): void {
  if (!uuidPattern.test(value)) {
    badUserInput(`${fieldName} must be a valid UUID`);
  }
}

function toUserView(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toTicketView(
  ticket: TicketWithRelations,
): TicketView {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    creator: toUserView(ticket.creator),
    assignedAgent: ticket.assignedAgent
      ? toUserView(ticket.assignedAgent)
      : null,
    firstResponseAt:
      ticket.firstResponseAt?.toISOString() ?? null,
    slaDeadline: ticket.slaDeadline.toISOString(),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: ticket.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      author: toUserView(comment.author),
      createdAt: comment.createdAt.toISOString(),
    })),
  };
}

function validateCreateTicketInput(
  input: CreateTicketInput,
): CreateTicketInput {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 3 || title.length > 120) {
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

/**
 * Stage 11 replaces this with the business-hour-aware SLA engine.
 */
function calculateTemporarySlaDeadline(
  priority: TicketPriority,
): Date {
  const hours = temporarySlaHours[priority];

  return new Date(
    Date.now() + hours * 60 * 60 * 1000,
  );
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

  const validated = validateCreateTicketInput(input);

  const ticket = await prisma.ticket.create({
    data: {
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      creatorId: actor.id,
      slaDeadline:
        calculateTemporarySlaDeadline(
          validated.priority,
        ),
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

  return toTicketView(ticket);
}

export async function getTicket(
  actor: AuthenticatedUser,
  ticketId: string,
): Promise<TicketView> {
  assertUuid(ticketId, "ticketId");

  const ticket = await prisma.ticket.findUnique({
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
  });

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

  return toTicketView(ticket);
}

export async function listTickets(
  actor: AuthenticatedUser,
  input: ListTicketsInput,
) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 10;

  if (!Number.isInteger(page) || page < 1) {
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

  const filter = input.filter ?? undefined;

  const assignedAgentId =
    filter?.assignedAgentId ?? undefined;

  if (assignedAgentId !== undefined) {
    assertUuid(
      assignedAgentId,
      "assignedAgentId",
    );
  }

  const where = {
    ...(actor.role === "USER"
      ? {
          creatorId: actor.id,
        }
      : {}),

    ...(filter?.status
      ? {
          status: filter.status,
        }
      : {}),

    ...(filter?.priority
      ? {
          priority: filter.priority,
        }
      : {}),

    ...(assignedAgentId !== undefined
      ? {
          assignedAgentId,
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
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
  ]);

  return {
    items: tickets.map(toTicketView),
    page,
    limit,
    total,
    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / limit),
  };
}

export async function assignTicket(
  input: AssignTicketInput,
): Promise<TicketView> {
  assertUuid(input.ticketId, "ticketId");
  assertUuid(input.agentId, "agentId");

  const [ticket, targetAgent] =
    await Promise.all([
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
    ]);

  if (!ticket) {
    notFound("Ticket not found");
  }

  if (!targetAgent) {
    notFound("Selected user not found");
  }

  if (targetAgent.role !== "AGENT") {
    badUserInput(
      "Selected user is not a support agent",
    );
  }

  if (
    ticket.assignedAgentId === targetAgent.id
  ) {
    return toTicketView(ticket);
  }

  const updatedTicket =
    await prisma.ticket.update({
      where: {
        id: ticket.id,
      },

      data: {
        assignedAgentId: targetAgent.id,
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

  return toTicketView(updatedTicket);
}

export async function updateTicketStatus(
  input: UpdateTicketStatusInput,
): Promise<TicketView> {
  assertUuid(input.ticketId, "ticketId");

  const ticket = await prisma.ticket.findUnique({
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
  });

  if (!ticket) {
    notFound("Ticket not found");
  }

  if (ticket.status === input.status) {
    validationError(
      `Ticket is already ${input.status}`,
    );
  }

  const allowedNextStatuses =
    allowedStatusTransitions[ticket.status];

  if (
    !allowedNextStatuses.includes(input.status)
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

  return toTicketView(updatedTicket);
}