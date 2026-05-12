import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../store/session";
import MobileTopBar from "./MobileTopBar";
import MobileTabBar from "./MobileTabBar";

export default function MobileAppShell() {
  const { user } = useSession();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mobile-app-container">
      <MobileTopBar />
      <div className="mobile-content">
        <Outlet />
      </div>
      <MobileTabBar currentPath={location.pathname} />
    </div>
  );
}
