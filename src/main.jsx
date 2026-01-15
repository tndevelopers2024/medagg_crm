// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";

import { SocketProvider } from "./contexts/SocketProvider.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import LoginForm from "./pages/login/LoginPage.jsx";
import Dashboard from "./pages/admin/dashboard/page.jsx";
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
import CallerDashboard from "./pages/admin/caller/page.jsx";
import CallersDashboard from "./pages/caller/dashboard/page.jsx";
import CallerLayout from "./layout/CallerLayout.jsx";
import LeadsList from "./pages/caller/leadsList/page.jsx";
import LeadManagement from "./pages/caller/leadManagement/page.jsx";
import CreateLeadPage from "./pages/leads/CreateLeadPage.jsx";
import DuplicateManagementPage from "./pages/admin/duplicates/page.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SocketProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginForm />} />

          {/* Admin area wrapped by AdminLayout */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/search" element={<SearchLeadsPage />} />
            <Route path="/admin/leads" element={<AllLeads />} />
            <Route path="/admin/leads/create" element={<CreateLeadPage />} />
            <Route path="/admin/leads/:id" element={<LeadManagement />} />
            <Route path="/admin/campaigns" element={<CampaignsPage />} />
            <Route path="/admin/campaigns/:id/import" element={<ImportLeadsPage />} />
            <Route path="/admin/campaigns/import" element={<ImportLeadsPage />} />
            <Route path="/admin/duplicates" element={<DuplicateManagementPage />} />
            <Route path="/admin/bulk-upload" element={<BulkUploadPage />} />
            <Route path="/admin/callers" element={<Callers />} />
            <Route path="/admin/callers/:id" element={<CallerDashboard />} />
            <Route path="/admin/master" element={<MasterSettingsPage />} />
            <Route path="/admin/field-settings" element={<FieldSettingsPage />} />
            <Route path="/admin/booking-field-settings" element={<BookingFieldSettingsPage />} />
            <Route path="/admin/lead-stages" element={<LeadStagesPage />} />
          </Route>

          <Route element={<CallerLayout />}>
            <Route path="/caller/dashboard" element={<CallersDashboard />} />
            <Route path="/caller/leads" element={<LeadsList />} />
            <Route path="/caller/leads/create" element={<CreateLeadPage />} />
            <Route path="/caller/leads/:id" element={<LeadManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </StrictMode>
);
