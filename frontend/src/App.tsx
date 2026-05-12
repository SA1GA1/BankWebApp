import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./store/session";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TransferPage from "./pages/TransferPage";
import MessengerPage from "./pages/MessengerPage";
import AppShell from "./components/AppShell";
import MobileAppShell from "./mobile/MobileAppShell";
import MobileLoginPage from "./mobile/pages/MobileLoginPage";
import MobileHomePage from "./mobile/pages/MobileHomePage";
import MobileTransferPage from "./mobile/pages/MobileTransferPage";
import MobileMessengerPage from "./mobile/pages/MobileMessengerPage";
import "./mobile/mobile.css";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useSession();
  return (
    <Routes>
      {/* Desktop routes */}
      <Route path="/desktop/login" element={<LoginPage />} />
      <Route
        path="/desktop/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="home" element={<HomePage />} />
        <Route path="transfer" element={<TransferPage />} />
        <Route path="messenger" element={<MessengerPage />} />
      </Route>
      
      {/* Mobile routes (default) */}
      <Route path="/login" element={<MobileLoginPage />} />
      <Route
        element={
          <RequireAuth>
            <MobileAppShell />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<MobileHomePage />} />
        <Route path="/transfer" element={<MobileTransferPage />} />
        <Route path="/messenger" element={<MobileMessengerPage />} />
      </Route>
      
      {/* Default redirect to mobile home */}
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
