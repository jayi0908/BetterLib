// App.tsx
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import SeatBooking from './pages/SeatBooking';
import RoomBooking from './pages/RoomBooking';

function App() {
  const hasToken = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* MainLayout 包含底部导航栏，内部使用 <Outlet /> 渲染子页面 */}
        <Route path="/" element={hasToken ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="seats" element={<SeatBooking />} />
          <Route path="rooms" element={<RoomBooking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;