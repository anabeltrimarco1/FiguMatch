import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Album from "./pages/Album.jsx";
import Matches from "./pages/Matches.jsx";
import Faltantes from "./pages/Faltantes.jsx";
import Repetidas from "./pages/Repetidas.jsx";
import Chat from "./pages/Chat.jsx";
import TradeCenter from "./pages/TradeCenter.jsx";

import { useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";

function ProtectedRoute() {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password/:token"
        element={<ResetPassword />}
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/album"
          element={<Album />}
        />

        <Route
          path="/matches"
          element={<Matches />}
        />

        <Route
          path="/faltantes"
          element={<Faltantes />}
        />

        <Route
          path="/repetidas"
          element={<Repetidas />}
        />

        <Route
          path="/chat"
          element={<Chat />}
        />

        <Route
          path="/intercambios"
          element={<TradeCenter />}
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}