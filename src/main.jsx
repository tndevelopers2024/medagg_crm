// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { SocketProvider } from "./contexts/SocketProvider.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import LoginForm from "./pages/login/LoginPage.jsx";
import Dashboard from "./pages/admin/dashboard/page.jsx";
import AllLeads from "./pages/admin/allleads/page.jsx";
import Callers from "./pages/admin/callers/page.jsx";
import CallerDashboard from "./pages/admin/caller/page.jsx";
import CallersDashboard from "./pages/caller/dashboard/page.jsx";
import CallerLayout from "./layout/CallerLayout.jsx";
import LeadsList from "./pages/caller/leadsList/page.jsx";
import LeadManagement from "./pages/caller/leadManagement/page.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginForm />} />

          {/* Admin area wrapped by AdminLayout */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/leads" element={<AllLeads />} />
            <Route path="/admin/callers" element={<Callers />} />
            <Route path="/admin/callers/:id" element={<CallerDashboard />} />
          </Route>
          <Route element={<CallerLayout />}>
            <Route path="/caller/dashboard" element={<CallersDashboard />} />
            <Route path="/caller/leads" element={<LeadsList />} />
            <Route path="/caller/leads/:id" element={<LeadManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </StrictMode>
);
