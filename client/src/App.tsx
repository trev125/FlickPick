import { Routes, Route } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { ColorPicker } from "@/components/color-picker";
import Home from "./pages/Home";
import Session from "./pages/Session";
import Preferences from "./pages/Preferences";
import Results from "./pages/Results";
import Voting from "./pages/Voting";
import FinalResults from "./pages/FinalResults";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-1">
        <ColorPicker />
        <ThemeToggle />
      </div>
      <Routes>
        {/* Final results gets wider layout */}
        <Route path="/session/:code/final-results" element={
          <div className="mx-auto max-w-3xl px-4 py-8">
            <FinalResults />
          </div>
        } />
        {/* Other pages keep narrow layout */}
        <Route path="*" element={
          <div className="mx-auto max-w-md px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/session/:code" element={<Session />} />
              <Route path="/session/:code/preferences" element={<Preferences />} />
              <Route path="/session/:code/results" element={<Results />} />
              <Route path="/session/:code/voting" element={<Voting />} />
            </Routes>
          </div>
        } />
      </Routes>
    </div>
  );
}
