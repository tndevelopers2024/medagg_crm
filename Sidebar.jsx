import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  FiHome,
  FiUser,
  FiFileText,
  FiSettings,
  FiBriefcase,
  FiClock,
  FiChevronDown,
  FiChevronRight,
  FiChevronLeft,
  FiPlusCircle,
  FiList,
  FiLogOut,
} from "react-icons/fi";
import logo from "../../../public/img/logo/logo1.png";
import logo1 from "../../../public/img/logo/logo2.png";

const Sidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Navigation data in JSON format
  const navItems = [
    {
      id: "request-quote",
      title: "Request Quote",
      path: "/app/request-quote",
      icon: FiPlusCircle,
    },
    {
      id: "my-quotations",
      title: "My Quotations",
      path: "/app/my-quotations",
      icon: FiFileText,
    },
    {
      id: "my-orders",
      title: "My Orders",
      path: "/app/my-orders",
      icon: FiBriefcase,
    },
    {
      id: "recent-updates",
      title: "Recent Updates",
      path: "/app/recent-updates",
      icon: FiClock,
    },
    {
      id: "my-profile",
      title: "My Profile",
      path: "/app/my-profile",
      icon: FiUser,
    },
    {
      id: "logout",
      title: "Logout",
      path: "/app/logout",
      icon: FiLogOut, // use the logout icon
    },
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const getIconColor = (itemId, isActive) => {
    if (isActive) return "text-white";
    if (hoveredItem === itemId) return "text-[#2990F1]";
    return "text-[#818181]";
  };

  return (
    <div
      className={`flex flex-col sticky top-0 h-screen bg-white border-r border-gray-200 shadow-sm ${
        sidebarOpen ? "w-64" : "w-20"
      } px-4 py-8 transition-all duration-300`}
    >
      {/* Logo and Toggle */}
      <div className="flex items-center justify-between mb-10 px-2">
        {sidebarOpen ? (
          <img
            src={logo}
            alt="Convertscanstocad"
            className="mx-auto w-auto h-20 object-contain"
          />
        ) : (
          <img
            src={logo1}
            alt="Convertscanstocad"
            className="mx-auto w-auto h-10 object-contain"
          />
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-[-12px] text-[#fff] p-1 rounded-full bg-[#2990F1] hover:bg-gray-100 hover:text-[#2990F1] transition-colors"
        >
          {sidebarOpen ? (
            <FiChevronLeft size={24} />
          ) : (
            <FiChevronRight size={24} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col space-y-2">
        {navItems.map((item) => (
          <div key={item.id}>
            {item.path ? (
              // Single menu item with link
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#2990F1] shadow-md"
                      : "hover:bg-[#2990F1]/10 hover:shadow-sm"
                  }`
                }
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {({ isActive }) => {
                  const Icon = item.icon;
                  return (
                    <>
                      <Icon
                        size={20}
                        className={`${getIconColor(
                          item.id,
                          isActive
                        )} transition-colors`}
                      />
                      {sidebarOpen && (
                        <span
                          className={`font-medium text-md ${
                            isActive
                              ? "text-white"
                              : "text-[#818181] hover:text-[#2990F1]"
                          }`}
                        >
                          {item.title}
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
            ) : (
              // Menu item with sub-items
              <>
                <button
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                    expandedMenus[item.id]
                      ? "bg-[#2990F1] shadow-md"
                      : "hover:bg-[#2990F1]/10 hover:shadow-sm"
                  }`}
                  onClick={() => toggleMenu(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = item.icon;
                      const isActive = expandedMenus[item.id];
                      return (
                        <Icon
                          size={20}
                          className={`${getIconColor(
                            item.id,
                            isActive
                          )} transition-colors`}
                        />
                      );
                    })()}
                    {sidebarOpen && (
                      <span
                        className={`font-medium text-sm ${
                          expandedMenus[item.id]
                            ? "text-white"
                            : "text-[#818181] hover:text-[#2990F1]"
                        }`}
                      >
                        {item.title}
                      </span>
                    )}
                  </div>
                  {sidebarOpen && item.subItems && (
                    <FiChevronDown
                      size={16}
                      className={`transition-all ${
                        expandedMenus[item.id]
                          ? "rotate-180 text-white"
                          : getIconColor(item.id, false)
                      }`}
                    />
                  )}
                </button>

                {sidebarOpen && expandedMenus[item.id] && item.subItems && (
                  <div className="ml-8 mt-2 space-y-2">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.id}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-4 py-2.5 rounded-lg text-md transition-colors ${
                            isActive
                              ? "bg-[#2990F1] shadow-md"
                              : "hover:bg-[#2990F1]/10 hover:shadow-sm"
                          }`
                        }
                        onMouseEnter={() => setHoveredItem(subItem.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {({ isActive }) => {
                          const SubIcon = subItem.icon;
                          return (
                            <>
                              <SubIcon
                                size={16}
                                className={`${getIconColor(
                                  subItem.id,
                                  isActive
                                )} transition-colors`}
                              />
                              <span
                                className={`transition-colors ${
                                  isActive
                                    ? "text-white"
                                    : "text-[#818181] hover:text-[#2990F1]"
                                }`}
                              >
                                {subItem.title}
                              </span>
                            </>
                          );
                        }}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom spacer */}
      <div className="mt-auto"></div>
    </div>
  );
};

export default Sidebar;
