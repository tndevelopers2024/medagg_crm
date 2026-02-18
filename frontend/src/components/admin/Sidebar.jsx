import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Badge, Typography, Button, Tooltip } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  SearchOutlined,
  BarChartOutlined,
  PlusCircleOutlined,
  UploadOutlined,
  RocketOutlined,
  UserAddOutlined,
  AppstoreOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";
import { clearUserData, getRoleName } from "../../utils/roleUtils";
import { fetchAllLeads, fetchAssignedLeads } from "../../utils/api";
import HelpRequestBadge from "../HelpRequestBadge";
import useHelpRequests from "../../pages/caller/leadManagement/hooks/useHelpRequests";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, isCaller, setUser, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(true);
  const [leadCount, setLeadCount] = React.useState(0);

  // Fallback role from localStorage
  const [localRole, setLocalRole] = React.useState(null);

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const role = parsedUser.data?.role || parsedUser.role;
        setLocalRole(getRoleName(role));
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }
  }, []);

  const currentUser = user?.data || user;
  const userRole = getRoleName(currentUser?.role) || localRole;
  const effectiveIsAdmin = Boolean(
    isAdmin ||
    (userRole && ["admin", "superadmin", "owner", "administrator"].includes(userRole))
  );
  const effectiveIsCaller = Boolean(
    isCaller ||
    (userRole && userRole === "caller")
  );

  // Fetch lead count
  React.useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const fetchFn = effectiveIsCaller ? fetchAssignedLeads : fetchAllLeads;
        const response = await fetchFn({ limit: 1 });
        const total = response?.total || response?.count || 0;
        if (mounted) setLeadCount(total);
      } catch (error) {
        console.error("Error fetching lead count:", error);
      }
    };

    if (userRole) {
      fetchCount();
      const interval = setInterval(fetchCount, 30000);
      return () => { mounted = false; clearInterval(interval); };
    }
    return () => { mounted = false; };
  }, [userRole, effectiveIsCaller]);

  // Help requests (for callers)
  const { incoming: helpIncoming, respond: helpRespond, loading: helpLoading } = useHelpRequests();

  // No longer need basePath since we're using clean URLs

  const handleLogout = () => {
    clearUserData();
    setUser(null);
    navigate('/');
  };

  // Build menu items — filtered by permission
  const menuItems = React.useMemo(() => {
    const allItems = [
      {
        key: effectiveIsCaller ? "/caller-dashboard" : "/dashboard",
        icon: <HomeOutlined />,
        label: "Dashboard",
        permission: ["dashboard.dashboard.view", "dashboard.dashboard.viewAssigned"],
      },
      {
        key: "/search",
        icon: <SearchOutlined />,
        label: "Search",
        permission: "leads.search.view",
      },
      {
        key: "/leads",
        icon: <TeamOutlined />,
        label: (
          <span className="flex items-center justify-between w-full">
            Leads
            {leadCount > 0 && !collapsed && (
              <Badge
                count={leadCount > 99 ? "99+" : leadCount}
                size="small"
                style={{ backgroundColor: "#E9296A" }}
              />
            )}
          </span>
        ),
        permission: ["leads.all.view", "leads.assigned.view", "leads.team.view"],
      },
      {
        key: "/leads/create",
        icon: <PlusCircleOutlined />,
        label: "Create Lead",
        permission: "leads.all.create",
      },
      {
        key: "/campaigns",
        icon: <RocketOutlined />,
        label: "Campaigns",
        permission: "campaigns.campaigns.view",
      },
      {
        key: "/campaigns/import",
        icon: <UploadOutlined />,
        label: "Bulk Upload",
        permission: "campaigns.import.view",
      },
      {
        key: "/callers",
        icon: <UserAddOutlined />,
        label: "Users",
        permission: ["callers.callers.view", "callers.team.view"],
      },
      {
        key: "/admin/teams",
        icon: <TeamOutlined />,
        label: "Teams",
        permission: "teams.teams.view",
      },
      {
        key: "/duplicates",
        icon: <AppstoreOutlined />,
        label: "Duplicates",
        permission: "leads.duplicates.view",
      },
    ];

    return allItems.filter((item) => {
      if (Array.isArray(item.permission)) {
        return item.permission.some(p => hasPermission(p));
      }
      return hasPermission(item.permission);
    });
  }, [effectiveIsAdmin, effectiveIsCaller, leadCount, collapsed, hasPermission]);

  const settingsItems = React.useMemo(
    () => {
      const hasAnySettings = [
        "settings.fieldSettings.view",
        "settings.bookingFields.view",
        "settings.leadStages.view",
        "roles.roles.view",
      ].some(hasPermission);

      return hasAnySettings ? [{
        key: "/master",
        icon: <SettingOutlined />,
        label: "Master",
      }] : [];
    },
    [hasPermission]
  );

  // Determine selected key from current path
  const selectedKey = React.useMemo(() => {
    const path = location.pathname;
    // Find exact match first
    const allKeys = [...menuItems, ...settingsItems].map(i => i.key);
    const exact = allKeys.find(k => path === k);
    if (exact) return exact;
    // Find prefix match (longest first)
    const sorted = [...allKeys].sort((a, b) => b.length - a.length);
    return sorted.find(k => path.startsWith(k)) || "";
  }, [location.pathname, menuItems, settingsItems]);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (onClose) onClose();
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={260}
      collapsedWidth={80}
      theme="light"
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid #f0f0f0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      trigger={null}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo */}
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 24px" : "0 20px",
            gap: 12,
            borderBottom: "1px solid #f5f5f5",
            flexShrink: 0,
          }}
        >
          <img src="/img/favlogo.svg" alt="Logo" style={{ height: 36, width: 36, flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a2e", lineHeight: 1.2 }}>
                MedAgg
              </div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#999", fontWeight: 600 }}>
                Admin Console
              </div>
            </div>
          )}
        </div>

        {/* Main Menu */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {!collapsed && (
            <div style={{ padding: "16px 24px 4px", fontSize: 11, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Menu
            </div>
          )}
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ border: "none", marginTop: collapsed ? 12 : 0 }}
          />

          {settingsItems.length > 0 && (
            <>
              {!collapsed && (
                <div style={{ padding: "20px 24px 4px", fontSize: 11, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Settings
                </div>
              )}
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={settingsItems}
                onClick={handleMenuClick}
                style={{ border: "none" }}
              />
            </>
          )}
        </div>

        {/* Collapse Toggle */}
        <div style={{ padding: "8px 12px", borderTop: "1px solid #f5f5f5", flexShrink: 0 }}>
          <Button
            type="text"
            block
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: "#999" }}
          >
            {collapsed ? "»" : "« Collapse"}
          </Button>
        </div>

        {/* Profile / Logout */}
        <div
          style={{
            padding: collapsed ? "12px 4px" : "12px 16px",
            borderTop: "1px solid #f0f0f0",
            background: "#fafafa",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 12 : 10,
            flexDirection: collapsed ? "column" : "row",
            justifyContent: collapsed ? "center" : "flex-start"
          }}>
            <Avatar
              size={collapsed ? 32 : 36}
              style={{ backgroundColor: "#322554", fontWeight: 700, flexShrink: 0 }}
            >
              {(currentUser?.name?.[0] || userRole?.[0] || "U").toUpperCase()}
            </Avatar>

            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Text strong style={{ display: "block", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser?.name || "Admin User"}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, textTransform: "capitalize" }}>
                  {userRole || "Administrator"}
                </Text>
              </div>
            )}

            <HelpRequestBadge
              incoming={helpIncoming}
              onRespond={helpRespond}
              loading={helpLoading}
            />

            <Tooltip title="Log out" placement={collapsed ? "right" : "top"}>
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                size="small"
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </Sider>
  );
}
