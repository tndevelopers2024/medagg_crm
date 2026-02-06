// src/layout/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Layout, Drawer } from "antd";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import { TopbarTitleProvider } from "../contexts/TopbarTitleContext";

const { Content } = Layout;

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TopbarTitleProvider>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar open onClose={() => {}} />
        </div>

        {/* Mobile sidebar (Ant Drawer) */}
        <Drawer
          placement="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          width={260}
          styles={{ body: { padding: 0 } }}
          className="lg:hidden"
          closable={false}
        >
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Drawer>

        {/* Main area */}
        <Layout style={{ background: "#f6f3f8" }}>
          <Topbar onMenu={() => setSidebarOpen(true)} />
          <Content style={{ padding: "16px", minHeight: "auto" }} className="md:p-6 lg:p-8">
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </TopbarTitleProvider>
  );
}
