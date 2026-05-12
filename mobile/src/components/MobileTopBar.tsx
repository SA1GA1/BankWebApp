import { useEffect, useState } from "react";
import { LogOut, Wifi, Battery, Signal } from "lucide-react";
import { useSession } from "../store/session";
import type { User } from "../types";

export default function MobileTopBar() {
  const { user } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
  };

  return (
    <div className="mobile-top-bar">
      {/* Status Bar */}
      <div className="mobile-status-bar">
        <div className="mobile-status-left">
          <span className="mobile-status-time">{formatTime(currentTime)}</span>
        </div>
        <div className="mobile-status-center">
          {/* Dynamic Island placeholder */}
          <div className="dynamic-island"></div>
        </div>
        <div className="mobile-status-right">
          <Signal size={16} />
          <Wifi size={16} />
          <Battery size={18} />
        </div>
      </div>

      {/* App Header */}
      <div className="mobile-app-header">
        <div className="mobile-app-title">
          <span style={{ fontWeight: '700', fontSize: '17px' }}>DemoBank</span>
        </div>
        {user && (
          <div className="mobile-user-info">
            <span className="mobile-user-name">{user.full_name.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
