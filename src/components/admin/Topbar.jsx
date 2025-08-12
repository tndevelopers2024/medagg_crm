// src/components/Topbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { getMe } from "../../utils/api";
import { useTopbarTitle } from "../../contexts/TopbarTitleContext";

export default function Topbar() {
  const { title, subtitle } = useTopbarTitle();

  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMe = async () => {
      setLoading(true);
      try {
        const res = await getMe();
        const u = res?.user || res?.data?.user || res?.data || res;
        if (u && mounted) {
          setUser(u);
          try { localStorage.setItem("user", JSON.stringify(u)); } catch {}
        }
      } catch {} finally {
        if (mounted) setLoading(false);
      }
    };
    const token = localStorage.getItem("token");
    if (token) fetchMe();
    return () => { mounted = false; };
  }, []);

  const name =
    (user && (user.name || user.fullName || user.username)) ||
    (loading ? "Loading..." : "User");

  const avatarSrc =
    user?.avatar ||
    user?.photo ||
    (user?.email
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}`
      : `https://i.pravatar.cc/32?u=${encodeURIComponent(name)}`);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="h-20 flex items-center justify-between px-3 md:px-6">
        {/* Left: Title + subtitle */}
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-[#3b2d53] leading-none">
            {title || "Admin"}
          </h1>
          {subtitle && (
            <p className="text-[14px] text-gray-500 truncate">
              {subtitle || `Welcome back, ${name}`}{title=="Admin Dashboard" ? ` ${user.name}` : ""}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
          style={{padding:6, borderRadius: "50%"}}
            className="relative inline-flex p-0 items-center justify-center rounded-full border border-[#e2deea] bg-white hover:bg-gray-50"
            aria-label="Notifications"
          >
            <FiBell className="text-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#6b5aa6]" />
          </button>
          <img
            src={avatarSrc}
            alt="User avatar"
            className="h-9 w-9 rounded-full ring-1 ring-[#e2deea] object-cover"
          />
        </div>
      </div>
    </header>
  );
}
