import { GraphQLError } from "graphql";

import type { AuthenticatedUser } from "../auth/jwt";

import type {
  User,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

export interface AddCommentInput {
  ticketId: string;
  content: string;
}

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

function validateCommentContent(
  content: string,
): string {
  const trimmedContent =
    content.trim();

  if (
    trimmedContent.length < 1 ||
    trimmedContent.length > 2000
  ) {
    validationError(
      "Comment must be between 1 and 2000 characters",
    );
  }

  return trimmedContent;
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

export async function addComment(
  actor: AuthenticatedUser,
  input: AddCommentInput,
): Promise<CommentView> {
  assertUuid(
    input.ticketId,
    "ticketId",
  );

  const content =
    validateCommentContent(
      input.content,
    );

  const ticket =
    await prisma.ticket.findUnique({
      where: {
        id: input.ticketId,
      },

      select: {
        id: true,
        creatorId: true,
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
      "You do not have access to comment on this ticket",
    );
  }

  const createdAt = new Date();

  const comment =
    await prisma.$transaction(
      async (transaction) => {
        const createdComment =
          await transaction.comment.create({
            data: {
              content,
              ticketId: ticket.id,
              authorId: actor.id,
              createdAt,
            },

            include: {
              author: true,
            },
          });

        if (actor.role === "AGENT") {
          await transaction.ticket.updateMany({
            where: {
              id: ticket.id,
              firstResponseAt: null,
            },

            data: {
              firstResponseAt: createdAt,
            },
          });
        }

        return createdComment;
      },
    );

  return {
    id: comment.id,
    content: comment.content,
    author:
      toUserView(comment.author),
    createdAt:
      comment.createdAt.toISOString(),
  };
}