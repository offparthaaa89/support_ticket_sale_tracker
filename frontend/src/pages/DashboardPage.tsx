import {
    useCallback,
    useEffect,
    useState,
  } from "react";
  
  import {
    Link,
  } from "react-router-dom";
  
  import {
    GraphQLRequestError,
    graphqlRequest,
  } from "../api/graphql";
  
  import {
    TICKETS_QUERY,
  } from "../api/operations";
  
  import {
    PriorityBadge,
    SlaBadge,
    StatusBadge,
  } from "../components/Badges";
  
  import type {
    AppUser,
    TicketPage,
    TicketPriority,
    TicketStatus,
  } from "../types";
  
  import {
    formatDateTime,
  } from "../utils/format";
  
  interface TicketsResponse {
    tickets: TicketPage;
  }
  
  interface TicketsVariables {
    filter: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedAgentId?: string;
    };
  
    page: number;
    limit: number;
  }
  
  interface DashboardPageProps {
    accessToken: string;
    user: AppUser;
    onSessionExpired: () => void;
  }
  
  const PAGE_SIZE = 6;
  
  export default function DashboardPage({
    accessToken,
    user,
    onSessionExpired,
  }: DashboardPageProps) {
    const [
      statusFilter,
      setStatusFilter,
    ] = useState<TicketStatus | "">(
      "",
    );
  
    const [
      priorityFilter,
      setPriorityFilter,
    ] = useState<
      TicketPriority | ""
    >("");
  
    const [
      assignmentFilter,
      setAssignmentFilter,
    ] = useState<"ALL" | "MINE">(
      "ALL",
    );
  
    const [page, setPage] =
      useState(1);
  
    const [data, setData] =
      useState<TicketPage | null>(
        null,
      );
  
    const [loading, setLoading] =
      useState(true);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const loadTickets =
      useCallback(async () => {
        setLoading(true);
        setError(null);
  
        const filter: TicketsVariables["filter"] =
          {};
  
        if (statusFilter) {
          filter.status =
            statusFilter;
        }
  
        if (priorityFilter) {
          filter.priority =
            priorityFilter;
        }
  
        if (
          user.role === "AGENT" &&
          assignmentFilter === "MINE"
        ) {
          filter.assignedAgentId =
            user.id;
        }
  
        try {
          const response =
            await graphqlRequest<
              TicketsResponse,
              TicketsVariables
            >(
              TICKETS_QUERY,
              {
                filter,
                page,
                limit: PAGE_SIZE,
              },
              accessToken,
            );
  
          setData(response.tickets);
        } catch (caughtError: unknown) {
          if (
            caughtError instanceof
              GraphQLRequestError &&
            caughtError.code ===
              "UNAUTHENTICATED"
          ) {
            onSessionExpired();
            return;
          }
  
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load tickets",
          );
        } finally {
          setLoading(false);
        }
      }, [
        accessToken,
        assignmentFilter,
        onSessionExpired,
        page,
        priorityFilter,
        statusFilter,
        user.id,
        user.role,
      ]);
  
    useEffect(() => {
      void loadTickets();
    }, [loadTickets]);
  
    function resetToFirstPage() {
      setPage(1);
    }
  
    const hasFilters =
      Boolean(statusFilter) ||
      Boolean(priorityFilter) ||
      (user.role === "AGENT" &&
        assignmentFilter !== "ALL");
  
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {user.role === "AGENT"
                ? "Support operations"
                : "Your support workspace"}
            </p>
  
            <h1>
              {user.role === "AGENT"
                ? "Support queue"
                : "Your tickets"}
            </h1>
  
            <p className="page-description">
              {user.role === "AGENT"
                ? "Scan SLA health, ownership and status without digging through unnecessary detail."
                : "Track every issue, response and deadline from one place."}
            </p>
          </div>
  
          {user.role === "USER" && (
            <Link
              to="/tickets/new"
              className="primary-button"
            >
              + Create ticket
            </Link>
          )}
        </div>
  
        <div className="filter-panel">
          <div className="filter-panel__intro">
            <strong>
              Find tickets
            </strong>
  
            <span>
              {data
                ? `${data.total} result${
                    data.total === 1
                      ? ""
                      : "s"
                  }`
                : "Loading results"}
            </span>
          </div>
  
          <div className="filter-controls">
            <label>
              <span>
                Status
              </span>
  
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target
                      .value as
                      | TicketStatus
                      | "",
                  );
  
                  resetToFirstPage();
                }}
              >
                <option value="">
                  All statuses
                </option>
  
                <option value="OPEN">
                  Open
                </option>
  
                <option value="IN_PROGRESS">
                  In progress
                </option>
  
                <option value="RESOLVED">
                  Resolved
                </option>
  
                <option value="CLOSED">
                  Closed
                </option>
              </select>
            </label>
  
            <label>
              <span>
                Priority
              </span>
  
              <select
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(
                    event.target
                      .value as
                      | TicketPriority
                      | "",
                  );
  
                  resetToFirstPage();
                }}
              >
                <option value="">
                  All priorities
                </option>
  
                <option value="URGENT">
                  Urgent
                </option>
  
                <option value="HIGH">
                  High
                </option>
  
                <option value="MEDIUM">
                  Medium
                </option>
  
                <option value="LOW">
                  Low
                </option>
              </select>
            </label>
  
            {user.role === "AGENT" && (
              <label>
                <span>
                  Assignment
                </span>
  
                <select
                  value={
                    assignmentFilter
                  }
                  onChange={(event) => {
                    setAssignmentFilter(
                      event.target
                        .value as
                        | "ALL"
                        | "MINE",
                    );
  
                    resetToFirstPage();
                  }}
                >
                  <option value="ALL">
                    All tickets
                  </option>
  
                  <option value="MINE">
                    Assigned to me
                  </option>
                </select>
              </label>
            )}
  
            {hasFilters && (
              <button
                type="button"
                className="clear-filter-button"
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setAssignmentFilter(
                    "ALL",
                  );
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
  
        {error && (
          <div
            className="alert alert--error"
            role="alert"
          >
            <span>
              {error}
            </span>
  
            <button
              type="button"
              onClick={() => {
                void loadTickets();
              }}
            >
              Try again
            </button>
          </div>
        )}
  
        {loading && !data && (
          <div className="ticket-grid">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                className="ticket-card ticket-card--skeleton"
                key={index}
              >
                <div className="skeleton skeleton--short" />
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--medium" />
              </div>
            ))}
          </div>
        )}
  
        {data && (
          <>
            {data.items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  ✓
                </div>
  
                <h2>
                  No tickets found
                </h2>
  
                <p>
                  {hasFilters
                    ? "Nothing matches your current filters. Try widening the search."
                    : user.role ===
                        "USER"
                      ? "You don't have any support tickets yet."
                      : "There are no tickets in the queue."}
                </p>
  
                {user.role ===
                  "USER" &&
                  !hasFilters && (
                    <Link
                      to="/tickets/new"
                      className="primary-button"
                    >
                      Create your first
                      ticket
                    </Link>
                  )}
              </div>
            ) : (
              <div
                className={`ticket-grid ${
                  loading
                    ? "ticket-grid--refreshing"
                    : ""
                }`}
                aria-busy={loading}
              >
                {data.items.map(
                  (ticket) => (
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className={`ticket-card ticket-card--sla-${ticket.slaState
                        .toLowerCase()
                        .replace(
                          "_",
                          "-",
                        )}`}
                      key={ticket.id}
                    >
                      <div className="ticket-card__top">
                        <div className="ticket-badges">
                          <PriorityBadge
                            priority={
                              ticket.priority
                            }
                          />
  
                          <StatusBadge
                            status={
                              ticket.status
                            }
                          />
                        </div>
  
                        <SlaBadge
                          state={
                            ticket.slaState
                          }
                        />
                      </div>
  
                      <div className="ticket-card__body">
                        <h2>
                          {ticket.title}
                        </h2>
  
                        <div className="ticket-meta">
                          <div>
                            <span>
                              Assigned
                            </span>
  
                            <strong>
                              {ticket
                                .assignedAgent
                                ?.name ??
                                "Unassigned"}
                            </strong>
                          </div>
  
                          <div>
                            <span>
                              SLA deadline
                            </span>
  
                            <strong>
                              {formatDateTime(
                                ticket.slaDeadline,
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
  
                      <div className="ticket-card__footer">
                        <span>
                          Created{" "}
                          {formatDateTime(
                            ticket.createdAt,
                          )}
                        </span>
  
                        <strong>
                          Open ticket →
                        </strong>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
  
            {data.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    data.page <= 1 ||
                    loading
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                    )
                  }
                >
                  ← Previous
                </button>
  
                <span>
                  Page{" "}
                  <strong>
                    {data.page}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {data.totalPages}
                  </strong>
                </span>
  
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    data.page >=
                      data.totalPages ||
                    loading
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1,
                    )
                  }
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  }