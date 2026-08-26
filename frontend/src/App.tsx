import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  graphqlRequest,
} from "./api/graphql";

interface HealthQueryData {
  health: string;
}

type ConnectionState =
  | "checking"
  | "connected"
  | "error";

const HEALTH_QUERY = `
  query Health {
    health
  }
`;

export default function App() {
  const [
    connectionState,
    setConnectionState,
  ] = useState<ConnectionState>(
    "checking",
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const checkConnection =
    useCallback(async () => {
      setConnectionState("checking");
      setErrorMessage(null);

      try {
        const data =
          await graphqlRequest<
            HealthQueryData
          >(HEALTH_QUERY);

        if (data.health !== "OK") {
          throw new Error(
            "Unexpected health response",
          );
        }

        setConnectionState(
          "connected",
        );
      } catch (error: unknown) {
        setConnectionState("error");

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to connect to the API",
        );
      }
    }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const isChecking =
    connectionState === "checking";

  return (
    <main className="app-shell">
      <section className="setup-card">
        <div className="brand-mark">
          S
        </div>

        <p className="eyebrow">
          Support Ticket & SLA Tracker
        </p>

        <h1>
          Support operations,
          without the noise.
        </h1>

        <p className="hero-description">
          A focused workspace for
          customers and support agents
          to create, track and resolve
          issues efficiently.
        </p>

        <div
          className={`connection-card connection-card--${connectionState}`}
        >
          <div
            className="connection-status"
          >
            <span
              className="status-dot"
              aria-hidden="true"
            />

            <div>
              <strong>
                {connectionState ===
                "connected"
                  ? "API connected"
                  : connectionState ===
                      "checking"
                    ? "Checking API"
                    : "API unavailable"}
              </strong>

              <p>
                {connectionState ===
                "connected"
                  ? "React is successfully communicating with GraphQL Yoga."
                  : connectionState ===
                      "checking"
                    ? "Connecting to the backend…"
                    : errorMessage ??
                      "Could not reach the backend."}
              </p>
            </div>
          </div>

          {connectionState ===
            "error" && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                void checkConnection();
              }}
            >
              Try again
            </button>
          )}
        </div>

        <div className="foundation-grid">
          <article>
            <span>01</span>
            <strong>
              Clear
            </strong>
            <p>
              Important information gets
              visual priority.
            </p>
          </article>

          <article>
            <span>02</span>
            <strong>
              Calm
            </strong>
            <p>
              Status colors communicate
              meaning without visual
              overload.
            </p>
          </article>

          <article>
            <span>03</span>
            <strong>
              Responsive
            </strong>
            <p>
              Every action provides
              immediate visual feedback.
            </p>
          </article>
        </div>

        <p className="setup-note">
          {isChecking
            ? "Preparing your workspace…"
            : "Frontend foundation ready."}
        </p>
      </section>
    </main>
  );
}