import { useMemo, useState, useRef } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useApp } from "../../store";
import { ThemeToggle } from "../../components/ThemeToggle";
import { cx } from "../../lib/cx";
import { useDismissOnOutsideInteraction } from "../../lib/useDismissOnOutsideInteraction";

function initialsFromName(name: string) {
  const cleaned = String(name).trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/g);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}

const Layout = () => {
  const { state, actions } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const currentUser = useMemo(() => {
    return state.db.users.find((u) => u.id === state.auth.currentUserId);
  }, [state.auth.currentUserId, state.db.users]);

  const currentUserLabel = currentUser?.name ?? "User";
  const currentUserInitials = initialsFromName(currentUserLabel);

  useDismissOnOutsideInteraction(
    userMenuOpen,
    [userMenuButtonRef, userMenuRef],
    () => setUserMenuOpen(false),
  );

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="brand brandLogo" aria-label="Company home">
          <span className="brandLogoMark" aria-hidden="true">
            <svg
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="1"
                y="1"
                width="32"
                height="32"
                rx="10"
                stroke="currentColor"
                opacity="0.35"
              />
              <path
                d="M10 18.4c0-4.5 3.2-7.4 7.7-7.4 2.5 0 4.6.9 6.3 2.6l-2.2 2.2c-1-1-2.3-1.6-4-1.6-2.7 0-4.4 1.7-4.4 4.3 0 2.6 1.7 4.3 4.4 4.3 1.8 0 3.1-.6 4.2-1.7l2.2 2.2c-1.8 1.8-4 2.8-6.5 2.8-4.6 0-7.7-2.9-7.7-7.7Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </span>
          <span className="brandLogoText">
            <span className="brandLogoName">Company</span>
          </span>
        </Link>

        <nav className="topNav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => cx("navLink", isActive && "navLinkOn")}
          >
            Home
          </NavLink>
          <NavLink
            to="/bookings"
            className={({ isActive }) => cx("navLink", isActive && "navLinkOn")}
          >
            Bookings
          </NavLink>
          <NavLink
            to="/desks"
            className={({ isActive }) => cx("navLink", isActive && "navLinkOn")}
          >
            All desks
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => cx("navLink", isActive && "navLinkOn")}
          >
            Admin
          </NavLink>
        </nav>

        <div className="headerRight">
          <ThemeToggle value={state.ui.theme} onChange={actions.setTheme} />
          <div className="pill">
            <span
              className={cx(
                "dot",
                navigator.onLine ? "dotOnline" : "dotOffline",
              )}
            />
            <span>{navigator.onLine ? "Online" : "Offline"}</span>
          </div>

          <div className="userSwitcher">
            <button
              type="button"
              className="secondary profileButton"
              ref={userMenuButtonRef}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label={`Select user (${currentUserLabel})`}
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <span className="profileAvatar" aria-hidden="true">
                {currentUserInitials}
              </span>
              <span className="profileName">{currentUserLabel}</span>
              <span className="profileChevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {userMenuOpen ? (
              <div
                ref={userMenuRef}
                className="profileMenu"
                role="menu"
                aria-label="Select user"
              >
                {state.db.users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={u.id === state.auth.currentUserId}
                    className={cx(
                      "profileMenuItem",
                      u.id === state.auth.currentUserId && "profileMenuItemOn",
                    )}
                    onClick={() => {
                      actions.setCurrentUser(u.id);
                      setUserMenuOpen(false);
                    }}
                  >
                    <span className="profileAvatarSmall" aria-hidden="true">
                      {initialsFromName(u.name)}
                    </span>
                    <span className="profileMenuName">{u.name}</span>
                    <span className="profileMenuRole">{u.role}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
};

export default Layout;
