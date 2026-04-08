import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NameModal } from "./components/NameModal.jsx";
import { Layout } from "./components/Layout.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import { Home } from "./pages/Home.jsx";
import { RockPaperScissors } from "./pages/RockPaperScissors.jsx";
import { TypingSpeedTest } from "./pages/TypingSpeedTest.jsx";
import { Wordle } from "./pages/Wordle.jsx";
import { TicTacToe } from "./pages/TicTacToe.jsx";
import { MemoryCards } from "./pages/MemoryCards.jsx";
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
            <Route path="games/wordle" element={<Wordle />} />
            <Route path="games/tic-tac-toe" element={<TicTacToe />} />
            <Route path="games/memory-cards" element={<MemoryCards />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PlayerProvider>
  );
}
