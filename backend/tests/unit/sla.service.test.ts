import {
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    calculateSlaDeadline,
    getSlaState,
  } from "../../src/services/sla.service";
  
  describe(
    "calculateSlaDeadline",
    () => {
      test(
        "calculates SLA during normal business hours",
        () => {
          // Arrange
          const createdAt =
            new Date(
              "2026-08-24T10:00:00Z",
            );
  
          // Act
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "HIGH",
            );
  
          // Assert
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-24T14:00:00.000Z",
          );
        },
      );
  
      test(
        "moves after-hours creation to the next business morning",
        () => {
          const createdAt =
            new Date(
              "2026-08-24T18:00:00Z",
            );
  
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "URGENT",
            );
  
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-25T11:00:00.000Z",
          );
        },
      );
  
      test(
        "moves before-hours creation to business opening time",
        () => {
          const createdAt =
            new Date(
              "2026-08-24T07:00:00Z",
            );
  
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "HIGH",
            );
  
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-24T13:00:00.000Z",
          );
        },
      );
  
      test(
        "continues SLA on the next day when crossing 5 PM",
        () => {
          const createdAt =
            new Date(
              "2026-08-24T15:00:00Z",
            );
  
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "HIGH",
            );
  
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-25T11:00:00.000Z",
          );
        },
      );
  
      test(
        "skips Saturday and Sunday",
        () => {
          const createdAt =
            new Date(
              "2026-08-28T16:00:00Z",
            );
  
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "MEDIUM",
            );
  
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-31T16:00:00.000Z",
          );
        },
      );
  
      test(
        "handles a multi-day LOW priority SLA",
        () => {
          const createdAt =
            new Date(
              "2026-08-24T09:00:00Z",
            );
  
          const deadline =
            calculateSlaDeadline(
              createdAt,
              "LOW",
            );
  
          expect(
            deadline.toISOString(),
          ).toBe(
            "2026-08-25T17:00:00.000Z",
          );
        },
      );
    },
  );
  
  describe(
    "getSlaState",
    () => {
      test(
        "returns ON_TRACK when more than 25 percent of SLA remains",
        () => {
          const deadline =
            new Date(
              "2026-08-24T14:00:00Z",
            );
  
          const now =
            new Date(
              "2026-08-24T12:00:00Z",
            );
  
          const state =
            getSlaState(
              deadline,
              "HIGH",
              now,
            );
  
          expect(state).toBe(
            "ON_TRACK",
          );
        },
      );
  
      test(
        "returns AT_RISK when 25 percent or less of SLA remains",
        () => {
          const deadline =
            new Date(
              "2026-08-24T14:00:00Z",
            );
  
          const now =
            new Date(
              "2026-08-24T13:30:00Z",
            );
  
          const state =
            getSlaState(
              deadline,
              "HIGH",
              now,
            );
  
          expect(state).toBe(
            "AT_RISK",
          );
        },
      );
  
      test(
        "returns BREACHED when the deadline has been reached",
        () => {
          const deadline =
            new Date(
              "2026-08-24T14:00:00Z",
            );
  
          const now =
            new Date(
              "2026-08-24T14:00:00Z",
            );
  
          const state =
            getSlaState(
              deadline,
              "HIGH",
              now,
            );
  
          expect(state).toBe(
            "BREACHED",
          );
        },
      );
    },
  );