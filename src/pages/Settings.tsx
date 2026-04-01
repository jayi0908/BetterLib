import { ArrowLeft, Bell, Moon, Shield, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  // 控制滑动动画的状态
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // 组件挂载后，延迟 10ms 触发滑入动画，给浏览器渲染初始位置的时间
    const timer = setTimeout(() => setIsMobileOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    // 先触发滑出动画
    setIsMobileOpen(false);
    // 等待动画完成(300ms)后再执行路由退回
    setTimeout(() => navigate(-1), 100);
  };

  return (
    // 使用绝对定位和 transform 过渡动画
    <div className={`
      absolute inset-0 z-50 flex flex-col bg-[#0E0F11] text-[#EAEAEA]
      transition-transform duration-300 ease-out
      ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
    `}>
      {/* 顶部标题栏 */}
      <div className="h-14 flex items-center px-4 lg:px-6 border-b border-[#222326] bg-[#0E0F11]/80 backdrop-blur-md shrink-0">
        <button 
          onClick={handleBack} 
          className="p-1.5 mr-3 rounded-lg bg-[#1C1D21] border border-[#2B2D31] text-[#A0A0A0] hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-sm font-semibold tracking-wide">偏好设置</h2>
      </div>

      {/* 设置列表 */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#222326] flex items-center justify-between hover:bg-[#1C1D21]/50 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg mr-4"><Bell size={18} /></div>
                <div>
                  <p className="text-sm font-medium">推送通知</p>
                  <p className="text-[10px] lg:text-xs text-[#888888] mt-0.5">接收预约即将开始、过期的提醒</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>

            <div className="p-4 border-b border-[#222326] flex items-center justify-between hover:bg-[#1C1D21]/50 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg mr-4"><Moon size={18} /></div>
                <div>
                  <p className="text-sm font-medium">深色模式</p>
                  <p className="text-[10px] lg:text-xs text-[#888888] mt-0.5">始终保持极夜黑主题</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-[#1C1D21]/50 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg mr-4"><Smartphone size={18} /></div>
                <div>
                  <p className="text-sm font-medium">自动无感登录</p>
                  <p className="text-[10px] lg:text-xs text-[#888888] mt-0.5">令牌失效时自动在后台静默刷新</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>

          <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1C1D21] transition-colors group">
              <div className="flex items-center">
                <div className="p-2 bg-red-500/10 text-red-400 rounded-lg mr-4"><Shield size={18} /></div>
                <div>
                  <p className="text-sm font-medium group-hover:text-red-400 transition-colors">隐私与安全</p>
                  <p className="text-[10px] lg:text-xs text-[#888888] mt-0.5">清除本地缓存与通行凭证</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}