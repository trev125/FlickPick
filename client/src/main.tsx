import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AccentColorProvider } from "@/hooks/use-accent-color";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AccentColorProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AccentColorProvider>
    </ThemeProvider>
  </React.StrictMode>
);
