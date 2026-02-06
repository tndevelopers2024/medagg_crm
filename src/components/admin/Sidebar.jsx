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
import { clearUserData } from "../../utils/roleUtils";
import { fetchAllLeads, fetchAssignedLeads } from "../../utils/api";

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, isCaller, setUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [leadCount, setLeadCount] = React.useState(0);

  // Fallback role from localStorage
  const [localRole, setLocalRole] = React.useState(null);

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const role = parsedUser.data?.role || parsedUser.role;
        setLocalRole(role);
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
      }
    }
  }, []);

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
        const { count } = await fetchFn({ limit: 1 });
        if (mounted) setLeadCount(count || 0);
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

  const basePath = user?.role ? `/${user.role.toLowerCase()}` : (localRole ? `/${localRole.toLowerCase()}` : '/admin');

  const handleLogout = () => {
    clearUserData();
    setUser(null);
    navigate('/');
  };

  // Build menu items
  const menuItems = React.useMemo(() => {
    const items = [
      {
        key: `${basePath}/dashboard`,
        icon: <HomeOutlined />,
        label: "Dashboard",
      },
      {
        key: `${basePath}/search`,
        icon: <SearchOutlined />,
        label: "Search",
      },
      {
        key: `${basePath}/leads`,
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
      },
      {
        key: `${basePath}/leads/create`,
        icon: <PlusCircleOutlined />,
        label: "Create Lead",
      },
    ];

    if (effectiveIsAdmin) {
      items.push(
        {
          key: "/admin/campaigns",
          icon: <RocketOutlined />,
          label: "Campaigns",
        },
        {
          key: "/admin/campaigns/import",
          icon: <UploadOutlined />,
          label: "Bulk Upload",
        },
        {
          key: "/admin/callers",
          icon: <UserAddOutlined />,
          label: "Callers",
        },
        {
          key: "/admin/analytics",
          icon: <BarChartOutlined />,
          label: "Analytics",
        }
      );
    }

    items.push({
      key: `${basePath}/duplicates`,
      icon: <AppstoreOutlined />,
      label: "Duplicates",
    });

    return items;
  }, [basePath, effectiveIsAdmin, leadCount, collapsed]);

  const settingsItems = React.useMemo(
    () => effectiveIsAdmin ? [{
      key: "/admin/master",
      icon: <SettingOutlined />,
      label: "Master",
    }] : [],
    [effectiveIsAdmin]
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
            padding: collapsed ? "12px 8px" : "12px 16px",
            borderTop: "1px solid #f0f0f0",
            background: "#fafafa",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar
              size={36}
              style={{ backgroundColor: "#322554", fontWeight: 700, flexShrink: 0 }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </Avatar>

            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Text strong style={{ display: "block", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.name || "Admin User"}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, textTransform: "capitalize" }}>
                  {userRole || "Administrator"}
                </Text>
              </div>
            )}

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
