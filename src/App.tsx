import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/admin/Dashboard";
import Events from "./pages/admin/Events";
import Participants from "./pages/admin/Participants";
import Rooming from "./pages/admin/Rooming";
import Messages from "./pages/admin/Messages";
import Forms from "./pages/admin/Forms";
import Account from "./pages/admin/Account";
import AdminSettings from "./pages/admin/Settings";
import AgencyProfile from "./pages/agency/Profile";
import AgencySettings from "./pages/agency/Settings";
import AgencyNotifications from "./pages/agency/Notifications";
import AgencySecurity from "./pages/agency/Security";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <AppDataProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/signup/:inviteId" element={<Signup />} />

            {/* Admin routes - Master only */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="master">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute requiredRole="master">
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/participants"
              element={
                <ProtectedRoute requiredRole="master">
                  <Participants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rooming"
              element={
                <ProtectedRoute requiredRole="master">
                  <Rooming />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute requiredRole="master">
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/forms"
              element={
                <ProtectedRoute requiredRole="master">
                  <Forms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/account"
              element={
                <ProtectedRoute requiredRole="master">
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requiredRole="master">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />

            {/* Agency routes - Staff, Admin, Agency Owner */}
            <Route
              path="/agency/profile"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin", "agency_owner"]}>
                  <AgencyProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/settings"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin", "agency_owner"]}>
                  <AgencySettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/notifications"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin", "agency_owner"]}>
                  <AgencyNotifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency/security"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin", "agency_owner"]}>
                  <AgencySecurity />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AppDataProvider>
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
