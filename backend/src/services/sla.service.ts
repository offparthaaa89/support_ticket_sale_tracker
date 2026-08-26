import type { TicketPriority } from "../generated/prisma/client";

export type SlaState =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED";

const BUSINESS_START_HOUR_UTC = 9;
const BUSINESS_END_HOUR_UTC = 17;

const MILLISECONDS_PER_HOUR =
  60 * 60 * 1000;

const AT_RISK_FRACTION = 0.25;

export const SLA_DURATION_HOURS: Record<
  TicketPriority,
  number
> = {
  URGENT: 2,
  HIGH: 4,
  MEDIUM: 8,
  LOW: 16,
};

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();

  return day === 0 || day === 6;
}

function getBusinessDayStart(date: Date): Date {
  const result = new Date(date);

  result.setUTCHours(
    BUSINESS_START_HOUR_UTC,
    0,
    0,
    0,
  );

  return result;
}

function getBusinessDayEnd(date: Date): Date {
  const result = new Date(date);

  result.setUTCHours(
    BUSINESS_END_HOUR_UTC,
    0,
    0,
    0,
  );

  return result;
}

function getNextBusinessDayStart(
  date: Date,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + 1,
  );

  result.setUTCHours(
    BUSINESS_START_HOUR_UTC,
    0,
    0,
    0,
  );

  while (isWeekend(result)) {
    result.setUTCDate(
      result.getUTCDate() + 1,
    );
  }

  return result;
}

function normalizeToBusinessTime(
  date: Date,
): Date {
  const result = new Date(date);

  if (isWeekend(result)) {
    result.setUTCHours(
      BUSINESS_START_HOUR_UTC,
      0,
      0,
      0,
    );

    while (isWeekend(result)) {
      result.setUTCDate(
        result.getUTCDate() + 1,
      );
    }

    return result;
  }

  const businessStart =
    getBusinessDayStart(result);

  const businessEnd =
    getBusinessDayEnd(result);

  if (
    result.getTime() <
    businessStart.getTime()
  ) {
    return businessStart;
  }

  if (
    result.getTime() >=
    businessEnd.getTime()
  ) {
    return getNextBusinessDayStart(result);
  }

  return result;
}

function calculateBusinessMillisecondsBetween(
  start: Date,
  end: Date,
): number {
  if (end.getTime() <= start.getTime()) {
    return 0;
  }

  let cursor =
    normalizeToBusinessTime(start);

  let totalMilliseconds = 0;

  while (
    cursor.getTime() < end.getTime()
  ) {
    const businessEnd =
      getBusinessDayEnd(cursor);

    const segmentEnd =
      end.getTime() < businessEnd.getTime()
        ? end
        : businessEnd;

    if (
      segmentEnd.getTime() >
      cursor.getTime()
    ) {
      totalMilliseconds +=
        segmentEnd.getTime() -
        cursor.getTime();
    }

    if (
      segmentEnd.getTime() >=
      end.getTime()
    ) {
      break;
    }

    cursor =
      getNextBusinessDayStart(cursor);
  }

  return totalMilliseconds;
}

export function calculateSlaDeadline(
  createdAt: Date,
  priority: TicketPriority,
): Date {
  let cursor =
    normalizeToBusinessTime(createdAt);

  let remainingMilliseconds =
    SLA_DURATION_HOURS[priority] *
    MILLISECONDS_PER_HOUR;

  while (remainingMilliseconds > 0) {
    const businessEnd =
      getBusinessDayEnd(cursor);

    const availableMilliseconds =
      businessEnd.getTime() -
      cursor.getTime();

    if (
      remainingMilliseconds <=
      availableMilliseconds
    ) {
      return new Date(
        cursor.getTime() +
          remainingMilliseconds,
      );
    }

    remainingMilliseconds -=
      availableMilliseconds;

    cursor =
      getNextBusinessDayStart(cursor);
  }

  return cursor;
}

export function getSlaState(
  slaDeadline: Date,
  priority: TicketPriority,
  now: Date = new Date(),
): SlaState {
  if (
    now.getTime() >=
    slaDeadline.getTime()
  ) {
    return "BREACHED";
  }

  const remainingBusinessMilliseconds =
    calculateBusinessMillisecondsBetween(
      now,
      slaDeadline,
    );

  const totalSlaMilliseconds =
    SLA_DURATION_HOURS[priority] *
    MILLISECONDS_PER_HOUR;

  const atRiskThreshold =
    totalSlaMilliseconds *
    AT_RISK_FRACTION;

  if (
    remainingBusinessMilliseconds <=
    atRiskThreshold
  ) {
    return "AT_RISK";
  }

  return "ON_TRACK";
}