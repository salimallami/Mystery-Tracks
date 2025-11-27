import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import LandingPage from './pages/LandingPage';
import Lobby from './pages/Lobby';
import './styles/index.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/lobby/:roomId" element={<Lobby />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
