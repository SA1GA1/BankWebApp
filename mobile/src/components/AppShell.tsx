import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import MobileTopBar from "./MobileTopBar";
import DevRiskPanel from "./DevRiskPanel";

export default function AppShell() {
  return (
    <div className="iphone-frame">
      <div className="iphone-notch" />
      <div className="iphone-screen flex flex-col h-full">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>
        <BottomNav />
        <div className="iphone-home-indicator" />
      </div>
      <DevRiskPanel />
    </div>
  );
}
