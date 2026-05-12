import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import DevRiskPanel from "./DevRiskPanel";

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-bank-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <DevRiskPanel />
    </div>
  );
}
