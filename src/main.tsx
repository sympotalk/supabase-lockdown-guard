import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./styles/theme.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="sympohub_theme_mode" enableSystem={false}>
    <App />
  </ThemeProvider>
);
