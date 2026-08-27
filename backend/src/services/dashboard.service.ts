import type {
    Prisma,
  } from "../generated/prisma/client";
  
  import type {
    AuthenticatedUser,
  } from "../auth/jwt";
  
  import {
    prisma,
  } from "../lib/prisma";
  
  import {
    getHolidayDates,
  } from "./holiday.service";
  
  import {
    getTicketSLAInfo,
  } from "./sla.service";
  
  export interface TicketDashboardView {
    openTickets: number;
    inProgressTickets: number;
    atRiskTickets: number;
    breachedTickets: number;
  }
  
  export async function getTicketDashboard(
    actor: AuthenticatedUser,
  ): Promise<TicketDashboardView> {
    const ownershipWhere:
      Prisma.TicketWhereInput =
      actor.role === "USER"
        ? {
            creatorId:
              actor.id,
          }
        : {};
  
    const [
      openTickets,
      inProgressTickets,
      tickets,
      holidays,
    ] = await Promise.all([
      prisma.ticket.count({
        where: {
          ...ownershipWhere,
          status: "OPEN",
        },
      }),
  
      prisma.ticket.count({
        where: {
          ...ownershipWhere,
          status: "IN_PROGRESS",
        },
      }),
  
      prisma.ticket.findMany({
        where:
          ownershipWhere,
  
        select: {
          createdAt: true,
          priority: true,
          firstResponseAt:
            true,
          resolvedAt: true,
        },
      }),
  
      getHolidayDates(),
    ]);
  
    const now =
      new Date();
  
    let atRiskTickets =
      0;
  
    let breachedTickets =
      0;
  
    for (const ticket of tickets) {
      const sla =
        getTicketSLAInfo({
          createdAt:
            ticket.createdAt,
  
          priority:
            ticket.priority,
  
          firstResponseAt:
            ticket.firstResponseAt,
  
          resolvedAt:
            ticket.resolvedAt,
  
          holidays,
          now,
        });
  
      if (
        sla.overallState ===
        "AT_RISK"
      ) {
        atRiskTickets += 1;
      }
  
      if (
        sla.overallState ===
        "BREACHED"
      ) {
        breachedTickets += 1;
      }
    }
  
    return {
      openTickets,
      inProgressTickets,
      atRiskTickets,
      breachedTickets,
    };
  }