import type {
    SlaState,
    TicketPriority,
    TicketStatus,
  } from "../types";
  
  import {
    formatEnum,
  } from "../utils/format";
  
  export function StatusBadge({
    status,
  }: {
    status: TicketStatus;
  }) {
    return (
      <span
        className={`badge badge--status-${status
          .toLowerCase()
          .replace("_", "-")}`}
      >
        {formatEnum(status)}
      </span>
    );
  }
  
  export function PriorityBadge({
    priority,
  }: {
    priority: TicketPriority;
  }) {
    return (
      <span
        className={`badge badge--priority-${priority.toLowerCase()}`}
      >
        {formatEnum(priority)}
      </span>
    );
  }
  
  export function SlaBadge({
    state,
  }: {
    state: SlaState;
  }) {
    return (
      <span
        className={`badge badge--sla-${state
          .toLowerCase()
          .replace("_", "-")}`}
      >
        <span
          className="badge__dot"
          aria-hidden="true"
        />
  
        {formatEnum(state)}
      </span>
    );
  }