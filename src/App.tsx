import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import Index from "./pages/Index";
import Dashboard from "./pages/admin/Dashboard";
import Events from "./pages/admin/Events";
import Participants from "./pages/admin/Participants";
import Rooming from "./pages/admin/Rooming";
import Messages from "./pages/admin/Messages";
import Forms from "./pages/admin/Forms";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/events" element={<Events />} />
          <Route path="/admin/participants" element={<Participants />} />
          <Route path="/admin/rooming" element={<Rooming />} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/forms" element={<Forms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
