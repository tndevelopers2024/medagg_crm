// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ConfigProvider } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./hooks/queries/queryClient.js";
import "./index.css";

import { SocketProvider } from "./contexts/SocketProvider.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import LoginForm from "./pages/login/LoginPage.jsx";
import Dashboard from "./pages/admin/dashboard/page.jsx";
import CallerDashboard from "./pages/caller/dashboard/page.jsx";
import AllLeads from "./pages/admin/allleads/page.jsx";
import SearchLeadsPage from "./pages/admin/searchLeads/page.jsx";
import CampaignsPage from "./pages/admin/campaigns/page.jsx";
import ImportLeadsPage from "./pages/admin/campaigns/import/page.jsx";
import BulkUploadPage from "./pages/admin/bulkUpload/page.jsx";
import FieldSettingsPage from "./pages/admin/fieldSettings/page.jsx";
import BookingFieldSettingsPage from "./pages/admin/bookingFieldSettings/page.jsx";
import LeadStagesPage from "./pages/admin/leadStages/page.jsx";
import MasterSettingsPage from "./pages/admin/masterSettings/page.jsx";
import Callers from "./pages/admin/callers/page.jsx";
import Teams from "./pages/admin/teams/page.jsx";
import AdminCallerView from "./pages/admin/caller/page.jsx";
import LeadManagement from "./pages/caller/leadManagement/page.jsx";
import CreateLeadPage from "./pages/leads/CreateLeadPage.jsx";
import DuplicateManagementPage from "./pages/admin/duplicates/page.jsx";
import AnalyticsPage from "./pages/admin/analytics/page.jsx";
import AdminReportsPage from "./pages/admin/reports/page.jsx";
import AlarmsPage from "./pages/caller/alarms/page.jsx";
import RoleFormPage from "./pages/admin/roles/form.jsx";

const antTheme = {
  token: {
    colorPrimary: "#322554",
    colorLink: "#E9296A",
    borderRadius: 12,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  components: {
    Tabs: { inkBarColor: "#7c3aed", itemSelectedColor: "#7c3aed", itemHoverColor: "#6d28d9" },
    Card: { paddingLG: 20 },
    Rate: { colorFillContent: "#000000" },
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>
        <SocketProvider>
          <AuthProvider>
            <Toaster position="top-right" reverseOrder={false} />
            <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LoginForm />} />

              {/* Unified layout for all authenticated users */}
              <Route element={<AdminLayout />}>
                {/* Dashboard - role-based component selection */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/caller-dashboard" element={<CallerDashboard />} />

                {/* Lead Management */}
                <Route path="/search" element={<SearchLeadsPage />} />
                <Route path="/leads" element={<AllLeads />} />
                <Route path="/leads/create" element={<CreateLeadPage />} />
                <Route path="/leads/:id" element={<LeadManagement />} />
                <Route path="/duplicates" element={<DuplicateManagementPage />} />

                {/* Campaigns */}
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id/import" element={<ImportLeadsPage />} />
                <Route path="/campaigns/import" element={<ImportLeadsPage />} />
                <Route path="/bulk-upload" element={<BulkUploadPage />} />

                {/* Users/Callers */}
                <Route path="/callers" element={<Callers />} />
                <Route path="/admin/teams" element={<Teams />} />
                <Route path="/callers/:id" element={<AdminCallerView />} />

                {/* Settings */}
                <Route path="/master" element={<MasterSettingsPage />} />
                <Route path="/field-settings" element={<FieldSettingsPage />} />
                <Route path="/booking-field-settings" element={<BookingFieldSettingsPage />} />
                <Route path="/lead-stages" element={<LeadStagesPage />} />
                <Route path="/roles/create" element={<RoleFormPage />} />
                <Route path="/roles/:id" element={<RoleFormPage />} />

                {/* Analytics & Reports */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/reports/:callerId" element={<AdminReportsPage />} />

                {/* Alarms */}
                <Route path="/alarms" element={<AlarmsPage />} />
              </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </SocketProvider>
      </ConfigProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
