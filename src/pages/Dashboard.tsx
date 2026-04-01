import { useState, useEffect } from 'react';
import { 
  MapPin, Clock, TicketX, Image as ImageIcon, Calendar, Armchair, Coffee, 
  LogOut, Bell, X, ChevronRight, Map, ChevronLeft, Loader2, 
   Sun, CheckCircle2 
} from 'lucide-react';
import api from '../utils/api';

export default function Dashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // 灯光亮度临时状态
  const [brightness, setBrightness] = useState<Record<string, number>>({});

  const [notices, setNotices] = useState<any[]>([]);
  const [noticePage, setNoticePage] = useState(1);
  const [hasMoreNotices, setHasMoreNotices] = useState(true);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [roomDict, setRoomDict] = useState<Record<string, any>>({});
  const [seatDict, setSeatDict] = useState<Record<string, any>>({});
  const [isDictLoaded, setIsDictLoaded] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  useEffect(() => {
    fetchData();
    fetchNotices(1);
    loadLocalDictionaries();
  }, []);

  const fetchData = async () => {
    try {
      const rsvRes = await api.get('/reservations');
      const data = Array.isArray(rsvRes.data) ? rsvRes.data : [];
      setReservations(data);
      
      // 同步初始化亮度
      const brightMap: Record<string, number> = {};
      data.forEach((res: any) => { 
        brightMap[res.id] = parseInt(res.brightness || "0"); 
      });
      setBrightness(brightMap);

      if (window.innerWidth >= 1024 && data.length > 0 && !selectedRes) {
        setSelectedRes(data[0]);
      }
    } catch (err: any) { console.error("获取预约失败", err); }
  };

  const handleSeatControl = async (e: React.MouseEvent | null, res: any, action: 'leave' | 'return' | 'checkout' | 'power' | 'light', extra?: any) => {
    // 【关键修复】：阻止点击控制按钮时触发父容器的选中/侧边栏打开逻辑
    if (e) e.stopPropagation();

    const cancelReq = { id: res.id.toString(), type: Number(res.type) };
    try {
      let response;
      if (action === 'leave') response = await api.post('/seats/leave', cancelReq);
      else if (action === 'return') response = await api.post('/seats/return', cancelReq);
      else if (action === 'checkout') response = await api.post('/seats/checkout', cancelReq);
      else if (action === 'power') {
        response = await api.post('/seats/set_power', { req: cancelReq, area_id: res.area_id, status: extra.status });
      } else if (action === 'light') {
        response = await api.post('/seats/set_light', { req: cancelReq, area_id: res.area_id, status: extra.status, is_turn: extra.is_turn });
      }

      if (response?.data?.code === 1 || response?.data?.code === 0) {
        if (['leave', 'return', 'checkout', 'power', 'light'].includes(action)) {
          if (action === 'checkout' && selectedRes?.id === res.id) setSelectedRes(null);
          // 操作成功后立即刷新数据以更新 UI 状态
          fetchData();
        }
      } else {
        alert(response?.data?.msg || "操作失败");
      }
    } catch (err: any) {
      alert("请求异常");
    }
  };

  const renderSeatAdvancedControls = (res: any) => {
    // 只有 spaceStatus 为 "6" (使用中) 且类型为座位(1)时显示
    if (res.spaceStatus !== "6" || Number(res.type) !== 1) return null;

    const showLight = res.hasLight === "1";
    const showRelay = res.hasRelay === "1";
    const isLightOn = res.lightStatus === "1";
    const isRelayOn = res.relayStatus === "1";

    if (!showLight && !showRelay) return null;

    return (
      <div className="mt-4 pt-4 border-t border-dashed border-[#333333] space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-6">
            {/* 电源开关拨钮 */}
            {showRelay && (
              <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                <span className="text-[#888888] text-[12px]">电源</span>
                <button 
                  onClick={(e) => handleSeatControl(e, res, 'power', { status: isRelayOn ? 0 : 1 })}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${isRelayOn ? 'bg-indigo-600' : 'bg-[#222326] border border-[#333333]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${isRelayOn ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            )}

            {/* 灯光开关拨钮 */}
            {showLight && (
              <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                <span className="text-[#888888] text-[12px]">灯</span>
                <button 
                  onClick={(e) => handleSeatControl(e, res, 'light', { status: isLightOn ? 0 : 1, is_turn: true })}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${isLightOn ? 'bg-indigo-600' : 'bg-[#222326] border border-[#333333]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${isLightOn ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>
            )}
          </div>

          {/* 亮度调节滑动条 */}
          {showLight && (
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center text-[#888888] text-[10px]">
                  <Sun size={12} className="mr-1" /> 亮度
                </div>
                <span className="text-amber-500 font-mono text-[10px]">{brightness[res.id] || 0}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={brightness[res.id] || 0}
                onChange={(e) => setBrightness({...brightness, [res.id]: parseInt(e.target.value)})}
                onMouseUp={() => handleSeatControl(null, res, 'light', { status: brightness[res.id], is_turn: false })}
                onTouchEnd={() => handleSeatControl(null, res, 'light', { status: brightness[res.id], is_turn: false })}
                className="w-full h-2 bg-[#222326] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActionButtons = (res: any) => {
    const type = Number(res.type);
    const statusNum = res.spaceStatus;

    if (type === 2) {
      if (res.statusname === '使用中') return <button onClick={(e) => handleSeatControl(e, res, 'checkout')} className="action-btn-danger"><LogOut size={14} className="mr-1.5" /> 结束使用</button>;
      else return <button onClick={(e) => handleAction(e, res, '取消预约')} className="action-btn-danger"><TicketX size={14} className="mr-1.5" /> 取消预约</button>;
    } 
    
    if (type === 1) {
      if (statusNum === "6") {
        return (
          <div className="flex space-x-2 w-full">
            <button onClick={(e) => handleSeatControl(e, res, 'leave')} className="action-btn-warning flex-1"><Coffee size={14} className="mr-1.5" /> 临时离开</button>
            <button onClick={(e) => handleSeatControl(e, res, 'checkout')} className="action-btn-danger flex-1"><LogOut size={14} className="mr-1.5" /> 完全离开</button>
          </div>
        );
      } else if (statusNum === "7") {
        return (
          <div className="flex space-x-2 w-full">
            <button onClick={(e) => handleSeatControl(e, res, 'return')} className="action-btn-success flex-1"><CheckCircle2 size={14} className="mr-1.5" /> 返回签到</button>
            <button onClick={(e) => handleSeatControl(e, res, 'checkout')} className="action-btn-danger flex-1"><LogOut size={14} className="mr-1.5" /> 完全离开</button>
          </div>
        );
      } else {
        return <button onClick={(e) => handleAction(e, res, '取消预约')} className="action-btn-danger"><TicketX size={14} className="mr-1.5" /> 取消预约</button>;
      }
    }
    return null;
  };

  // 其余 notices 处理、辅助函数逻辑保持不变...
  const handleAction = async (e: React.MouseEvent, res: any, actionName: string) => {
    e.stopPropagation(); 
    if (!confirm(`确定要执行 [${actionName}] 操作吗？`)) return;
    try {
      if (actionName === '取消预约') await api.post('/cancel', { id: res.id.toString(), type: Number(res.type) });
      alert(`${actionName} 成功`);
      if (selectedRes?.id === res.id) setSelectedRes(null);
      fetchData(); 
    } catch (err: any) { alert(`${actionName} 失败`); }
  };

  const formatTimeRange = (begin?: string, end?: string) => {
    if (!begin || !end) return '未知时段';
    return `${begin.split(' ')[1]?.substring(0, 5)} - ${end.split(' ')[1]?.substring(0, 5)}`;
  };

  const getLocalImageUrl = (res: any, useFloorPlan: boolean) => {
    if (!res || !isDictLoaded) return null;
    const type = Number(res.type);
    const areaId = res.area_id?.toString();
    if (!areaId) return null;
    if (type === 2) {
      const dict = roomDict;
      if (!dict[areaId]) return null;
      if (useFloorPlan && dict[areaId].floor) return `/${dict[areaId].floor}/floor.jpg`;
      else if (dict[areaId].path) return `/${dict[areaId].path}/room.jpg`;
    } else if (type === 1) {
      const dict = seatDict;
      if (!dict[areaId]) return null;
      if (dict[areaId].path) return `/${dict[areaId].path}/seat.jpg`;
    }
    return null;
  };

  const fetchNotices = async (page: number) => {
    if (loadingNotices || (!hasMoreNotices && page > 1)) return;
    setLoadingNotices(true);
    try {
      const res = await api.post('/notices', { limit: 5, page });
      if (res.data?.data?.data) {
        const newData = res.data.data.data;
        if (newData.length < 5) setHasMoreNotices(false);
        setNotices(prev => page === 1 ? newData : [...prev, ...newData]);
      }
    } catch (err) {} finally { setLoadingNotices(false); }
  };

  const handleNoticeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      if (!loadingNotices && hasMoreNotices) {
        const nextPage = noticePage + 1;
        setNoticePage(nextPage);
        fetchNotices(nextPage);
      }
    }
  };

  const fetchNoticeDetail = async (id: string) => {
    try {
      const res = await api.post('/noticeDetail', { id });
      if (res.data?.data) setSelectedNotice(res.data.data);
    } catch (err) { alert("无法加载公告内容"); }
  };

  const loadLocalDictionaries = async () => {
    try {
      const [roomRes, seatRes] = await Promise.all([
        fetch('/data/room_dict.json').then(r => r.json()).catch(() => ({})),
        fetch('/data/seat_area_dict.json').then(r => r.json()).catch(() => ({}))
      ]);
      setRoomDict(roomRes);
      setSeatDict(seatRes);
      setIsDictLoaded(true);
    } catch (err) {}
  };

  const currentImageUrl = getLocalImageUrl(selectedRes, showFloorPlan);

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-[#0E0F11]">
      <style>{`
        .action-btn-danger { display: flex; justify-content: center; align-items: center; width: 100%; padding: 8px 0; border-radius: 8px; background-color: #222326; color: #A0A0A0; font-size: 12px; font-weight: 500; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .action-btn-danger:hover { background-color: #3F1D1D; color: #F87171; border-color: rgba(248, 113, 113, 0.3); }
        .action-btn-warning { display: flex; justify-content: center; align-items: center; width: 100%; padding: 8px 0; border-radius: 8px; background-color: #222326; color: #A0A0A0; font-size: 12px; font-weight: 500; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .action-btn-warning:hover { background-color: #3d2c18; color: #FBBF24; border-color: rgba(251, 191, 36, 0.3); }
        .action-btn-success { display: flex; justify-content: center; align-items: center; width: 100%; padding: 8px 0; border-radius: 8px; background-color: #222326; color: #A0A0A0; font-size: 12px; font-weight: 500; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .action-btn-success:hover { background-color: #1d3f2e; color: #34d399; border-color: rgba(52, 211, 153, 0.3); }
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #f59e0b; cursor: pointer; border: 3px solid #151618; margin-top: -4px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 8px; cursor: pointer; background: #222326; border-radius: 4px; border: 1px solid #333; }
      `}</style>

      {/* 左栏 */}
      <div className="w-full lg:w-110 border-r border-[#222326] flex flex-col bg-[#111214] shrink-0 h-full">
        <div className="h-14 flex items-center px-6 border-b border-[#222326] shrink-0">
          <h2 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">当前预约 (Active)</h2>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2B2D31] text-[#A0A0A0]">{reservations.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {reservations.length === 0 ? (
            <div className="text-center py-20 text-[#555555]"><p className="text-sm">暂无进行中的预约</p></div>
          ) : (
            reservations.map((res: any, idx: number) => {
              const isSelected = selectedRes?.id === res.id;
              const dateStr = res.beginTime ? res.beginTime.split(' ')[0] : (res.beginDate || '未知日期');
              
              return (
                <div 
                  key={res.id || idx}
                  onClick={() => { setSelectedRes(res); setTimeout(() => setIsMobileOpen(true), 10); }}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isSelected ? 'bg-[#1C1D21] border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'bg-[#18191B] border-[#2B2D31] hover:border-[#444444]'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full" />}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center text-[#EAEAEA] font-medium text-sm mb-1"><Calendar size={14} className="mr-1.5 text-[#888888]" />{dateStr}</div>
                      <div className="flex items-center text-[#A0A0A0] text-xs"><Clock size={13} className="mr-1.5" />{formatTimeRange(res.beginTime, res.endTime)}</div>
                    </div>
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[14px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">
                      {Number(res.type) === 1 ? '座位' : '空间'}
                    </span>
                  </div>

                  <div className="w-full border-t border-dashed border-[#333333] my-3 relative">
                    <div className="absolute -left-5 -top-1.5 w-3 h-3 bg-[#111214] rounded-full border-r border-[#333333]" />
                    <div className="absolute -right-5 -top-1.5 w-3 h-3 bg-[#111214] rounded-full border-l border-[#333333]" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center text-[#CCCCCC] text-sm mb-2">
                      <MapPin size={16} className="mr-2 text-indigo-500 shrink-0" />
                      <span className="font-medium truncate">{res.areaName || res.nameMerge || '未知地点'}</span>
                    </div>
                    {Number(res.type) === 1 && res.spaceName && (
                      <div className="flex items-center text-[#A0A0A0] text-xs ml-1">
                        <Armchair size={14} className="mr-2.5 shrink-0" />
                        <span className="truncate">座位编号: {res.spaceName}</span>
                      </div>
                    )}
                  </div>
                  
                  {Number(res.type) === 2 && <div className="mb-3">
                     <span className={`text-[11px] font-medium px-2 py-1 rounded bg-[#2B2D31] text-[#A0A0A0]`}>
                       场馆方位: {roomDict[res.area_id]?.location || '未知位置'}
                     </span>
                  </div>}

                  <div className="mb-3">
                     <span className={`text-[11px] font-medium px-2 py-1 rounded ${
                       res.statusname === '使用中' ? 'bg-emerald-500/10 text-emerald-400' :
                       res.statusname === '临时离开' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#2B2D31] text-[#A0A0A0]'
                     }`}>
                       当前状态: {res.statusname || '未知状态'}
                     </span>
                     {(res.statusname === '预约成功' && res.lastSigninTime && 
                       <span className="text-[11px] font-medium px-2 py-1 rounded bg-[#2B2D31] text-[#ff4444] ml-2">
                         请在 {res.lastSigninTime} 前签到
                       </span>
                     ) || (res.spaceStatus === "7" && res.needBackTime &&
                       <span className="text-[11px] font-medium px-2 py-1 rounded bg-[#2B2D31] text-[#ff4444] ml-2">
                         请在 {res.needBackTime} 前返回
                       </span>
                     )}
                  </div>

                  <div className="mt-1">{renderActionButtons(res)}</div>
                  {renderSeatAdvancedControls(res)}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右栏逻辑保持原样 */}
      <div className={`
        absolute inset-0 z-40 lg:static lg:z-auto lg:flex-1 
        flex flex-col bg-[#0E0F11] 
        transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {selectedRes ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-[#222326] bg-[#0E0F11]/80 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center">
                <button 
                  className="lg:hidden mr-3 p-1.5 rounded-lg bg-[#1C1D21] border border-[#2B2D31] text-[#A0A0A0] hover:text-white transition-colors"
                  onClick={() => { setIsMobileOpen(false); setTimeout(() => setSelectedRes(null), 300); }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[#888888] text-sm mr-2 hidden sm:inline">当前预览图:</span>
                <span className="text-[#EAEAEA] text-sm font-medium truncate max-w-37.5 sm:max-w-62.5">{selectedRes?.areaName || '空间平面图'}</span>
              </div>
              {selectedRes && Number(selectedRes.type) === 2 && (
                <button onClick={() => setShowFloorPlan(!showFloorPlan)} className="flex items-center px-3 py-1.5 bg-[#1C1D21] border border-[#2B2D31] hover:bg-[#2B2D31] rounded-lg text-xs font-medium text-[#A0A0A0] hover:text-[#EAEAEA] transition-colors">
                  <Map size={14} className="mr-1.5 text-blue-500 hidden sm:block" />
                  {showFloorPlan ? '查看详情' : '区域方位'}
                </button>
              )}
            </div>
            
            <div className="flex-1 flex flex-col relative min-h-[50%]">
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                 {currentImageUrl ? (
                   <img src={currentImageUrl} alt="Floor Plan" className="max-w-full max-h-full rounded-xl shadow-2xl border border-[#222326] object-contain relative z-10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement?.classList.add('image-failed'); }} />
                 ) : (
                   <div className="flex flex-col items-center text-[#555555] relative z-10"><ImageIcon size={64} className="mb-4 opacity-50" strokeWidth={1} /><p className="text-sm font-medium">暂无平面图</p></div>
                 )}
              </div>
            </div>

            <div className="h-auto lg:h-80 flex border-t border-[#222326] bg-[#111214] flex-col shrink-0 min-h-0 flex-1 lg:flex-none">
              <div className="h-12 flex items-center px-4 lg:px-6 border-b border-[#222326] shrink-0 bg-[#151618]">
                <Bell size={16} className="text-indigo-500 mr-2" />
                <h3 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">通知与公告</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar touch-pan-y" onScroll={handleNoticeScroll}>
                {notices.length === 0 ? (
                  <p className="text-[#555555] text-sm text-center mt-10">暂无最新通知</p>
                ) : (
                  <>
                    {notices.map((notice) => (
                      <div key={notice.id} onClick={() => fetchNoticeDetail(notice.id)} className="group flex items-center justify-between p-3.5 bg-[#18191B] border border-[#2B2D31] active:bg-[#1C1D21] lg:hover:border-indigo-500/50 lg:hover:bg-[#1C1D21] rounded-xl cursor-pointer transition-all duration-200">
                        <div className="flex items-center overflow-hidden flex-1 mr-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-3 shrink-0" />
                          <span className="text-[#CCCCCC] group-hover:text-[#EAEAEA] text-sm truncate font-medium transition-colors">{notice.title}</span>
                        </div>
                        <div className="flex items-center shrink-0">
                          <span className="text-[#888888] text-xs font-mono mr-2 hidden sm:inline">{notice.create_time}</span>
                          <ChevronRight size={14} className="text-[#555555] group-hover:text-[#A0A0A0] transition-colors" />
                        </div>
                      </div>
                    ))}
                    {loadingNotices && noticePage > 1 && (
                      <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#444444]">
            <ImageIcon size={48} className="mb-4 opacity-50" strokeWidth={1.5} />
            <p className="text-sm">在左侧选择预约或暂无平面图</p>
          </div>
        )}
      </div>

      {selectedNotice && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-6 animate-in fade-in duration-200">
          <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-[#222326] shrink-0 bg-[#1C1D21] rounded-t-2xl">
              <h3 className="text-base lg:text-lg font-bold text-[#EAEAEA] pr-4 truncate">{selectedNotice.title}</h3>
              <button onClick={() => setSelectedNotice(null)} className="p-1.5 rounded-lg text-[#888888] hover:text-[#F87171] hover:bg-[#3F1D1D]/50 transition-colors"><X size={20} /></button>
            </div>
            <div className="px-4 lg:px-6 py-2 bg-[#111214] border-b border-[#222326] flex items-center text-[#888888] text-xs font-mono shrink-0">
              <span>发布时间: {selectedNotice.inputTime || selectedNotice.create_time}</span>
            </div>
            <div className="p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#111214] rounded-b-2xl min-h-0 touch-pan-y">
              <div className="text-[#CCCCCC] text-sm leading-loose html-content-wrapper space-y-4" dangerouslySetInnerHTML={{ __html: selectedNotice.content || '<p>暂无详细内容</p>' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}