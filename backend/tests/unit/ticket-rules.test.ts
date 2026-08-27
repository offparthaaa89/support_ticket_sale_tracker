import {
    describe,
    expect,
    test,
  } from "bun:test";
  
  import {
    canTransitionTicketStatus,
  } from "../../src/services/ticket-rules";
  
  describe(
    "ticket status lifecycle",
    () => {
      test(
        "allows OPEN to IN_PROGRESS",
        () => {
          expect(
            canTransitionTicketStatus(
              "OPEN",
              "IN_PROGRESS",
            ),
          ).toBe(true);
        },
      );
  
      test(
        "allows IN_PROGRESS to RESOLVED",
        () => {
          expect(
            canTransitionTicketStatus(
              "IN_PROGRESS",
              "RESOLVED",
            ),
          ).toBe(true);
        },
      );
  
      test(
        "allows RESOLVED to CLOSED",
        () => {
          expect(
            canTransitionTicketStatus(
              "RESOLVED",
              "CLOSED",
            ),
          ).toBe(true);
        },
      );
  
      test(
        "rejects OPEN directly to RESOLVED",
        () => {
          expect(
            canTransitionTicketStatus(
              "OPEN",
              "RESOLVED",
            ),
          ).toBe(false);
        },
      );
  
      test(
        "rejects OPEN directly to CLOSED",
        () => {
          expect(
            canTransitionTicketStatus(
              "OPEN",
              "CLOSED",
            ),
          ).toBe(false);
        },
      );
  
      test(
        "rejects IN_PROGRESS directly to CLOSED",
        () => {
          expect(
            canTransitionTicketStatus(
              "IN_PROGRESS",
              "CLOSED",
            ),
          ).toBe(false);
        },
      );
  
      test(
        "rejects RESOLVED back to IN_PROGRESS",
        () => {
          expect(
            canTransitionTicketStatus(
              "RESOLVED",
              "IN_PROGRESS",
            ),
          ).toBe(false);
        },
      );
  
      test(
        "rejects CLOSED to IN_PROGRESS",
        () => {
          expect(
            canTransitionTicketStatus(
              "CLOSED",
              "IN_PROGRESS",
            ),
          ).toBe(false);
        },
      );
  
      test(
        "rejects transition to the same status",
        () => {
          expect(
            canTransitionTicketStatus(
              "OPEN",
              "OPEN",
            ),
          ).toBe(false);
        },
      );
    },
  );