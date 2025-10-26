import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./styles/theme.css";
import "./index.css";

// Phase 3.10-A.FIX: Console Filter - Production mode only shows [SYS] logs
if (import.meta.env.MODE !== "development") {
  const originalLog = console.log;
  const originalInfo = console.info;
  
  console.log = (...args) => {
    if (typeof args[0] === "string" && args[0].startsWith("[SYS]")) {
      originalLog(...args);
    }
  };
  
  console.debug = () => {};
  console.info = () => {};
  
  // Keep warn and error for critical issues
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === "string" && (args[0].startsWith("[SYS]") || args[0].startsWith("⚠"))) {
      originalWarn(...args);
    }
  };
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="sympohub_theme_mode" enableSystem={false}>
    <App />
  </ThemeProvider>
);
