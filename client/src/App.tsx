import { Routes, Route } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { ColorPicker } from "@/components/color-picker";
import Home from "./pages/Home";
import Session from "./pages/Session";
import Preferences from "./pages/Preferences";
import Results from "./pages/Results";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <ColorPicker />
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-md px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/:code" element={<Session />} />
          <Route path="/session/:code/preferences" element={<Preferences />} />
          <Route path="/session/:code/results" element={<Results />} />
        </Routes>
      </div>
    </div>
  );
}
