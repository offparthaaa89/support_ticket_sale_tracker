import {
    useState,
    type FormEvent,
  } from "react";
  
  import {
    Link,
    useNavigate,
  } from "react-router-dom";
  
  import {
    GraphQLRequestError,
    graphqlRequest,
  } from "../api/graphql";
  
  import {
    CREATE_TICKET_MUTATION,
  } from "../api/operations";
  
  import type {
    TicketPriority,
  } from "../types";
  
  interface CreateTicketResponse {
    createTicket: {
      id: string;
    };
  }
  
  interface CreateTicketVariables {
    input: {
      title: string;
      description: string;
      priority: TicketPriority;
    };
  }
  
  interface CreateTicketPageProps {
    accessToken: string;
    onSessionExpired: () => void;
  }
  
  const priorities: Array<{
    value: TicketPriority;
    label: string;
    description: string;
  }> = [
    {
      value: "LOW",
      label: "Low",
      description:
        "Minor issue with little immediate impact.",
    },
    {
      value: "MEDIUM",
      label: "Medium",
      description:
        "Normal issue affecting your workflow.",
    },
    {
      value: "HIGH",
      label: "High",
      description:
        "Major problem significantly blocking work.",
    },
    {
      value: "URGENT",
      label: "Urgent",
      description:
        "Critical issue requiring immediate attention.",
    },
  ];
  
  export default function CreateTicketPage({
    accessToken,
    onSessionExpired,
  }: CreateTicketPageProps) {
    const navigate =
      useNavigate();
  
    const [title, setTitle] =
      useState("");
  
    const [
      description,
      setDescription,
    ] = useState("");
  
    const [priority, setPriority] =
      useState<TicketPriority>(
        "MEDIUM",
      );
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [submitting, setSubmitting] =
      useState(false);
  
    async function handleSubmit(
      event: FormEvent<HTMLFormElement>,
    ) {
      event.preventDefault();
  
      setSubmitting(true);
      setError(null);
  
      try {
        const data =
          await graphqlRequest<
            CreateTicketResponse,
            CreateTicketVariables
          >(
            CREATE_TICKET_MUTATION,
            {
              input: {
                title,
                description,
                priority,
              },
            },
            accessToken,
          );
  
        navigate(
          `/tickets/${data.createTicket.id}?created=1`,
        );
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
            : "Unable to create ticket",
        );
      } finally {
        setSubmitting(false);
      }
    }
  
    return (
      <section className="page-section page-section--narrow">
        <Link
          to="/tickets"
          className="back-link"
        >
          ← Back to tickets
        </Link>
  
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              New support request
            </p>
  
            <h1>
              Tell us what happened.
            </h1>
  
            <p className="page-description">
              Clear information helps the
              support team understand and
              resolve your issue faster.
            </p>
          </div>
        </div>
  
        <form
          className="create-ticket-layout"
          onSubmit={handleSubmit}
        >
          <div className="form-card">
            {error && (
              <div
                className="alert alert--error"
                role="alert"
              >
                {error}
              </div>
            )}
  
            <label className="field">
              <span className="field-label-row">
                <strong>
                  Ticket title
                </strong>
  
                <small>
                  {title.length}/120
                </small>
              </span>
  
              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                placeholder="Example: Unable to access my dashboard"
                minLength={3}
                maxLength={120}
                required
              />
  
              <small>
                Describe the problem in one
                clear sentence.
              </small>
            </label>
  
            <label className="field">
              <span className="field-label-row">
                <strong>
                  Description
                </strong>
  
                <small>
                  {description.length}/5000
                </small>
              </span>
  
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="What were you trying to do? What happened instead?"
                minLength={10}
                maxLength={5000}
                rows={8}
                required
              />
  
              <small>
                Include enough context for
                someone unfamiliar with the
                problem.
              </small>
            </label>
  
            <fieldset className="priority-fieldset">
              <legend>
                Priority
              </legend>
  
              <div className="priority-options">
                {priorities.map(
                  (option) => (
                    <label
                      className={`priority-option ${
                        priority ===
                        option.value
                          ? "priority-option--selected"
                          : ""
                      }`}
                      key={option.value}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={
                          option.value
                        }
                        checked={
                          priority ===
                          option.value
                        }
                        onChange={() =>
                          setPriority(
                            option.value,
                          )
                        }
                      />
  
                      <span>
                        <strong>
                          {option.label}
                        </strong>
  
                        <small>
                          {
                            option.description
                          }
                        </small>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>
  
            <div className="form-actions">
              <Link
                to="/tickets"
                className="secondary-button"
              >
                Cancel
              </Link>
  
              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Creating ticket…"
                  : "Create ticket"}
              </button>
            </div>
          </div>
  
          <aside className="guidance-card">
            <span className="guidance-card__number">
              01
            </span>
  
            <h2>
              Help us help you faster
            </h2>
  
            <p>
              A useful support request
              usually answers three
              questions:
            </p>
  
            <ol>
              <li>
                What were you trying to do?
              </li>
  
              <li>
                What happened instead?
              </li>
  
              <li>
                How much is it affecting
                your work?
              </li>
            </ol>
  
            <div className="guidance-note">
              Your SLA deadline is
              calculated automatically
              from the selected priority.
            </div>
          </aside>
        </form>
      </section>
    );
  }