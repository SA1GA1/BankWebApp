import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./store/session";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TransferPage from "./pages/TransferPage";
import MessengerPage from "./pages/MessengerPage";
import DevRiskPanel from "./components/DevRiskPanel";
import TopBar from "./components/TopBar";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useSession();
  return (
    <div className="min-h-full flex flex-col">
      {user && <TopBar />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/transfer"
            element={
              <RequireAuth>
                <TransferPage />
              </RequireAuth>
            }
          />
          <Route
            path="/messenger"
            element={
              <RequireAuth>
                <MessengerPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
        </Routes>
      </main>
      {user && <DevRiskPanel />}
    </div>
  );
}
