import {
    prisma,
  } from "../src/lib/prisma";
  
  import {
    calculateTicketSLADueTimes,
  } from "../src/services/sla.service";
  
  const REPORTER_EMAIL =
    "reporter@example.com";
  
  const AGENT_EMAIL =
    "agent@example.com";
  
  const DEMO_PASSWORD =
    "Password123!";
  
  const SEED_TICKET_TITLES = [
    "Production checkout is unavailable",
    "Customers receive delayed confirmation emails",
    "Billing address validation is inconsistent",
    "Minor spacing issue in account settings",
  ] as const;
  
  async function main(): Promise<void> {
    const passwordHash =
      await Bun.password.hash(
        DEMO_PASSWORD,
        {
          algorithm: "argon2id",
        },
      );
  
    const reporter =
      await prisma.user.upsert({
        where: {
          email: REPORTER_EMAIL,
        },
  
        update: {
          name: "Demo Reporter",
          role: "USER",
          passwordHash,
        },
  
        create: {
          name: "Demo Reporter",
          email: REPORTER_EMAIL,
          role: "USER",
          passwordHash,
        },
      });
  
    const agent =
      await prisma.user.upsert({
        where: {
          email: AGENT_EMAIL,
        },
  
        update: {
          name: "Demo Support Agent",
          role: "AGENT",
          passwordHash,
        },
  
        create: {
          name: "Demo Support Agent",
          email: AGENT_EMAIL,
          role: "AGENT",
          passwordHash,
        },
      });
  
    const holidayDate =
      new Date(
        "2026-10-02T00:00:00.000Z",
      );
  
    const holiday =
      await prisma.holiday.upsert({
        where: {
          date: holidayDate,
        },
  
        update: {
          name: "Gandhi Jayanti",
        },
  
        create: {
          date: holidayDate,
          name: "Gandhi Jayanti",
        },
      });
  
    const existingSeedTickets =
      await prisma.ticket.findMany({
        where: {
          creatorId: reporter.id,
  
          title: {
            in: [
              ...SEED_TICKET_TITLES,
            ],
          },
        },
  
        select: {
          id: true,
        },
      });
  
    const existingTicketIds =
      existingSeedTickets.map(
        (ticket) => ticket.id,
      );
  
    if (
      existingTicketIds.length > 0
    ) {
      await prisma.comment.deleteMany({
        where: {
          ticketId: {
            in: existingTicketIds,
          },
        },
      });
  
      await prisma.ticket.deleteMany({
        where: {
          id: {
            in: existingTicketIds,
          },
        },
      });
    }
  
    const holidays =
      await prisma.holiday.findMany({
        select: {
          date: true,
        },
      });
  
    const holidayDates =
      holidays.map(
        (item) => item.date,
      );
  
    const now =
      new Date();
  
    const urgentCreatedAt =
      new Date(
        now.getTime() -
          20 * 60 * 1000,
      );
  
    const highCreatedAt =
      new Date(
        now.getTime() -
          2 * 60 * 60 * 1000,
      );
  
    const mediumCreatedAt =
      new Date(
        now.getTime() -
          6 * 60 * 60 * 1000,
      );
  
    const lowCreatedAt =
      new Date(
        now.getTime() -
          24 * 60 * 60 * 1000,
      );
  
    const urgentSLA =
      calculateTicketSLADueTimes(
        urgentCreatedAt,
        "URGENT",
        holidayDates,
      );
  
    const highSLA =
      calculateTicketSLADueTimes(
        highCreatedAt,
        "HIGH",
        holidayDates,
      );
  
    const mediumSLA =
      calculateTicketSLADueTimes(
        mediumCreatedAt,
        "MEDIUM",
        holidayDates,
      );
  
    const lowSLA =
      calculateTicketSLADueTimes(
        lowCreatedAt,
        "LOW",
        holidayDates,
      );
  
    const urgentTicket =
      await prisma.ticket.create({
        data: {
          title:
            SEED_TICKET_TITLES[0],
  
          description:
            "Customers cannot complete checkout in production. The payment step fails before confirmation.",
  
          priority: "URGENT",
          status: "OPEN",
  
          creatorId: reporter.id,
  
          createdAt:
            urgentCreatedAt,
  
          slaDeadline:
            urgentSLA.resolutionDueAt,
        },
      });
  
    const highFirstResponseAt =
      new Date(
        highCreatedAt.getTime() +
          45 * 60 * 1000,
      );
  
    const highTicket =
      await prisma.ticket.create({
        data: {
          title:
            SEED_TICKET_TITLES[1],
  
          description:
            "Order confirmation emails are reaching customers later than expected and support needs to investigate the queue.",
  
          priority: "HIGH",
          status: "IN_PROGRESS",
  
          creatorId: reporter.id,
  
          assignedAgentId:
            agent.id,
  
          firstResponseAt:
            highFirstResponseAt,
  
          createdAt:
            highCreatedAt,
  
          slaDeadline:
            highSLA.resolutionDueAt,
        },
      });
  
    await prisma.comment.create({
      data: {
        ticketId:
          highTicket.id,
  
        authorId:
          agent.id,
  
        content:
          "I am investigating the email delivery queue and will update this ticket once I confirm the bottleneck.",
  
        createdAt:
          highFirstResponseAt,
      },
    });
  
    const mediumReporterCommentAt =
      new Date(
        mediumCreatedAt.getTime() +
          20 * 60 * 1000,
      );
  
    const mediumFirstResponseAt =
      new Date(
        mediumCreatedAt.getTime() +
          60 * 60 * 1000,
      );
  
    const mediumResolvedAt =
      new Date(
        mediumCreatedAt.getTime() +
          4 * 60 * 60 * 1000,
      );
  
    const mediumTicket =
      await prisma.ticket.create({
        data: {
          title:
            SEED_TICKET_TITLES[2],
  
          description:
            "Some valid billing addresses are rejected during checkout even though the same addresses work for existing customers.",
  
          priority: "MEDIUM",
          status: "RESOLVED",
  
          creatorId: reporter.id,
  
          assignedAgentId:
            agent.id,
  
          firstResponseAt:
            mediumFirstResponseAt,
  
          resolvedAt:
            mediumResolvedAt,
  
          createdAt:
            mediumCreatedAt,
  
          slaDeadline:
            mediumSLA.resolutionDueAt,
        },
      });
  
    await prisma.comment.createMany({
      data: [
        {
          ticketId:
            mediumTicket.id,
  
          authorId:
            reporter.id,
  
          content:
            "The issue appears most often when the postal code contains a space.",
  
          createdAt:
            mediumReporterCommentAt,
        },
        {
          ticketId:
            mediumTicket.id,
  
          authorId:
            agent.id,
  
          content:
            "We identified the validation issue, deployed a fix, and verified the affected address format.",
  
          createdAt:
            mediumFirstResponseAt,
        },
      ],
    });
  
    const lowFirstResponseAt =
      new Date(
        lowCreatedAt.getTime() +
          2 * 60 * 60 * 1000,
      );
  
    const lowResolvedAt =
      new Date(
        lowCreatedAt.getTime() +
          5 * 60 * 60 * 1000,
      );
  
    const lowTicket =
      await prisma.ticket.create({
        data: {
          title:
            SEED_TICKET_TITLES[3],
  
          description:
            "A small spacing inconsistency is visible between two labels in the account settings page.",
  
          priority: "LOW",
          status: "CLOSED",
  
          creatorId: reporter.id,
  
          assignedAgentId:
            agent.id,
  
          firstResponseAt:
            lowFirstResponseAt,
  
          resolvedAt:
            lowResolvedAt,
  
          createdAt:
            lowCreatedAt,
  
          slaDeadline:
            lowSLA.resolutionDueAt,
        },
      });
  
    await prisma.comment.create({
      data: {
        ticketId:
          lowTicket.id,
  
        authorId:
          agent.id,
  
        content:
          "The spacing issue has been corrected and the ticket is now closed.",
  
        createdAt:
          lowFirstResponseAt,
      },
    });
  
    console.log(
      "Seed completed successfully.",
    );
  
    console.log(
      `Reporter: ${REPORTER_EMAIL} / ${DEMO_PASSWORD}`,
    );
  
    console.log(
      `Agent: ${AGENT_EMAIL} / ${DEMO_PASSWORD}`,
    );
  
    console.log(
      `Holiday: ${holiday.name} (${holiday.date
        .toISOString()
        .slice(0, 10)})`,
    );
  
    console.log(
      `Created demo tickets: ${[
        urgentTicket.id,
        highTicket.id,
        mediumTicket.id,
        lowTicket.id,
      ].length}`,
    );
  }
  
  try {
    await main();
  } catch (error: unknown) {
    console.error(
      "Seed failed:",
      error,
    );
  
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
  