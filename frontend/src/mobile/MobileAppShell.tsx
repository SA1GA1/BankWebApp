import { Outlet, Navigate } from "react-router-dom";
import { useSession } from "../store/session";
import MobileTopBar from "./MobileTopBar";
import MobileTabBar from "./MobileTabBar";

export default function MobileAppShell() {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="mobile-phone-wrapper">
      {/* iPhone Frame */}
      <div className="iphone-frame">
        {/* Dynamic Island / Notch */}
        <div className="dynamic-island"></div>
        
        {/* Phone Screen Content */}
        <div className="phone-screen">
          <MobileTopBar />
          <main className="phone-content">
            <Outlet />
          </main>
          <MobileTabBar />
        </div>
        
        {/* Physical bezel/frame styling */}
        <div className="iphone-bezel"></div>
      </div>
    </div>
  );
}
