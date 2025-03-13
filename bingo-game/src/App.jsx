import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import BingoGame from './pages/BingoGame'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play" element={<BingoGame />} />
    </Routes>
  )
}

export default App 