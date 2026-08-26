import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
  } from "react";
  
  import {
    Link,
    useParams,
    useSearchParams,
  } from "react-router-dom";
  
  import {
    GraphQLRequestError,
    graphqlRequest,
  } from "../api/graphql";
  
  import {
    ADD_COMMENT_MUTATION,
    ASSIGN_TICKET_MUTATION,
    TICKET_QUERY,
    UPDATE_TICKET_STATUS_MUTATION,
  } from "../api/operations";
  
  import {
    PriorityBadge,
    SlaBadge,
    StatusBadge,
  } from "../components/Badges";
  
  import type {
    AppUser,
    TicketDetails,
    TicketStatus,
  } from "../types";
  
  import {
    formatDateTime,
    getInitials,
  } from "../utils/format";
  
  interface TicketResponse {
    ticket: TicketDetails;
  }
  
  interface TicketVariables {
    id: string;
  }
  
  interface CommentVariables {
    input: {
      ticketId: string;
      content: string;
    };
  }
  
  interface AssignVariables {
    input: {
      ticketId: string;
      agentId: string;
    };
  }
  
  interface StatusVariables {
    input: {
      ticketId: string;
      status: TicketStatus;
    };
  }
  
  interface MutationIdResponse {
    addComment?: {
      id: string;
    };
  
    assignTicket?: {
      id: string;
    };
  
    updateTicketStatus?: {
      id: string;
    };
  }
  
  interface TicketDetailsPageProps {
    accessToken: string;
    user: AppUser;
    onSessionExpired: () => void;
  }
  
  interface StatusAction {
    status: TicketStatus;
    label: string;
  }
  
  function getNextStatusAction(
    status: TicketStatus,
  ): StatusAction | null {
    switch (status) {
      case "OPEN":
        return {
          status: "IN_PROGRESS",
          label: "Start progress",
        };
  
      case "IN_PROGRESS":
        return {
          status: "RESOLVED",
          label: "Mark resolved",
        };
  
      case "RESOLVED":
        return {
          status: "CLOSED",
          label: "Close ticket",
        };
  
      case "CLOSED":
        return null;
    }
  }
  
  export default function TicketDetailsPage({
    accessToken,
    user,
    onSessionExpired,
  }: TicketDetailsPageProps) {
    const { ticketId } =
      useParams<{
        ticketId: string;
      }>();
  
    const [searchParams] =
      useSearchParams();
  
    const [ticket, setTicket] =
      useState<TicketDetails | null>(
        null,
      );
  
    const [comment, setComment] =
      useState("");
  
    const [loading, setLoading] =
      useState(true);
  
    const [
      actionPending,
      setActionPending,
    ] = useState(false);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [
      actionMessage,
      setActionMessage,
    ] = useState<string | null>(
      searchParams.get("created") === "1"
        ? "Ticket created successfully."
        : null,
    );
  
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
              : "Something went wrong",
          );
        },
        [onSessionExpired],
      );
  
    const loadTicket =
      useCallback(async () => {
        if (!ticketId) {
          setError(
            "Ticket ID is missing",
          );
  
          setLoading(false);
          return;
        }
  
        setLoading(true);
        setError(null);
  
        try {
          const response =
            await graphqlRequest<
              TicketResponse,
              TicketVariables
            >(
              TICKET_QUERY,
              {
                id: ticketId,
              },
              accessToken,
            );
  
          setTicket(response.ticket);
        } catch (caughtError: unknown) {
          handleApiError(
            caughtError,
          );
        } finally {
          setLoading(false);
        }
      }, [
        accessToken,
        handleApiError,
        ticketId,
      ]);
  
    useEffect(() => {
      void loadTicket();
    }, [loadTicket]);
  
    async function handleCommentSubmit(
      event: FormEvent<HTMLFormElement>,
    ) {
      event.preventDefault();
  
      if (
        !ticketId ||
        !comment.trim()
      ) {
        return;
      }
  
      setActionPending(true);
      setError(null);
      setActionMessage(null);
  
      try {
        await graphqlRequest<
          MutationIdResponse,
          CommentVariables
        >(
          ADD_COMMENT_MUTATION,
          {
            input: {
              ticketId,
              content: comment,
            },
          },
          accessToken,
        );
  
        setComment("");
  
        setActionMessage(
          "Comment added.",
        );
  
        await loadTicket();
      } catch (caughtError: unknown) {
        handleApiError(
          caughtError,
        );
      } finally {
        setActionPending(false);
      }
    }
  
    async function handleAssignToMe() {
      if (!ticketId) {
        return;
      }
  
      setActionPending(true);
      setError(null);
      setActionMessage(null);
  
      try {
        await graphqlRequest<
          MutationIdResponse,
          AssignVariables
        >(
          ASSIGN_TICKET_MUTATION,
          {
            input: {
              ticketId,
              agentId: user.id,
            },
          },
          accessToken,
        );
  
        setActionMessage(
          "Ticket assigned to you.",
        );
  
        await loadTicket();
      } catch (caughtError: unknown) {
        handleApiError(
          caughtError,
        );
      } finally {
        setActionPending(false);
      }
    }
  
    async function handleStatusUpdate(
      status: TicketStatus,
    ) {
      if (!ticketId) {
        return;
      }
  
      setActionPending(true);
      setError(null);
      setActionMessage(null);
  
      try {
        await graphqlRequest<
          MutationIdResponse,
          StatusVariables
        >(
          UPDATE_TICKET_STATUS_MUTATION,
          {
            input: {
              ticketId,
              status,
            },
          },
          accessToken,
        );
  
        setActionMessage(
          "Ticket status updated.",
        );
  
        await loadTicket();
      } catch (caughtError: unknown) {
        handleApiError(
          caughtError,
        );
      } finally {
        setActionPending(false);
      }
    }
  
    if (loading && !ticket) {
      return (
        <section className="page-section">
          <div className="detail-loading">
            <div className="skeleton skeleton--short" />
            <div className="skeleton skeleton--heading" />
            <div className="skeleton skeleton--medium" />
          </div>
        </section>
      );
    }
  
    if (!ticket) {
      return (
        <section className="page-section">
          <Link
            to="/tickets"
            className="back-link"
          >
            ← Back to tickets
          </Link>
  
          <div className="empty-state">
            <h1>
              Ticket unavailable
            </h1>
  
            <p>
              {error ??
                "We couldn't load this ticket."}
            </p>
          </div>
        </section>
      );
    }
  
    const nextStatusAction =
      getNextStatusAction(
        ticket.status,
      );
  
    const isAssignedToCurrentAgent =
      ticket.assignedAgent?.id ===
      user.id;
  
    return (
      <section className="page-section">
        <Link
          to="/tickets"
          className="back-link"
        >
          ← Back to tickets
        </Link>
  
        {actionMessage && (
          <div
            className="alert alert--success"
            role="status"
          >
            {actionMessage}
          </div>
        )}
  
        {error && (
          <div
            className="alert alert--error"
            role="alert"
          >
            {error}
          </div>
        )}
  
        <div className="ticket-detail-heading">
          <div>
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
  
              <SlaBadge
                state={
                  ticket.slaState
                }
              />
            </div>
  
            <h1>
              {ticket.title}
            </h1>
  
            <p>
              Ticket{" "}
              <span className="ticket-id">
                {ticket.id}
              </span>
            </p>
          </div>
        </div>
  
        <div className="ticket-detail-layout">
          <div className="ticket-detail-main">
            <article className="content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">
                    Request
                  </span>
  
                  <h2>
                    Issue details
                  </h2>
                </div>
  
                <span className="muted">
                  {formatDateTime(
                    ticket.createdAt,
                  )}
                </span>
              </div>
  
              <p className="ticket-description">
                {ticket.description}
              </p>
  
              <div className="requester-row">
                <div className="user-avatar">
                  {getInitials(
                    ticket.creator.name,
                  )}
                </div>
  
                <div>
                  <strong>
                    {
                      ticket.creator
                        .name
                    }
                  </strong>
  
                  <span>
                    {
                      ticket.creator
                        .email
                    }
                  </span>
                </div>
              </div>
            </article>
  
            <article className="content-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">
                    Conversation
                  </span>
  
                  <h2>
                    Comments
                  </h2>
                </div>
  
                <span className="comment-count">
                  {
                    ticket.comments
                      .length
                  }{" "}
                  comment
                  {ticket.comments
                    .length === 1
                    ? ""
                    : "s"}
                </span>
              </div>
  
              <div className="comment-thread">
                {ticket.comments
                  .length === 0 ? (
                  <div className="comment-empty">
                    No comments yet. Start
                    the conversation below.
                  </div>
                ) : (
                  ticket.comments.map(
                    (item) => (
                      <div
                        className={`comment ${
                          item.author
                            .role ===
                          "AGENT"
                            ? "comment--agent"
                            : ""
                        }`}
                        key={item.id}
                      >
                        <div className="comment__avatar">
                          {getInitials(
                            item.author
                              .name,
                          )}
                        </div>
  
                        <div className="comment__content">
                          <div className="comment__heading">
                            <div>
                              <strong>
                                {
                                  item
                                    .author
                                    .name
                                }
                              </strong>
  
                              <span>
                                {item
                                  .author
                                  .role ===
                                "AGENT"
                                  ? "Support"
                                  : "Customer"}
                              </span>
                            </div>
  
                            <time>
                              {formatDateTime(
                                item.createdAt,
                              )}
                            </time>
                          </div>
  
                          <p>
                            {item.content}
                          </p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
  
              <form
                className="comment-composer"
                onSubmit={
                  handleCommentSubmit
                }
              >
                <label className="field">
                  <span className="field-label-row">
                    <strong>
                      Add a comment
                    </strong>
  
                    <small>
                      {comment.length}
                      /2000
                    </small>
                  </span>
  
                  <textarea
                    value={comment}
                    onChange={(
                      event,
                    ) =>
                      setComment(
                        event.target
                          .value,
                      )
                    }
                    maxLength={2000}
                    rows={4}
                    placeholder={
                      user.role ===
                      "AGENT"
                        ? "Write a clear update for the customer…"
                        : "Add more information or reply to support…"
                    }
                    required
                  />
                </label>
  
                <div className="composer-actions">
                  <span>
                    Keep updates concise
                    and useful.
                  </span>
  
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={
                      actionPending ||
                      !comment.trim()
                    }
                  >
                    {actionPending
                      ? "Sending…"
                      : "Send comment"}
                  </button>
                </div>
              </form>
            </article>
          </div>
  
          <aside className="ticket-sidebar">
            <div className="content-card detail-summary">
              <span className="eyebrow">
                SLA health
              </span>
  
              <div className="sla-highlight">
                <SlaBadge
                  state={
                    ticket.slaState
                  }
                />
  
                <strong>
                  {formatDateTime(
                    ticket.slaDeadline,
                  )}
                </strong>
  
                <span>
                  Response deadline
                </span>
              </div>
  
              <dl className="detail-list">
                <div>
                  <dt>
                    Status
                  </dt>
  
                  <dd>
                    <StatusBadge
                      status={
                        ticket.status
                      }
                    />
                  </dd>
                </div>
  
                <div>
                  <dt>
                    Priority
                  </dt>
  
                  <dd>
                    <PriorityBadge
                      priority={
                        ticket.priority
                      }
                    />
                  </dd>
                </div>
  
                <div>
                  <dt>
                    Assigned agent
                  </dt>
  
                  <dd>
                    {ticket
                      .assignedAgent
                      ?.name ??
                      "Unassigned"}
                  </dd>
                </div>
  
                <div>
                  <dt>
                    First response
                  </dt>
  
                  <dd>
                    {formatDateTime(
                      ticket.firstResponseAt,
                    )}
                  </dd>
                </div>
              </dl>
            </div>
  
            {user.role === "AGENT" && (
              <div className="content-card agent-action-card">
                <span className="eyebrow">
                  Agent actions
                </span>
  
                <h2>
                  Move the ticket forward
                </h2>
  
                <p>
                  Take ownership or
                  progress the ticket
                  through its lifecycle.
                </p>
  
                {!isAssignedToCurrentAgent && (
                  <button
                    type="button"
                    className="secondary-button secondary-button--full"
                    onClick={() => {
                      void handleAssignToMe();
                    }}
                    disabled={
                      actionPending
                    }
                  >
                    {ticket.assignedAgent
                      ? "Take over ticket"
                      : "Assign to me"}
                  </button>
                )}
  
                {isAssignedToCurrentAgent && (
                  <div className="assigned-confirmation">
                    ✓ Assigned to you
                  </div>
                )}
  
                {nextStatusAction ? (
                  <button
                    type="button"
                    className="primary-button primary-button--full"
                    onClick={() => {
                      void handleStatusUpdate(
                        nextStatusAction.status,
                      );
                    }}
                    disabled={
                      actionPending
                    }
                  >
                    {
                      nextStatusAction.label
                    }
                  </button>
                ) : (
                  <div className="workflow-complete">
                    ✓ Ticket lifecycle
                    complete
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    );
  }