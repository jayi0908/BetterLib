import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Armchair, LibraryBig, LogOut, Settings, ChevronDown, MoreVertical, BookOpen, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('加载中...');
  
  // 菜单状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // 预约规则弹窗状态
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [rulesData, setRulesData] = useState({ seat: '', discussion: '' });
  const [activeRuleTab, setActiveRuleTab] = useState<'seat' | 'discussion'>('seat');
  const [loadingRules, setLoadingRules] = useState(false);

  useEffect(() => {
    api.get('/user')
      .then(res => setUserName(res.data || '未知用户'))
      .catch(() => setUserName('未连接'));
  }, []);

  // 全局点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
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

  const openRules = async () => {
    setIsRulesOpen(true);
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    if (!rulesData.seat) {
      setLoadingRules(true);
      try {
        const res = await api.get('/rules');
        if (res.data) setRulesData({ seat: res.data.seat, discussion: res.data.discussion });
      } catch (e) {} finally {
        setLoadingRules(false);
      }
    }
  };

  const navItems = [
    { path: '/', label: '首页', icon: <Home size={20} className="md:w-4.5 md:h-4.5" /> },
    { path: '/seats', label: '座位预约', icon: <Armchair size={20} className="md:w-4.5 md:h-4.5" /> },
    { path: '/rooms', label: '空间预约', icon: <LibraryBig size={20} className="md:w-4.5 md:h-4.5" /> },
    { path: '/books', label: '书目检索', icon: <BookOpen size={20} className="md:w-4.5 md:h-4.5" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0E0F11] text-[#E0E0E0] font-sans selection:bg-blue-500/30">
      <style>{'.html-content-wrapper * { font-family: inherit !important; color: #CCCCCC !important; background-color: transparent !important; }'}</style>

      {/* ================= 移动端：顶部信息栏 ================= */}
      <header className="md:hidden border-b border-[#222326] bg-[#151618] flex items-center justify-between px-4 z-60 shrink-0 pt-[env(safe-area-inset-top)] pb-1" style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
            {userName.charAt(0)}
          </div>
          <span className="font-medium text-sm text-[#EAEAEA]">{userName}</span>
        </div>
        
        {/* 移动端右上角菜单 */}
        <div className="relative" ref={mobileMenuRef}>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#A0A0A0] hover:text-[#EAEAEA] transition-colors">
            <MoreVertical size={18} />
          </button>
          
          {isMobileMenuOpen && (
            <div className="absolute top-10 right-0 w-40 bg-[#1C1D21] border border-[#2B2D31] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={() => { setIsMobileMenuOpen(false); navigate('/settings'); }} className="flex items-center w-full px-3 py-3 text-sm text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-[#2B2D31] transition-colors border-b border-[#2B2D31]/50">
                <Settings size={16} className="mr-2.5" /> 偏好设置
              </button>
              <button onClick={openRules} className="flex items-center w-full px-3 py-3 text-sm text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-[#2B2D31] transition-colors border-b border-[#2B2D31]/50">
                <BookOpen size={16} className="mr-2.5" /> 预约规则
              </button>
              <button onClick={handleLogout} className="flex items-center w-full px-3 py-3 text-sm text-[#F87171] hover:bg-[#3F1D1D]/50 transition-colors">
                <LogOut size={16} className="mr-2.5" /> 退出登录
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= PC端：极简侧边栏 ================= */}
      <aside className="hidden md:flex w-60 bg-[#151618] border-r border-[#222326] flex-col z-20 shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-[#222326] relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-[#222326] transition-colors group">
            <div className="flex items-center overflow-hidden">
              <div className="w-6 h-6 rounded bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0">{userName.charAt(0)}</div>
              <span className="font-medium text-sm truncate text-[#EAEAEA] group-hover:text-white transition-colors">{userName}</span>
            </div>
            <ChevronDown size={14} className="text-[#666666] group-hover:text-[#A0A0A0] transition-colors" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-12 left-4 w-52 bg-[#1C1D21] border border-[#2B2D31] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[#2B2D31]/50 mb-1">
                <p className="text-xs text-[#888888] font-medium">当前账号</p>
                <p className="text-sm text-[#EAEAEA] truncate">{userName}</p>
              </div>
              <button onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }} className="flex items-center w-full px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-[#2B2D31] transition-colors">
                <Settings size={16} className="mr-2.5" /> 偏好设置
              </button>
              <button onClick={openRules} className="flex items-center w-full px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#EAEAEA] hover:bg-[#2B2D31] transition-colors">
                <BookOpen size={16} className="mr-2.5" /> 预约规则
              </button>
              <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm text-[#F87171] hover:bg-[#3F1D1D]/50 transition-colors mt-1 border-t border-[#2B2D31]/50 pt-2">
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

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#151618] border-t border-[#222326] flex justify-around items-center z-50 pt-2 pb-[env(safe-area-inset-bottom)]" style={{ height: 'calc(4rem + env(safe-area-inset-bottom))' }}>
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
      
      {/* ================= 全局弹窗：预约规则 ================= */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-6 animate-in fade-in duration-200">
          <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-[#222326] shrink-0 bg-[#1C1D21]">
              <h3 className="text-base lg:text-lg font-bold text-[#EAEAEA]">场馆预约规则</h3>
              <button onClick={() => setIsRulesOpen(false)} className="p-1.5 rounded-lg text-[#888888] hover:text-[#F87171] hover:bg-[#3F1D1D]/50 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex px-6 pt-4 space-x-6 border-b border-[#222326] shrink-0 bg-[#111214]">
                <button onClick={() => setActiveRuleTab('seat')} className={`pb-3 text-sm font-medium transition-colors relative ${activeRuleTab === 'seat' ? 'text-blue-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}>
                    座位预约
                    {activeRuleTab === 'seat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
                </button>
                <button onClick={() => setActiveRuleTab('discussion')} className={`pb-3 text-sm font-medium transition-colors relative ${activeRuleTab === 'discussion' ? 'text-blue-400' : 'text-[#888888] hover:text-[#CCCCCC]'}`}>
                    研讨室预约
                    {activeRuleTab === 'discussion' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
                </button>
            </div>

            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#111214] touch-pan-y min-h-0">
              {loadingRules ? (
                  <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                  <div className="text-[#CCCCCC] text-sm leading-loose html-content-wrapper space-y-4" dangerouslySetInnerHTML={{ __html: rulesData[activeRuleTab] || '<p>暂无规则内容</p>' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}