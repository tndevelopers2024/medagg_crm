// MedCRMLogin.jsx
import React, { useState } from "react";
import { login } from "../../utils/api";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function MedCRMLogin({
  onSuccess,
  redirectTo,
  router,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email");
      return false;
    }
    if (!password) {
      toast.error("Password is required");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(email, password);

      // Extract user data - handle nested structure
      const userData = data?.data || data?.user || data;
      const token = data?.token;

      // Persist token/user if "Remember me" is checked
      if (token && remember) {
        localStorage.setItem("token", token);
        if (userData) {
          localStorage.setItem("user", JSON.stringify(userData));
          // Store role name separately for easy access
          const rawRole = userData.role || data?.role;
          const roleName = rawRole && typeof rawRole === "object" ? rawRole.name : rawRole;
          if (roleName) {
            localStorage.setItem("role", String(roleName).toLowerCase());
          }
        }
      }

      toast.success("Login successful!");

      if (typeof onSuccess === "function") onSuccess(data);

      // ---- Role-based redirect ----
      const rawRole = userData?.role || data?.role;
      const role = rawRole && typeof rawRole === "object"
        ? (rawRole.name || "").toLowerCase()
        : String(rawRole || "").toLowerCase();

      // Determine destination based on role and permissions
      let destination;

      if (role === "caller") {
        // Callers get their own dashboard
        destination = "/caller-dashboard";
      } else {
        // Check if user is system admin (Admin role with isSystem flag)
        const roleObj = rawRole && typeof rawRole === "object" ? rawRole : null;
        const isSystemAdmin = !!(roleObj?.isSystem && role === "admin");
        const hasDashboardPermission = roleObj?.permissions?.includes("dashboard.dashboard.view");

        // System admins or users with dashboard permission go to dashboard
        destination = (isSystemAdmin || hasDashboardPermission) ? "/dashboard" : (redirectTo || "/");
      }

      // Small delay to let the toast be seen before redirect
      setTimeout(() => {
        if (router?.push) router.push(destination);
        else window.location.assign(destination);
      }, 800);
      // -----------------------------

    } catch (error) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center place-content-center py-8 px-4">
      <div className="mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Left gradient panel */}
          <section className="relative col-span-2 overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-[#3a77ff] via-[#8c3ed8] to-[#ff2e6e] shadow-[0_10px_30px_rgba(48,22,80,0.25)]">
            <div className="flex items-center gap-3">
              <img src='/img/logo.png' alt="MedCRM" className=" w-auto" />
            </div>

            <div className=" flex justify-center px-4 my-6">
              <img
                src="/img/login/banner.png"
                alt="Dashboard preview"
                className="w-[80%] max-w-[560px] rounded-2xl shadow-2xl"
              />
            </div>

            <div className="text-center">
              <h3 className="text-white text-xl lg:text-2xl font-semibold">
                Your Pipeline. Your Performance
              </h3>
              <p className="text-white/85 mt-2 max-w-xl">
                Stay on top of every lead with real-time updates, smart reminders, and zero confusion.
              </p>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_-10%_-10%,rgba(255,255,255,.18),transparent)]" />
          </section>

          {/* Right auth card */}
          <section className="rounded-3xl col-span-2  py-10 px-6 md:px-10  flex items-center">
            <div className="w-full">
              <header className="mb-8 text-center">
                <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-[#3b0d66]">
                  Login to Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  Login to access your MedCRM account
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="mb-1 block text-sm text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-gray-300 focus:border-[#8c3ed8] focus:ring-4 focus:ring-[#8c3ed8]/15 px-3.5 py-3 text-[15px] outline-none"
                    placeholder="you@company.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-sm text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-gray-300 focus:border-[#8c3ed8] focus:ring-4 focus:ring-[#8c3ed8]/15 px-3.5 py-3 pr-10 text-[15px] outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Options row */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#8c3ed8] focus:ring-[#8c3ed8]"
                    />
                    Remember me
                  </label>
                  <a href="/forgot-password" className="text-sm text-[#ff3f7a] hover:underline">
                    Forgot Password
                  </a>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#ff2e6e] to-[#ff5aa4] py-3 text-white font-semibold shadow-md hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                {/* Meta row */}
                <p className="text-center text-sm text-gray-500">
                  Don’t have an account?{" "}
                  <a href="/register" className="text-[#8c3ed8] hover:underline">
                    Sign up
                  </a>
                </p>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
