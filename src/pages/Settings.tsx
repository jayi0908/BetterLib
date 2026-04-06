import { ArrowLeft, Bell, Moon, Key, Send, Clock, Zap, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // === 状态管理 ===
  const [pushEnabled, setPushEnabled] = useState(() => {
    const saved = localStorage.getItem('setting_pushEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('setting_webhookUrl') || '';
  });
  
  const [pushDelay, setPushDelay] = useState(() => {
    const saved = localStorage.getItem('setting_pushDelay');
    return saved !== null ? Number(saved) : 0;
  });

  const [isTokenSaving, setIsTokenSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('setting_isDarkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 动画与主题持久化
  useEffect(() => {
    const timer = setTimeout(() => setIsMobileOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('setting_isDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('setting_pushEnabled', JSON.stringify(pushEnabled));
    localStorage.setItem('setting_pushDelay', String(pushDelay));
  }, [pushEnabled, pushDelay]);

  const handleBack = () => {
    setIsMobileOpen(false);
    setTimeout(() => navigate(-1), 100);
  };

  // 保存钉钉 Webhook
  const handleSaveToken = async () => {
    if (!webhookUrl) return;
    setIsTokenSaving(true);
    localStorage.setItem('setting_webhookUrl', webhookUrl);
    
    try {
      const userId = localStorage.getItem('user_id') || 'test_user_01'; 
      const userCookie = localStorage.getItem('user_cookie') || ''; 

      const response = await fetch('https://libapi.jayi0908.cn/api/settings/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          webhook_url: webhookUrl,
          cookie: userCookie,
          push_delay: pushDelay
        })
      });

      if (response.ok) alert('钉钉推送配置保存成功！后台监控已启动。');
      else alert('保存失败，后端返回错误。');
    } catch (err) {
      alert('保存失败，请检查网络连接');
    } finally {
      setIsTokenSaving(false);
    }
  };

  // 测试钉钉连通性
  const handleTestToken = async () => {
    if (!webhookUrl) {
      alert('请先输入 Webhook URL！');
      return;
    }
    setIsTesting(true);
    try {
      const response = await fetch('https://libapi.jayi0908.cn/api/settings/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });
      if (response.ok) alert('测试请求已发送，请打开钉钉查看是否收到 Ciallo~ 消息！');
      else alert('测试请求失败。');
    } catch (err) {
      alert('请求异常，请检查网络。');
    } finally {
      setIsTesting(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <div onClick={onChange} className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-[#333333]'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );

  return (
    <div className={`absolute inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#0E0F11] text-gray-900 dark:text-[#EAEAEA] transition-transform duration-300 ease-out ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
      <div className="h-14 flex items-center px-4 lg:px-6 border-b border-gray-200 dark:border-[#222326] bg-white/80 dark:bg-[#0E0F11]/80 backdrop-blur-md shrink-0">
        <button onClick={handleBack} className="p-1.5 mr-3 rounded-lg bg-gray-100 dark:bg-[#1C1D21] border border-gray-200 dark:border-[#2B2D31] text-gray-500 dark:text-[#A0A0A0] hover:text-black dark:hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-sm font-semibold tracking-wide">偏好设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* 通知设置卡片 */}
          <div className="bg-white dark:bg-[#151618] border border-gray-200 dark:border-[#2B2D31] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-[#222326] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1C1D21]/50 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg mr-4"><Bell size={18} /></div>
                <div>
                  <p className="text-sm font-medium">钉钉机器人通知</p>
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-[#888888] mt-0.5">接收座位临时离开的钉钉群提醒</p>
                </div>
              </div>
              <ToggleSwitch checked={pushEnabled} onChange={() => setPushEnabled(!pushEnabled)} />
            </div>

            {pushEnabled && (
              <div className="p-4 border-b border-gray-100 dark:border-[#222326] bg-gray-50/50 dark:bg-[#18191B]/50 transition-colors animate-in fade-in slide-in-from-top-2">
                
                {/* 1. 钉钉 Webhook 绑定区 */}
                <div className="mb-5">
                  <div className="flex items-center mb-3">
                    <Key size={14} className="text-gray-400 dark:text-[#666666] mr-2" />
                    <p className="text-xs font-medium">机器人 Webhook URL</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="在此处粘贴生成的 Webhook 链接..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#0E0F11] border border-gray-200 dark:border-[#2B2D31] rounded-lg px-3 py-1.5 text-xs lg:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        onClick={handleSaveToken}
                        disabled={isTokenSaving || !webhookUrl}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center text-sm transition-colors whitespace-nowrap"
                      >
                        <Send size={14} className="mr-1.5" />
                        {isTokenSaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                    {/* 测试联通性按钮 */}
                    <button 
                      onClick={handleTestToken}
                      disabled={isTesting || !webhookUrl}
                      className="w-full py-2 bg-gray-200 dark:bg-[#222326] hover:bg-gray-300 dark:hover:bg-[#2B2D31] disabled:opacity-50 text-gray-700 dark:text-[#A0A0A0] hover:text-black dark:hover:text-white rounded-lg flex items-center justify-center text-xs font-medium transition-colors"
                    >
                      <Zap size={14} className="mr-1.5 text-amber-500" />
                      {isTesting ? '正在发送测试请求...' : '测试钉钉连通性'}
                    </button>
                  </div>
                </div>

                {/* 🌟 新增：配置教程区块 */}
                <div className="mb-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3">
                  <div className="flex items-center mb-2 text-blue-600 dark:text-blue-400">
                    <Info size={14} className="mr-1.5" />
                    <span className="text-xs font-bold">如何获取钉钉机器人 Webhook？</span>
                  </div>
                  <ol className="text-[10px] lg:text-xs text-gray-600 dark:text-[#A0A0A0] space-y-1.5 pl-4 list-decimal marker:text-blue-400">
                    <li>在电脑端钉钉中发起一个群聊（可仅拉自己一人）。</li>
                    <li>点击群右上角设置 ➔ <strong>(划到最底)管理</strong> ➔ <strong>机器人</strong> ➔ <strong>添加机器人</strong>。</li>
                    <li>选择 <strong>自定义(通过Webhook接入)</strong>，点击添加。</li>
                    <li><strong className="text-red-500 dark:text-red-400">重要安全设置：</strong>勾选“自定义关键词”，并填入 <strong className="bg-gray-200 dark:bg-[#2B2D31] px-1 rounded text-gray-900 dark:text-white">BetterLib提醒</strong>。</li>
                    <li>完成创建后，复制生成的 Webhook 链接粘贴至上方。</li>
                  </ol>
                </div>

                {/* 2. 延迟滑动条 */}
                <div className="pt-4 border-t border-gray-200 dark:border-[#222326]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Clock size={14} className="text-gray-400 dark:text-[#666666] mr-2" />
                      <p className="text-xs font-medium">离馆通知延迟</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-500">{pushDelay} 分钟</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="10" step="1"
                    value={pushDelay}
                    onChange={(e) => setPushDelay(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-[#222326] rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-[#666666] mt-2 leading-relaxed">
                    检测到临时离开后，延迟指定时间再推送（避免去卫生间等短时间离开产生的误报）。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#151618] border border-gray-200 dark:border-[#2B2D31] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#1C1D21]/50 transition-colors">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg mr-4"><Moon size={18} /></div>
                <div>
                  <p className="text-sm font-medium">深色模式</p>
                  <p className="text-[10px] lg:text-xs text-gray-500 dark:text-[#888888] mt-0.5">开启极夜黑主题</p>
                </div>
              </div>
              <ToggleSwitch checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}