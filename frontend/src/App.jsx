import {
  Suspense,
  lazy,
} from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

import { useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import PageLoader from "./components/PageLoader.jsx";

const Dashboard = lazy(() =>
  import("./pages/Dashboard.jsx")
);

const Album = lazy(() =>
  import("./pages/Album.jsx")
);

const Matches = lazy(() =>
  import("./pages/Matches.jsx")
);

const Faltantes = lazy(() =>
  import("./pages/Faltantes.jsx")
);

const Repetidas = lazy(() =>
  import("./pages/Repetidas.jsx")
);

const Chat = lazy(() =>
  import("./pages/Chat.jsx")
);

const TradeCenter = lazy(() =>
  import("./pages/TradeCenter.jsx")
);

const Activity = lazy(() =>
  import("./pages/Activity.jsx")
);

const Profile = lazy(() =>
  import("./pages/Profile.jsx")
);

const ProfileEdit = lazy(() =>
  import("./pages/ProfileEdit.jsx")
);

function ProtectedRoute() {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return <PageLoader />;
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

function HomeRedirect() {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Navigate
      to={
        isAuthenticated
          ? "/dashboard"
          : "/login"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={<HomeRedirect />}
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

          <Route
            path="/actividad"
            element={<Activity />}
          />

          <Route
            path="/perfil"
            element={<Profile />}
          />

          <Route
            path="/perfil/editar"
            element={<ProfileEdit />}
          />
        </Route>

        <Route
          path="*"
          element={<HomeRedirect />}
        />
      </Routes>
    </Suspense>
  );
}
