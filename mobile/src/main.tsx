import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider } from "./store/session";
import MobileLoginPage from "./pages/MobileLoginPage";
import MobileAppShell from "./components/MobileAppShell";
import MobileHomePage from "./pages/MobileHomePage";
import MobileTransferPage from "./pages/MobileTransferPage";
import MobileMessengerPage from "./pages/MobileMessengerPage";
import "./index.css";

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<MobileLoginPage />} />
          <Route
            element={
              <MobileAppShell />
            }
          >
            <Route path="/home" element={<MobileHomePage />} />
            <Route path="/transfer" element={<MobileTransferPage />} />
            <Route path="/messenger" element={<MobileMessengerPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
