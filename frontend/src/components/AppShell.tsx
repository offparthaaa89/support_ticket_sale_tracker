import {
    NavLink,
    Outlet,
  } from "react-router-dom";
  
  import type {
    AppUser,
  } from "../types";
  
  import {
    getInitials,
  } from "../utils/format";
  
  interface AppShellProps {
    user: AppUser;
    onLogout: () => void;
  }
  
  export default function AppShell({
    user,
    onLogout,
  }: AppShellProps) {
    return (
      <div className="product-shell">
        <header className="app-header">
          <div className="header-inner">
            <NavLink
              to="/tickets"
              className="product-brand"
            >
              <span className="product-brand__mark">
                S
              </span>
  
              <span>
                <strong>
                  SupportFlow
                </strong>
  
                <small>
                  Ticket & SLA
                </small>
              </span>
            </NavLink>
  
            <nav
              className="primary-nav"
              aria-label="Main navigation"
            >
              <NavLink
                to="/tickets"
                className={({ isActive }) =>
                  isActive
                    ? "nav-link nav-link--active"
                    : "nav-link"
                }
              >
                Tickets
              </NavLink>
  
              {user.role === "USER" && (
                <NavLink
                  to="/tickets/new"
                  className={({ isActive }) =>
                    isActive
                      ? "nav-link nav-link--active"
                      : "nav-link"
                  }
                >
                  New ticket
                </NavLink>
              )}
            </nav>
  
            <div className="account-area">
              <div
                className="user-avatar"
                aria-hidden="true"
              >
                {getInitials(user.name)}
              </div>
  
              <div className="account-copy">
                <strong>
                  {user.name}
                </strong>
  
                <span>
                  {user.role === "AGENT"
                    ? "Support agent"
                    : "Customer"}
                </span>
              </div>
  
              <button
                className="ghost-button"
                type="button"
                onClick={onLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </header>
  
        <main className="workspace">
          <Outlet />
        </main>
      </div>
    );
  }