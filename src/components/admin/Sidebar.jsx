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

  const nav = React.useMemo(
    () =>
      [
        { to: "/admin/dashboard", label: "Dashboard", icon: FiHome },
        { to: "/admin/leads", label: "Leads", icon: FiUsers },
        { to: "/admin/callers", label: "Callers", icon: FiUserCheck },
        // { to: "/admin/reports", label: "Reports", icon: FiBarChart2 },
        // { to: "/admin/tasks", label: "Tasks", icon: FiClipboard },
        // { to: "/admin/settings", label: "Settings", icon: FiSettings },
      ].filter(Boolean),
    [role]
  );

  return (
    <aside
      className={`transform transition-transform lg:translate-x-0 static ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Sidebar"
    >
      <div className="flex items-center gap-3 px-5 h-16">
        <img src="/img/favlogo.svg" alt="Logo" />
      </div>

      <nav className="px-3 py-4 overflow-y-auto h-[calc(100%-4rem)]">
        <ul className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                title={label} 
                className={({ isActive }) =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-[#E9296A] text-[#fff] text-center"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={[
                        "text-[18px] m-auto",
                        isActive
                          ? "text-[#fff] "
                          : "text-gray-500 group-hover:text-gray-700",
                      ].join(" ")}
                    />
                    {/* <span>{label}</span> */}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t pt-4">
          <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100">
            <FiLogOut className="text-[18px]" />
          </button>
        </div>
      </nav>
    </aside>
  );
}
