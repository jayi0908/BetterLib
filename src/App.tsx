import './App.css';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import SeatBooking from './pages/SeatBooking';
import RoomBooking from './pages/RoomBooking';
import BookSearch from './pages/BookSearch';
import Settings from './pages/Settings';

// 新增：动态路由守卫，每次匹配路由时都会执行检查
const RequireAuth = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* 用守卫包裹需要登录的页面 */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="seats" element={<SeatBooking />} />
            <Route path="rooms" element={<RoomBooking />} />
            <Route path="books" element={<BookSearch />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;