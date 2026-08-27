import {
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    calculateTicketSLADueTimes,
    getTicketSLAInfo,
  } from "../../src/services/sla.service";
  
  const INDIA_TIME_ZONE =
    "Asia/Kolkata";
  
  function date(
    iso: string,
  ): Date {
    return new Date(iso);
  }
  
  describe(
    "SLA business-hours engine",
    () => {
      test(
        "calculates normal weekday first-response and resolution deadlines",
        () => {
          // Arrange
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // Monday 10:00 IST
  
          // Act
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "HIGH",
              [],
              INDIA_TIME_ZONE,
            );
  
          // Assert
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-24T08:30:00.000Z",
          );
          // Monday 14:00 IST
  
          expect(
            result
              .resolutionDueAt
              .toISOString(),
          ).toBe(
            "2026-08-26T10:30:00.000Z",
          );
          // Wednesday 16:00 IST
        },
      );
  
      test(
        "starts counting at 09:00 when created before business hours",
        () => {
          const createdAt =
            date(
              "2026-08-24T01:30:00.000Z",
            );
          // Monday 07:00 IST
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "URGENT",
              [],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-24T04:30:00.000Z",
          );
          // Monday 10:00 IST
  
          expect(
            result
              .resolutionDueAt
              .toISOString(),
          ).toBe(
            "2026-08-24T07:30:00.000Z",
          );
          // Monday 13:00 IST
        },
      );
  
      test(
        "starts counting next day when created after business hours",
        () => {
          const createdAt =
            date(
              "2026-08-24T14:30:00.000Z",
            );
          // Monday 20:00 IST
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "URGENT",
              [],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-25T04:30:00.000Z",
          );
          // Tuesday 10:00 IST
  
          expect(
            result
              .resolutionDueAt
              .toISOString(),
          ).toBe(
            "2026-08-25T07:30:00.000Z",
          );
          // Tuesday 13:00 IST
        },
      );
  
      test(
        "starts weekend tickets on the next business day",
        () => {
          const createdAt =
            date(
              "2026-08-29T06:30:00.000Z",
            );
          // Saturday 12:00 IST
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "HIGH",
              [],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-31T07:30:00.000Z",
          );
          // Monday 13:00 IST
        },
      );
  
      test(
        "uses only one minute on Friday at 17:59 before the weekend",
        () => {
          const createdAt =
            date(
              "2026-08-28T12:29:00.000Z",
            );
          // Friday 17:59 IST
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "URGENT",
              [],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-31T04:29:00.000Z",
          );
          // Monday 09:59 IST
        },
      );
  
      test(
        "skips a configured public holiday",
        () => {
          const createdAt =
            date(
              "2026-08-28T11:30:00.000Z",
            );
          // Friday 17:00 IST
  
          const mondayHoliday =
            date(
              "2026-08-31T00:00:00.000Z",
            );
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "HIGH",
              [mondayHoliday],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-09-01T06:30:00.000Z",
          );
          // Tuesday 12:00 IST
        },
      );
  
      test(
        "handles weekend followed by a holiday",
        () => {
          const createdAt =
            date(
              "2026-08-29T06:30:00.000Z",
            );
          // Saturday
  
          const mondayHoliday =
            date(
              "2026-08-31T00:00:00.000Z",
            );
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "URGENT",
              [mondayHoliday],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-09-01T04:30:00.000Z",
          );
          // Tuesday 10:00 IST
        },
      );
  
      test(
        "supports SLA durations crossing multiple business days",
        () => {
          const createdAt =
            date(
              "2026-08-24T09:30:00.000Z",
            );
          // Monday 15:00 IST
  
          const result =
            calculateTicketSLADueTimes(
              createdAt,
              "MEDIUM",
              [],
              INDIA_TIME_ZONE,
            );
  
          expect(
            result
              .firstResponseDueAt
              .toISOString(),
          ).toBe(
            "2026-08-25T08:30:00.000Z",
          );
          // Tuesday 14:00 IST
  
          expect(
            result
              .resolutionDueAt
              .toISOString(),
          ).toBe(
            "2026-08-31T12:30:00.000Z",
          );
          // Monday 18:00 IST
        },
      );
    },
  );
  
  describe(
    "SLA states and clock freezing",
    () => {
      test(
        "is ON_TRACK at exactly 75 percent consumed",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // 10:00 IST
  
          const now =
            date(
              "2026-08-24T07:30:00.000Z",
            );
          // 13:00 IST
          // HIGH response budget = 4h
          // exactly 3h consumed = 75%
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "HIGH",
              now,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.firstResponseState,
          ).toBe("ON_TRACK");
  
          expect(
            result
              .firstResponseRemainingMinutes,
          ).toBe(60);
        },
      );
  
      test(
        "becomes AT_RISK once more than 75 percent is consumed",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // 10:00 IST
  
          const now =
            date(
              "2026-08-24T07:31:00.000Z",
            );
          // 13:01 IST
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "HIGH",
              now,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.firstResponseState,
          ).toBe("AT_RISK");
        },
      );
  
      test(
        "marks active first-response SLA as BREACHED after deadline",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // 10:00 IST
  
          const now =
            date(
              "2026-08-24T05:31:00.000Z",
            );
          // 11:01 IST
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "URGENT",
              now,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.firstResponseState,
          ).toBe("BREACHED");
  
          expect(
            result
              .firstResponseRemainingMinutes,
          ).toBe(0);
        },
      );
  
      test(
        "freezes first-response SLA at the first response time",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // Monday 10:00 IST
  
          const firstResponseAt =
            date(
              "2026-08-24T05:00:00.000Z",
            );
          // Monday 10:30 IST
  
          const muchLater =
            date(
              "2026-08-27T06:30:00.000Z",
            );
          // Thursday 12:00 IST
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "URGENT",
              firstResponseAt,
              now: muchLater,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.firstResponseState,
          ).toBe("ON_TRACK");
  
          expect(
            result
              .firstResponseRemainingMinutes,
          ).toBe(0);
        },
      );
  
      test(
        "freezes an AT_RISK resolution SLA after resolution",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // 10:00 IST
  
          const resolvedAt =
            date(
              "2026-08-24T08:00:00.000Z",
            );
          // 13:30 IST
          // URGENT resolution SLA = 4h
          // 3.5h consumed = 87.5%
  
          const muchLater =
            date(
              "2026-08-27T06:30:00.000Z",
            );
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "URGENT",
              resolvedAt,
              now: muchLater,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.resolutionState,
          ).toBe("AT_RISK");
  
          expect(
            result
              .resolutionRemainingMinutes,
          ).toBe(0);
        },
      );
  
      test(
        "keeps a late completed SLA BREACHED",
        () => {
          const createdAt =
            date(
              "2026-08-24T04:30:00.000Z",
            );
          // 10:00 IST
  
          const firstResponseAt =
            date(
              "2026-08-24T05:35:00.000Z",
            );
          // 11:05 IST
          // URGENT response was due 11:00
  
          const muchLater =
            date(
              "2026-08-27T06:30:00.000Z",
            );
  
          const result =
            getTicketSLAInfo({
              createdAt,
              priority: "URGENT",
              firstResponseAt,
              now: muchLater,
              timeZone:
                INDIA_TIME_ZONE,
            });
  
          expect(
            result.firstResponseState,
          ).toBe("BREACHED");
  
          expect(
            result
              .firstResponseRemainingMinutes,
          ).toBe(0);
        },
      );
    },
  );