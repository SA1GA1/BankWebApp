import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "./store/session";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TransferPage from "./pages/TransferPage";
import MessengerPage from "./pages/MessengerPage";
import AppShell from "./components/AppShell";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useSession();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/messenger" element={<MessengerPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
