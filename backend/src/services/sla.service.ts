import { DateTime } from "luxon";

import type { TicketPriority } from "../generated/prisma/client";
import {
  BUSINESS_END_HOUR,
  BUSINESS_START_HOUR,
  BUSINESS_TIMEZONE,
} from "../config/business-time";

export type SLAState =
  | "ON_TRACK"
  | "AT_RISK"
  | "BREACHED";

export interface TicketSLAInfo {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;

  firstResponseState: SLAState;
  resolutionState: SLAState;

  firstResponseRemainingMinutes: number;
  resolutionRemainingMinutes: number;
}

interface SLAPolicy {
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

interface TicketSLAInput {
  createdAt: Date;
  priority: TicketPriority;

  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;

  holidays?: readonly Date[];
  now?: Date;
  timeZone?: string;
}

const SLA_POLICIES: Record<TicketPriority, SLAPolicy> = {
  URGENT: {
    firstResponseMinutes: 60,
    resolutionMinutes: 4 * 60,
  },

  HIGH: {
    firstResponseMinutes: 4 * 60,
    resolutionMinutes: 24 * 60,
  },

  MEDIUM: {
    firstResponseMinutes: 8 * 60,
    resolutionMinutes: 48 * 60,
  },

  LOW: {
    firstResponseMinutes: 24 * 60,
    resolutionMinutes: 72 * 60,
  },
};

function validateDate(date: Date, fieldName: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
}

function toBusinessDateTime(
  date: Date,
  timeZone: string,
): DateTime {
  validateDate(date, "Date");

  return DateTime
    .fromJSDate(date, { zone: "utc" })
    .setZone(timeZone);
}

function createHolidayKeys(
  holidays: readonly Date[],
): Set<string> {
  return new Set(
    holidays.map((holiday) => {
      validateDate(holiday, "Holiday date");

      /*
       * PostgreSQL DATE values represent calendar dates,
       * not instants in a business timezone.
       */
      return DateTime
        .fromJSDate(holiday, { zone: "utc" })
        .toFormat("yyyy-MM-dd");
    }),
  );
}

function getDateKey(dateTime: DateTime): string {
  return dateTime.toFormat("yyyy-MM-dd");
}

function isBusinessDay(
  dateTime: DateTime,
  holidayKeys: ReadonlySet<string>,
): boolean {
  const isWeekday =
    dateTime.weekday >= 1 &&
    dateTime.weekday <= 5;

  const isHoliday =
    holidayKeys.has(getDateKey(dateTime));

  return isWeekday && !isHoliday;
}

function getBusinessStart(
  dateTime: DateTime,
): DateTime {
  return dateTime
    .startOf("day")
    .set({
      hour: BUSINESS_START_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
}

function getBusinessEnd(
  dateTime: DateTime,
): DateTime {
  return dateTime
    .startOf("day")
    .set({
      hour: BUSINESS_END_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
}

function getNextBusinessDayStart(
  dateTime: DateTime,
  holidayKeys: ReadonlySet<string>,
): DateTime {
  let candidate = getBusinessStart(
    dateTime.plus({ days: 1 }),
  );

  while (!isBusinessDay(candidate, holidayKeys)) {
    candidate = getBusinessStart(
      candidate.plus({ days: 1 }),
    );
  }

  return candidate;
}

function normalizeToBusinessTime(
  dateTime: DateTime,
  holidayKeys: ReadonlySet<string>,
): DateTime {
  if (!isBusinessDay(dateTime, holidayKeys)) {
    return getNextBusinessDayStart(
      dateTime,
      holidayKeys,
    );
  }

  const businessStart =
    getBusinessStart(dateTime);

  const businessEnd =
    getBusinessEnd(dateTime);

  if (
    dateTime.toMillis() <
    businessStart.toMillis()
  ) {
    return businessStart;
  }

  if (
    dateTime.toMillis() >=
    businessEnd.toMillis()
  ) {
    return getNextBusinessDayStart(
      dateTime,
      holidayKeys,
    );
  }

  return dateTime;
}

export function addBusinessMinutes(
  start: Date,
  minutes: number,
  holidays: readonly Date[] = [],
  timeZone = BUSINESS_TIMEZONE,
): Date {
  if (
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    throw new Error(
      "Business minutes must be a non-negative number",
    );
  }

  const holidayKeys =
    createHolidayKeys(holidays);

  let current =
    normalizeToBusinessTime(
      toBusinessDateTime(start, timeZone),
      holidayKeys,
    );

  let remainingMinutes = minutes;

  while (remainingMinutes > 0) {
    const businessEnd =
      getBusinessEnd(current);

    const availableMinutes =
      businessEnd
        .diff(current, "minutes")
        .minutes;

    if (
      remainingMinutes <=
      availableMinutes
    ) {
      current = current.plus({
        minutes: remainingMinutes,
      });

      remainingMinutes = 0;
      break;
    }

    remainingMinutes -=
      availableMinutes;

    current =
      getNextBusinessDayStart(
        current,
        holidayKeys,
      );
  }

  return current
    .toUTC()
    .toJSDate();
}

export function getBusinessMinutesBetween(
  start: Date,
  end: Date,
  holidays: readonly Date[] = [],
  timeZone = BUSINESS_TIMEZONE,
): number {
  validateDate(start, "Start date");
  validateDate(end, "End date");

  if (end.getTime() <= start.getTime()) {
    return 0;
  }

  const holidayKeys =
    createHolidayKeys(holidays);

  let current =
    normalizeToBusinessTime(
      toBusinessDateTime(start, timeZone),
      holidayKeys,
    );

  const endDateTime =
    toBusinessDateTime(
      end,
      timeZone,
    );

  let totalMinutes = 0;

  while (
    current.toMillis() <
    endDateTime.toMillis()
  ) {
    const businessEnd =
      getBusinessEnd(current);

    const segmentEndMillis =
      Math.min(
        businessEnd.toMillis(),
        endDateTime.toMillis(),
      );

    if (
      segmentEndMillis >
      current.toMillis()
    ) {
      const segmentEnd =
        DateTime.fromMillis(
          segmentEndMillis,
          { zone: timeZone },
        );

      totalMinutes +=
        segmentEnd
          .diff(current, "minutes")
          .minutes;
    }

    if (
      endDateTime.toMillis() <=
      businessEnd.toMillis()
    ) {
      break;
    }

    current =
      getNextBusinessDayStart(
        current,
        holidayKeys,
      );
  }

  return totalMinutes;
}

export function calculateTicketSLADueTimes(
  createdAt: Date,
  priority: TicketPriority,
  holidays: readonly Date[] = [],
  timeZone = BUSINESS_TIMEZONE,
): {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
} {
  const policy =
    SLA_POLICIES[priority];

  return {
    firstResponseDueAt:
      addBusinessMinutes(
        createdAt,
        policy.firstResponseMinutes,
        holidays,
        timeZone,
      ),

    resolutionDueAt:
      addBusinessMinutes(
        createdAt,
        policy.resolutionMinutes,
        holidays,
        timeZone,
      ),
  };
}

function calculateClockState(
  createdAt: Date,
  dueAt: Date,
  completedAt: Date | null | undefined,
  budgetMinutes: number,
  holidays: readonly Date[],
  now: Date,
  timeZone: string,
): SLAState {
  const evaluationTime =
    completedAt ?? now;

  /*
   * We document the exact due timestamp as still on time.
   * BREACHED starts once the deadline has passed.
   */
  if (
    evaluationTime.getTime() >
    dueAt.getTime()
  ) {
    return "BREACHED";
  }

  const consumedMinutes =
    getBusinessMinutesBetween(
      createdAt,
      evaluationTime,
      holidays,
      timeZone,
    );

  const consumedRatio =
    consumedMinutes /
    budgetMinutes;

  /*
   * Requirement:
   *
   * ON_TRACK = 0% through 75%
   * AT_RISK  = strictly greater than 75%
   */
  if (consumedRatio > 0.75) {
    return "AT_RISK";
  }

  return "ON_TRACK";
}

function calculateRemainingMinutes(
  now: Date,
  dueAt: Date,
  completedAt: Date | null | undefined,
  holidays: readonly Date[],
  timeZone: string,
): number {
  /*
   * Completed clocks have no remaining active SLA time.
   */
  if (completedAt) {
    return 0;
  }

  if (
    now.getTime() >
    dueAt.getTime()
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(
      getBusinessMinutesBetween(
        now,
        dueAt,
        holidays,
        timeZone,
      ),
    ),
  );
}

export function getTicketSLAInfo(
  input: TicketSLAInput,
): TicketSLAInfo {
  const {
    createdAt,
    priority,
    firstResponseAt = null,
    resolvedAt = null,
    holidays = [],
    now = new Date(),
    timeZone = BUSINESS_TIMEZONE,
  } = input;

  const policy =
    SLA_POLICIES[priority];

  const {
    firstResponseDueAt,
    resolutionDueAt,
  } =
    calculateTicketSLADueTimes(
      createdAt,
      priority,
      holidays,
      timeZone,
    );

  const firstResponseState =
    calculateClockState(
      createdAt,
      firstResponseDueAt,
      firstResponseAt,
      policy.firstResponseMinutes,
      holidays,
      now,
      timeZone,
    );

  const resolutionState =
    calculateClockState(
      createdAt,
      resolutionDueAt,
      resolvedAt,
      policy.resolutionMinutes,
      holidays,
      now,
      timeZone,
    );

  return {
    firstResponseDueAt,
    resolutionDueAt,

    firstResponseState,
    resolutionState,

    firstResponseRemainingMinutes:
      calculateRemainingMinutes(
        now,
        firstResponseDueAt,
        firstResponseAt,
        holidays,
        timeZone,
      ),

    resolutionRemainingMinutes:
      calculateRemainingMinutes(
        now,
        resolutionDueAt,
        resolvedAt,
        holidays,
        timeZone,
      ),
  };
}

/*
 * Temporary compatibility helpers.
 *
 * The existing ticket service still expects the old
 * single-SLA interface. Correction Stage 3 will remove
 * these once GraphQL and ticket mapping use TicketSLAInfo.
 */

export function calculateSlaDeadline(
  createdAt: Date,
  priority: TicketPriority,
  holidays: readonly Date[] = [],
): Date {
  return calculateTicketSLADueTimes(
    createdAt,
    priority,
    holidays,
  ).resolutionDueAt;
}

export function getSlaState(
  deadline: Date,
  priority: TicketPriority,
  now = new Date(),
  holidays: readonly Date[] = [],
): SLAState {
  if (
    now.getTime() >
    deadline.getTime()
  ) {
    return "BREACHED";
  }

  const remainingMinutes =
    getBusinessMinutesBetween(
      now,
      deadline,
      holidays,
    );

  const totalMinutes =
    SLA_POLICIES[
      priority
    ].resolutionMinutes;

  const remainingRatio =
    remainingMinutes /
    totalMinutes;

  if (remainingRatio < 0.25) {
    return "AT_RISK";
  }

  return "ON_TRACK";
}