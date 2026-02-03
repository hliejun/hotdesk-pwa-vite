import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./store";
import Layout from "./screens/Layout";
import Home from "./screens/Home";
import Desks from "./screens/Desks";
import Bookings from "./screens/Bookings";
import Admin from "./screens/Admin";

const App = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route
              path="/search"
              element={<Navigate to="/bookings" replace />}
            />
            <Route path="/desks" element={<Desks />} />
            <Route path="/me" element={<Navigate to="/bookings" replace />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
