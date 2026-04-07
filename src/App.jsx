import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NameModal } from "./components/NameModal.jsx";
import { Layout } from "./components/Layout.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import { Home } from "./pages/Home.jsx";
import { RockPaperScissors } from "./pages/RockPaperScissors.jsx";
import { TypingSpeedTest } from "./pages/TypingSpeedTest.jsx";
import "./App.css";

export default function App() {
  return (
    <PlayerProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <NameModal />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="games/rock-paper-scissors" element={<RockPaperScissors />} />
            <Route path="games/typing-speed" element={<TypingSpeedTest />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PlayerProvider>
  );
}
