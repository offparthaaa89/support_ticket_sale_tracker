import {
    useState,
    type FormEvent,
  } from "react";
  
  import {
    LOGIN_MUTATION,
  } from "../api/operations";
  
  import {
    graphqlRequest,
  } from "../api/graphql";
  
  import type {
    AppUser,
  } from "../types";
  
  interface LoginResponse {
    login: {
      token: string;
      user: AppUser;
    };
  }
  
  interface LoginVariables {
    input: {
      email: string;
      password: string;
    };
  }
  
  interface LoginPageProps {
    onAuthenticated: (
      token: string,
      user: AppUser,
    ) => void;
  }
  
  export default function LoginPage({
    onAuthenticated,
  }: LoginPageProps) {
    const [email, setEmail] =
      useState("");
  
    const [password, setPassword] =
      useState("");
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [submitting, setSubmitting] =
      useState(false);
  
    async function handleSubmit(
      event: FormEvent<HTMLFormElement>,
    ) {
      event.preventDefault();
  
      setError(null);
      setSubmitting(true);
  
      try {
        const data =
          await graphqlRequest<
            LoginResponse,
            LoginVariables
          >(
            LOGIN_MUTATION,
            {
              input: {
                email,
                password,
              },
            },
          );
  
        onAuthenticated(
          data.login.token,
          data.login.user,
        );
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to sign in",
        );
      } finally {
        setSubmitting(false);
      }
    }
  
    return (
      <main className="login-page">
        <section className="login-intro">
          <div className="login-brand">
            <span className="product-brand__mark">
              S
            </span>
  
            SupportFlow
          </div>
  
          <div className="login-message">
            <p className="eyebrow">
              Support without the noise
            </p>
  
            <h1>
              Resolve issues with clarity,
              not clutter.
            </h1>
  
            <p>
              One focused workspace for
              customers and support teams
              to track conversations,
              ownership and SLA health.
            </p>
          </div>
  
          <div className="login-trust-row">
            <span>
              Clear priorities
            </span>
  
            <span>
              Live SLA state
            </span>
  
            <span>
              Focused conversations
            </span>
          </div>
        </section>
  
        <section className="login-panel">
          <form
            className="login-card"
            onSubmit={handleSubmit}
          >
            <div className="login-card__heading">
              <span className="eyebrow">
                Welcome back
              </span>
  
              <h2>
                Sign in to your workspace
              </h2>
  
              <p>
                Use your support account
                credentials to continue.
              </p>
            </div>
  
            {error && (
              <div
                className="alert alert--error"
                role="alert"
              >
                {error}
              </div>
            )}
  
            <label className="field">
              <span>
                Email address
              </span>
  
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
  
            <label className="field">
              <span>
                Password
              </span>
  
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>
  
            <button
              className="primary-button primary-button--large"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Signing in…"
                : "Sign in"}
            </button>
  
            <p className="login-footnote">
              Authentication is handled
              securely by the GraphQL API.
            </p>
          </form>
        </section>
      </main>
    );
  }