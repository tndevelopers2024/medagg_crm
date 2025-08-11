// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { SocketProvider } from "./contexts/SocketProvider.jsx";
import AdminLayout from "./layout/AdminLayout.jsx";
import LoginForm from "./pages/login/LoginPage.jsx";
import Dashboard from "./pages/admin/dashboard/page.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginForm />} />

          {/* Admin area wrapped by AdminLayout */}
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  </StrictMode>
);
