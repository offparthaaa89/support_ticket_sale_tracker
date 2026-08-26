import type {
    TicketStatus,
  } from "../generated/prisma/client";
  
  const allowedStatusTransitions: Record<
    TicketStatus,
    readonly TicketStatus[]
  > = {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
    RESOLVED: ["CLOSED"],
    CLOSED: [],
  };
  
  export function canTransitionTicketStatus(
    currentStatus: TicketStatus,
    nextStatus: TicketStatus,
  ): boolean {
    return allowedStatusTransitions[
      currentStatus
    ].includes(nextStatus);
  }