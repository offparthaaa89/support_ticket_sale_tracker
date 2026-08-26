import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  graphqlRequest,
} from "./api/graphql";

import {
  ME_QUERY,
} from "./api/operations";

import AppShell from "./components/AppShell";

import CreateTicketPage from "./pages/CreateTicketPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import TicketDetailsPage from "./pages/TicketDetailsPage";

import type {
  AppUser,
} from "./types";

interface MeResponse {
  me: AppUser;
}

const TOKEN_STORAGE_KEY =
  "supportflow_access_token";

export default function App() {
  const [
    accessToken,
    setAccessToken,
  ] = useState<string | null>(
    () =>
      sessionStorage.getItem(
        TOKEN_STORAGE_KEY,
      ),
  );

  const [user, setUser] =
    useState<AppUser | null>(
      null,
    );

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(
    Boolean(accessToken),
  );

  const handleLogout =
    useCallback(() => {
      sessionStorage.removeItem(
        TOKEN_STORAGE_KEY,
      );

      setAccessToken(null);
      setUser(null);
      setCheckingSession(false);
    }, []);

  useEffect(() => {
    if (!accessToken) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;

    async function restoreSession() {
      setCheckingSession(true);

      try {
        const data =
          await graphqlRequest<
            MeResponse
          >(
            ME_QUERY,
            undefined,
            accessToken ??
              undefined,
          );

        if (!cancelled) {
          setUser(data.me);
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(
            TOKEN_STORAGE_KEY,
          );

          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function handleAuthenticated(
    token: string,
    authenticatedUser: AppUser,
  ) {
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      token,
    );

    setAccessToken(token);
    setUser(authenticatedUser);
  }

  if (checkingSession) {
    return (
      <div className="session-loading">
        <div className="brand-loader">
          S
        </div>

        <strong>
          Preparing your workspace
        </strong>

        <span>
          Checking your session…
        </span>
      </div>
    );
  }

  const authenticated =
    Boolean(accessToken && user);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authenticated ? (
              <Navigate
                to="/tickets"
                replace
              />
            ) : (
              <LoginPage
                onAuthenticated={
                  handleAuthenticated
                }
              />
            )
          }
        />

        {authenticated &&
        accessToken &&
        user ? (
          <Route
            element={
              <AppShell
                user={user}
                onLogout={
                  handleLogout
                }
              />
            }
          >
            <Route
              path="/tickets"
              element={
                <DashboardPage
                  accessToken={
                    accessToken
                  }
                  user={user}
                  onSessionExpired={
                    handleLogout
                  }
                />
              }
            />

            <Route
              path="/tickets/new"
              element={
                user.role ===
                "USER" ? (
                  <CreateTicketPage
                    accessToken={
                      accessToken
                    }
                    onSessionExpired={
                      handleLogout
                    }
                  />
                ) : (
                  <Navigate
                    to="/tickets"
                    replace
                  />
                )
              }
            />

            <Route
              path="/tickets/:ticketId"
              element={
                <TicketDetailsPage
                  accessToken={
                    accessToken
                  }
                  user={user}
                  onSessionExpired={
                    handleLogout
                  }
                />
              }
            />
          </Route>
        ) : null}

        <Route
          path="*"
          element={
            <Navigate
              to={
                authenticated
                  ? "/tickets"
                  : "/login"
              }
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}