import { useAuth } from "../../contexts/AuthContext";
import { useTopbarTitle } from "../../contexts/TopbarTitleContext";
import AlarmBadge from "../AlarmBadge";

export default function Topbar() {
  const { title, subtitle } = useTopbarTitle();
  const { user } = useAuth();

  const currentUser = user?.data || user;

  const name =
    currentUser?.name ||
    currentUser?.fullName ||
    currentUser?.username ||
    "User";

  const avatarSrc =
    currentUser?.avatar ||
    currentUser?.photo ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      currentUser?.email || name
    )}`;

  return (
    <header className=" z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="h-20 flex items-center justify-between px-3 md:px-6">
        {/* Left: Title + subtitle */}
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-[#3b2d53] leading-none">
            {title || "Admin"}
          </h1>
          {subtitle && (
            <p className="text-[14px] text-gray-500 truncate">
              {subtitle} {title?.includes("Dashboard") ? name : ""}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          <AlarmBadge />
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
