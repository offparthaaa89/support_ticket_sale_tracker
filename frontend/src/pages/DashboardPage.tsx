import {
    useCallback,
    useEffect,
    useMemo,
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
    AGENTS_QUERY,
    DASHBOARD_QUERY,
    TICKETS_QUERY,
  } from "../api/operations";
  
  import {
    PriorityBadge,
    SlaBadge,
    StatusBadge,
  } from "../components/Badges";
  
  import type {
    AppUser,
    SlaState,
    TicketConnection,
    TicketDashboard,
    TicketFilter,
    TicketListItem,
    TicketPriority,
    TicketStatus,
  } from "../types";
  
  import {
    formatDateTime,
  } from "../utils/format";
  
  interface TicketsResponse {
    tickets: TicketConnection;
  }
  
  interface TicketsVariables {
    filter: TicketFilter;
    take: number;
    cursor: string | null;
  }
  
  interface DashboardResponse {
    dashboard: TicketDashboard;
  }
  
  interface AgentsResponse {
    users: AppUser[];
  }
  
  interface DashboardPageProps {
    accessToken: string;
    user: AppUser;
    onSessionExpired: () => void;
  }
  
  type SortOption =
    | "NEWEST"
    | "OLDEST"
    | "PRIORITY"
    | "SLA";
  
  const PAGE_SIZE = 6;
  
  const priorityRank:
    Record<TicketPriority, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
  
  const slaRank:
    Record<SlaState, number> = {
      BREACHED: 3,
      AT_RISK: 2,
      ON_TRACK: 1,
    };
  
  function formatRemainingMinutes(
    minutes: number,
  ): string {
    if (minutes <= 0) {
      return "No active time remaining";
    }
  
    const hours =
      Math.floor(minutes / 60);
  
    const remainingMinutes =
      minutes % 60;
  
    if (hours === 0) {
      return `${remainingMinutes}m remaining`;
    }
  
    if (remainingMinutes === 0) {
      return `${hours}h remaining`;
    }
  
    return `${hours}h ${remainingMinutes}m remaining`;
  }
  
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
      slaFilter,
      setSlaFilter,
    ] = useState<SlaState | "">(
      "",
    );
  
    const [
      assignmentFilter,
      setAssignmentFilter,
    ] = useState("ALL");
  
    const [
      sortOption,
      setSortOption,
    ] = useState<SortOption>(
      "NEWEST",
    );
  
    const [
      cursorStack,
      setCursorStack,
    ] = useState<
      Array<string | null>
    >([null]);
  
    const [data, setData] =
      useState<TicketConnection | null>(
        null,
      );
  
    const [
      dashboard,
      setDashboard,
    ] = useState<TicketDashboard | null>(
      null,
    );
  
    const [agents, setAgents] =
      useState<AppUser[]>([]);
  
    const [loading, setLoading] =
      useState(true);
  
    const [
      dashboardLoading,
      setDashboardLoading,
    ] = useState(true);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const currentCursor =
      cursorStack[
        cursorStack.length - 1
      ] ?? null;
  
    const handleApiError =
      useCallback(
        (caughtError: unknown) => {
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
              : "Unable to load support data",
          );
        },
        [onSessionExpired],
      );
  
    const loadDashboard =
      useCallback(async () => {
        setDashboardLoading(true);
  
        try {
          const response =
            await graphqlRequest<
              DashboardResponse
            >(
              DASHBOARD_QUERY,
              undefined,
              accessToken,
            );
  
          setDashboard(
            response.dashboard,
          );
        } catch (
          caughtError: unknown
        ) {
          handleApiError(
            caughtError,
          );
        } finally {
          setDashboardLoading(false);
        }
      }, [
        accessToken,
        handleApiError,
      ]);
  
    const loadAgents =
      useCallback(async () => {
        if (user.role !== "AGENT") {
          setAgents([]);
          return;
        }
  
        try {
          const response =
            await graphqlRequest<
              AgentsResponse
            >(
              AGENTS_QUERY,
              undefined,
              accessToken,
            );
  
          setAgents(response.users);
        } catch (
          caughtError: unknown
        ) {
          handleApiError(
            caughtError,
          );
        }
      }, [
        accessToken,
        handleApiError,
        user.role,
      ]);
  
    const loadTickets =
      useCallback(async () => {
        setLoading(true);
        setError(null);
  
        const filter:
          TicketFilter = {};
  
        if (statusFilter) {
          filter.status =
            statusFilter;
        }
  
        if (priorityFilter) {
          filter.priority =
            priorityFilter;
        }
  
        if (slaFilter) {
          filter.slaState =
            slaFilter;
        }
  
        if (
          user.role === "AGENT" &&
          assignmentFilter !== "ALL"
        ) {
          filter.assignedAgentId =
            assignmentFilter === "MINE"
              ? user.id
              : assignmentFilter;
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
                take: PAGE_SIZE,
                cursor:
                  currentCursor,
              },
              accessToken,
            );
  
          setData(response.tickets);
        } catch (
          caughtError: unknown
        ) {
          handleApiError(
            caughtError,
          );
        } finally {
          setLoading(false);
        }
      }, [
        accessToken,
        assignmentFilter,
        currentCursor,
        handleApiError,
        priorityFilter,
        slaFilter,
        statusFilter,
        user.id,
        user.role,
      ]);
  
    useEffect(() => {
      void loadDashboard();
    }, [loadDashboard]);
  
    useEffect(() => {
      void loadAgents();
    }, [loadAgents]);
  
    useEffect(() => {
      void loadTickets();
    }, [loadTickets]);
  
    function resetPagination() {
      setCursorStack([null]);
    }
  
    const sortedTickets =
      useMemo(() => {
        if (!data) {
          return [];
        }
  
        const items:
          TicketListItem[] = [
            ...data.nodes,
          ];
  
        items.sort(
          (left, right) => {
            switch (sortOption) {
              case "OLDEST":
                return (
                  new Date(
                    left.createdAt,
                  ).getTime() -
                  new Date(
                    right.createdAt,
                  ).getTime()
                );
  
              case "PRIORITY":
                return (
                  priorityRank[
                    right.priority
                  ] -
                  priorityRank[
                    left.priority
                  ]
                );
  
              case "SLA":
                return (
                  slaRank[
                    right.sla
                      .overallState
                  ] -
                  slaRank[
                    left.sla
                      .overallState
                  ]
                );
  
              case "NEWEST":
                return (
                  new Date(
                    right.createdAt,
                  ).getTime() -
                  new Date(
                    left.createdAt,
                  ).getTime()
                );
            }
          },
        );
  
        return items;
      }, [
        data,
        sortOption,
      ]);
  
    const hasFilters =
      Boolean(statusFilter) ||
      Boolean(priorityFilter) ||
      Boolean(slaFilter) ||
      (user.role === "AGENT" &&
        assignmentFilter !== "ALL");
  
    const pageNumber =
      cursorStack.length;
  
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
                ? "Monitor ownership, SLA health and ticket progress from one queue."
                : "Track every issue, response and SLA from one place."}
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
  
        <div className="dashboard-stats">
          <article className="content-card">
            <span className="eyebrow">
              Open
            </span>
            <h2>
              {dashboardLoading
                ? "…"
                : dashboard
                  ?.openTickets ?? 0}
            </h2>
            <p className="muted">
              Awaiting progress
            </p>
          </article>
  
          <article className="content-card">
            <span className="eyebrow">
              In progress
            </span>
            <h2>
              {dashboardLoading
                ? "…"
                : dashboard
                  ?.inProgressTickets ??
                  0}
            </h2>
            <p className="muted">
              Being worked
            </p>
          </article>
  
          <article className="content-card">
            <span className="eyebrow">
              At risk
            </span>
            <h2>
              {dashboardLoading
                ? "…"
                : dashboard
                  ?.atRiskTickets ?? 0}
            </h2>
            <p className="muted">
              Over 75% SLA consumed
            </p>
          </article>
  
          <article className="content-card">
            <span className="eyebrow">
              Breached
            </span>
            <h2>
              {dashboardLoading
                ? "…"
                : dashboard
                  ?.breachedTickets ??
                  0}
            </h2>
            <p className="muted">
              SLA deadline passed
            </p>
          </article>
        </div>
  
        <div className="filter-panel">
          <div className="filter-panel__intro">
            <strong>
              Find tickets
            </strong>
  
            <span>
              Page {pageNumber}
            </span>
          </div>
  
          <div className="filter-controls">
            <label>
              <span>Status</span>
  
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target
                      .value as
                      | TicketStatus
                      | "",
                  );
  
                  resetPagination();
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
              <span>Priority</span>
  
              <select
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(
                    event.target
                      .value as
                      | TicketPriority
                      | "",
                  );
  
                  resetPagination();
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
  
            <label>
              <span>SLA</span>
  
              <select
                value={slaFilter}
                onChange={(event) => {
                  setSlaFilter(
                    event.target
                      .value as
                      | SlaState
                      | "",
                  );
  
                  resetPagination();
                }}
              >
                <option value="">
                  All SLA states
                </option>
                <option value="ON_TRACK">
                  On track
                </option>
                <option value="AT_RISK">
                  At risk
                </option>
                <option value="BREACHED">
                  Breached
                </option>
              </select>
            </label>
  
            {user.role === "AGENT" && (
              <label>
                <span>
                  Assignee
                </span>
  
                <select
                  value={
                    assignmentFilter
                  }
                  onChange={(event) => {
                    setAssignmentFilter(
                      event.target.value,
                    );
  
                    resetPagination();
                  }}
                >
                  <option value="ALL">
                    All agents
                  </option>
  
                  <option value="MINE">
                    Assigned to me
                  </option>
  
                  {agents.map(
                    (agent) => (
                      <option
                        key={agent.id}
                        value={agent.id}
                      >
                        {agent.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}
  
            <label>
              <span>Sort</span>
  
              <select
                value={sortOption}
                onChange={(event) => {
                  setSortOption(
                    event.target
                      .value as
                      SortOption,
                  );
                }}
              >
                <option value="NEWEST">
                  Newest first
                </option>
                <option value="OLDEST">
                  Oldest first
                </option>
                <option value="PRIORITY">
                  Priority high → low
                </option>
                <option value="SLA">
                  SLA severity
                </option>
              </select>
            </label>
  
            {hasFilters && (
              <button
                type="button"
                className="clear-filter-button"
                onClick={() => {
                  setStatusFilter("");
                  setPriorityFilter("");
                  setSlaFilter("");
                  setAssignmentFilter(
                    "ALL",
                  );
                  resetPagination();
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
            <span>{error}</span>
  
            <button
              type="button"
              onClick={() => {
                void loadTickets();
                void loadDashboard();
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
            {sortedTickets.length ===
            0 ? (
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
                {sortedTickets.map(
                  (ticket) => (
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className={`ticket-card ticket-card--sla-${ticket.sla.overallState
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
                            ticket.sla
                              .overallState
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
                              Resolution SLA
                            </span>
  
                            <strong>
                              {formatRemainingMinutes(
                                ticket.sla
                                  .resolutionRemainingMinutes,
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
  
                      <div className="ticket-card__footer">
                        <span>
                          Due{" "}
                          {formatDateTime(
                            ticket.sla
                              .resolutionDueAt,
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
  
            {(cursorStack.length >
              1 ||
              data.pageInfo
                .hasNextPage) && (
              <div className="pagination">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    cursorStack.length <=
                      1 ||
                    loading
                  }
                  onClick={() => {
                    setCursorStack(
                      (current) =>
                        current.slice(
                          0,
                          -1,
                        ),
                    );
                  }}
                >
                  ← Previous
                </button>
  
                <span>
                  Page{" "}
                  <strong>
                    {pageNumber}
                  </strong>
                </span>
  
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    !data.pageInfo
                      .hasNextPage ||
                    !data.pageInfo
                      .endCursor ||
                    loading
                  }
                  onClick={() => {
                    const endCursor =
                      data.pageInfo
                        .endCursor;
  
                    if (!endCursor) {
                      return;
                    }
  
                    setCursorStack(
                      (current) => [
                        ...current,
                        endCursor,
                      ],
                    );
                  }}
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