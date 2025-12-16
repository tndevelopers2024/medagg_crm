import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiBarChart2,
  FiClipboard,
  FiSettings,
  FiLogOut,
  FiUserCheck,
} from "react-icons/fi";

export default function Sidebar({ open, onClose }) {
  const [role, setRole] = React.useState(null);

  React.useEffect(() => {
    try {
      const r = localStorage.getItem("role");
      setRole(r || null);
    } catch {}
  }, []);

  // Pick which item should show the little red dot (to mimic the image)
  const nav = React.useMemo(
    () =>
      [
        { to: "/caller/dashboard", label: "Dashboard", icon: FiHome },
        { to: "/caller/leads", label: "Leads", icon: FiUsers },
        // { to: "/caller/callers", label: "Callers", icon: FiUserCheck, dot: true }, // red dot here
        // { to: "/caller/reports", label: "Reports", icon: FiBarChart2 },
        // { to: "/caller/tasks", label: "Tasks", icon: FiClipboard },
        // { to: "/caller/settings", label: "Settings", icon: FiSettings },
      ].filter(Boolean),
    [role]
  );

  return (
    <aside
      aria-label="Sidebar"
      className={[
        "fixed left-0 top-0 z-40 h-screen w-16 bg-white border-r border-gray-100",
        "transform transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      ].join(" ")}
    >
      {/* top logo */}
      <div className="flex items-center justify-center h-16">
        <img src="/img/favlogo.svg" alt="Logo" className="h-7 w-7" />
      </div>

      {/* icon rail */}
      <nav className="h-[calc(100%-4rem)] overflow-y-auto">
        <ul className="mt-2 flex flex-col items-center space-y-4">
          {nav.map(({ to, label, icon: Icon, dot }) => (
            <li key={to} className="w-full flex justify-center">
              <NavLink
                to={to}
                title={label}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "group relative grid place-items-center rounded-2xl",
                    "w-12 h-12 transition",
                    isActive
                      ? "bg-[#E9296A] text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {/* red dot (only when not active, like the screenshot) */}
                    {dot && !isActive && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                    )}

                    <Icon
                      className={[
                        "text-[20px]",
                        isActive
                          ? "text-white"
                          : "text-gray-500 group-hover:text-gray-700",
                      ].join(" ")}
                    />
                    <span className="sr-only">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* bottom logout */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <button
            title="Log out"
            className="grid place-items-center w-12 h-12 rounded-2xl text-gray-500 hover:bg-gray-100"
          >
            <FiLogOut className="text-[20px]" />
          </button>
        </div>
      </nav>
    </aside>
  );
}
