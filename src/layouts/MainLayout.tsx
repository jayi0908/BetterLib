import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Armchair, LibraryBig, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('加载中...');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/user')
      .then(res => setUserName(res.data || '未知用户'))
      .catch(() => setUserName('未连接'));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('zju_username');
    localStorage.removeItem('zju_password');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '首页', icon: <Home size={20} className="md:w-4.5 md:h-4.5" /> },
    { path: '/seats', label: '座位预约', icon: <Armchair size={20} className="md:w-4.5 md:h-4.5" /> },
    { path: '/rooms', label: '空间预约', icon: <LibraryBig size={20} className="md:w-4.5 md:h-4.5" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0E0F11] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
      
      {/* 移动端：顶部信息栏 (增加顶部安全区域 pt 和动态高度) */}
      <header 
        className="md:hidden border-b border-[#222326] bg-[#151618] flex items-center justify-between px-4 z-20 shrink-0 pt-[env(safe-area-inset-top)] pb-1"
        style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
            {userName.charAt(0)}
          </div>
          <span className="font-medium text-sm text-[#EAEAEA]">{userName}</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-[#A0A0A0] hover:text-[#F87171] transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      {/* PC端：极简侧边栏 */}
      <aside className="hidden md:flex w-60 bg-[#151618] border-r border-[#222326] flex-col z-20 shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-[#222326] relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-[#222326] transition-colors group"
          >
            <div className="flex items-center overflow-hidden">
              <div className="w-6 h-6 rounded bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0">
                {userName.charAt(0)}
              </div>
              <span className="font-medium text-sm truncate text-[#EAEAEA] group-hover:text-white transition-colors">
                {userName}
              </span>
            </div>
            <ChevronDown size={14} className="text-[#666666] group-hover:text-[#A0A0A0] transition-colors" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-12 left-4 w-52 bg-[#1C1D21] border border-[#2B2D31] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[#2B2D31] mb-1">
                <p className="text-xs text-[#888888] font-medium">当前账号</p>
                <p className="text-sm text-[#EAEAEA] truncate">{userName}</p>
              </div>
              <button className="flex items-center w-full px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-[#2B2D31] transition-colors">
                <Settings size={16} className="mr-2.5" /> 偏好设置
              </button>
              <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm text-[#F87171] hover:bg-[#3F1D1D]/50 transition-colors">
                <LogOut size={16} className="mr-2.5" /> 退出登录
              </button>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-2 text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-2">Workspace</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center px-2 py-1.5 rounded-md transition-all duration-150 text-sm ${isActive ? 'bg-[#2B2D31] text-white font-medium' : 'text-[#888888] hover:bg-[#222326] hover:text-[#CCCCCC]'}`}>
                <span className="mr-2.5 opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 主内容区 (移动端增加动态 pb，防止内容被底部导航栏和安全区遮挡) */}
      <main className="flex-1 overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* 移动端：底部导航栏 (增加底部安全区域 pb 和动态高度) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 w-full bg-[#151618] border-t border-[#222326] flex justify-around items-center z-50 pt-2 pb-[env(safe-area-inset-bottom)]"
        style={{ height: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
    </div>
  );
}