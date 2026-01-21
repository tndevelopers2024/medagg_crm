import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ArrowTrendingUpIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  AdjustmentsHorizontalIcon,
  CalendarIcon,
  Squares2X2Icon,
  ChevronLeftIcon,
  Bars3Icon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { clearUserData } from "../../utils/roleUtils";

import { fetchAllLeads, fetchAssignedLeads } from "../../utils/api";

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, isCaller, setUser, loading } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState(false);
  const [leadCount, setLeadCount] = React.useState(0);

  // Fallback: check localStorage if user not loaded yet
  const [localRole, setLocalRole] = React.useState(null);

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Extract role from the data object structure provided
        const role = parsedUser.data?.role || parsedUser.role;
        setLocalRole(role);
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }
  }, []);
  // Use AuthContext isAdmin if available, otherwise check localStorage or user.role
  const userRole = user?.role || localRole;
  const effectiveIsAdmin = Boolean(
    isAdmin ||
    (userRole && ['admin', 'superadmin', 'owner'].includes(userRole.toLowerCase()))
  );
  const effectiveIsCaller = Boolean(
    isCaller ||
    (userRole && userRole.toLowerCase() === 'caller')
  );

  // Fetch lead count
  React.useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const fetchFn = effectiveIsCaller ? fetchAssignedLeads : fetchAllLeads;
        // Use limit=1 to minimize data transfer, we just need the count
        const { count } = await fetchFn({ limit: 1 });
        if (mounted) setLeadCount(count || 0);
      } catch (error) {
        console.error("Error fetching lead count:", error);
      }
    };

    if (userRole) {
      fetchCount();
      // Optional: Set up an interval or socket listener here for real-time updates
      const interval = setInterval(fetchCount, 30000); // Polling every 30s as fallback
      return () => clearInterval(interval);
    }
    return () => { mounted = false; };
  }, [userRole, effectiveIsCaller]);

  // Debug logging
  React.useEffect(() => {
    console.log('Sidebar - User:', user);
    console.log('Sidebar - user.role:', user?.data?.role);
    console.log('Sidebar - isAdmin:', isAdmin);
    console.log('Sidebar - localRole:', localRole);
    console.log('Sidebar - userRole:', userRole);
    console.log('Sidebar - effectiveIsAdmin:', effectiveIsAdmin);
    console.log('Sidebar - loading:', loading);
  }, [user, isAdmin, effectiveIsAdmin, localRole, userRole, loading]);

  // Determine base path based on role
  const basePath = user?.role ? `/${user.role.toLowerCase()}` : (localRole ? `/${localRole.toLowerCase()}` : '/admin');

  const handleLogout = () => {
    clearUserData();
    setUser(null);
    navigate('/');
  };

  const nav = React.useMemo(
    () => {
      const items = [
        { to: `${basePath}/dashboard`, label: "Dashboard", icon: HomeIcon },
        { to: `${basePath}/search`, label: "Search", icon: MagnifyingGlassIcon },
        {
          to: `${basePath}/leads`,
          label: "Leads",
          icon: UsersIcon,
          badge: leadCount > 0 ? leadCount : null
        },
        { to: `${basePath}/leads/create`, label: "Create Lead", icon: PlusCircleIcon },
      ];

      // Admin-only items - use effectiveIsAdmin
      console.log('Building nav - effectiveIsAdmin:', effectiveIsAdmin, 'user.role:', user?.role, 'localRole:', localRole);
      if (effectiveIsAdmin) {
        items.push(
          { to: "/admin/campaigns", label: "Campaigns", icon: ArrowTrendingUpIcon },
          { to: "/admin/campaigns/import", label: "Bulk Upload", icon: ArrowUpTrayIcon },
          { to: "/admin/callers", label: "Callers", icon: UserPlusIcon },
          { to: "/admin/analytics", label: "Analytics", icon: ChartBarIcon }
        );
      }

      // Shared items
      items.push(
        { to: `${basePath}/duplicates`, label: "Duplicates", icon: Squares2X2Icon }
      );

      return items;
    },
    [basePath, effectiveIsAdmin, user?.role, localRole, leadCount]
  );

  const masterNav = React.useMemo(
    () => effectiveIsAdmin ? [{ to: "/admin/master", label: "Master", icon: AdjustmentsHorizontalIcon }] : [],
    [effectiveIsAdmin]
  );

  return (
    <aside
      aria-label="Sidebar"
      className={[
        "h-screen flex flex-col bg-white text-gray-800 shadow-xl relative isolate overflow-hidden border-r border-gray-100",
        "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        expanded ? "w-72" : "w-[88px]",
      ].join(" ")}
    >
      {/* Background Decor Removed for clean white look */}

      {/* Blue toggle button - positioned nicely */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={[
          "hidden lg:flex absolute z-50 items-center justify-center w-8 h-8 rounded-full",
          "bg-blue-500 text-white shadow-lg hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all duration-300",
          "border border-white ring-2 z-10 ring-blue-100",
          expanded ? "right-[10px] top-8" : "left-1/2 -translate-x-1/2 top-18", // Adjusted for collapsed state
        ].join(" ")}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? <ChevronLeftIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
      </button>

      {/* Logo Section */}
      <div className={`flex items-center h-24 flex-shrink-0 ${expanded ? 'px-6 gap-4' : 'justify-center'}`}>
        <img src="/img/favlogo.svg" alt="Logo" className="h-10 w-10 flex-shrink-0" />

        {expanded && (
          <div className="flex flex-col animate-fadeIn">
            <span className="font-bold text-2xl tracking-tight text-gray-900">
              MedAgg
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
              Admin Console
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
        {/* Main Menu */}
        <div className="space-y-2">
          {expanded && <div className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Menu</div>}
          <ul className="space-y-1">
            {nav.map(({ to, label, icon: Icon, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to.endsWith("/leads") || to.endsWith("/campaigns")}
                  title={!expanded ? label : undefined}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center rounded-xl transition-all duration-300 overflow-hidden",
                      expanded ? "px-4 py-3 gap-3" : "justify-center py-3 px-2",
                      isActive
                        ? "bg-[#E9296A] text-white shadow-lg shadow-pink-500/20"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <Icon
                          className={[
                            "w-6 h-6 flex-shrink-0 transition-transform duration-300",
                            !expanded && !isActive && "group-hover:scale-110",
                            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600",
                          ].join(" ")}
                        />
                        {/* Collapsed Badge */}
                        {!expanded && badge && (
                          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#E9296A] text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </div>

                      {expanded && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className={`font-medium text-[15px] whitespace-nowrap tracking-wide ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {label}
                          </span>
                          {/* Expanded Badge */}
                          {badge && (
                            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-[#E9296A]' : 'bg-[#E9296A] text-white'}`}>
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Active Indicator Line (Left) */}
                      {isActive && !expanded && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-500 rounded-r-md" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Master Section */}
        {masterNav.length > 0 && (
          <div className="space-y-2">
            {expanded && <div className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Settings</div>}
            <ul className="space-y-1">
              {masterNav.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={!expanded ? label : undefined}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        "group relative flex items-center rounded-xl transition-all duration-300 overflow-hidden",
                        expanded ? "px-4 py-3 gap-3" : "justify-center py-3 px-2",
                        isActive
                          ? "bg-gray-900 text-white shadow-md"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={[
                            "w-6 h-6 flex-shrink-0",
                            isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600",
                          ].join(" ")}
                        />
                        {expanded && (
                          <span className={`font-medium text-[15px] whitespace-nowrap tracking-wide ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Profile / Logout Section */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center'}`}>
          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 p-[2px] flex-shrink-0 shadow-sm">
            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-600 font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
          </div>

          {expanded && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-sm font-bold text-gray-900 truncate">
                {user?.name || "Admin User"}
              </div>
              <div className="text-xs text-gray-500 truncate capitalize">
                {userRole || "Administrator"}
              </div>
            </div>
          )}

          {expanded && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Log out"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Collapsed Logout fallback */}
        {!expanded && (
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Log out"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
