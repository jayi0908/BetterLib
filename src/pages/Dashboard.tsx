import { useState, useEffect } from 'react';
import { MapPin, Clock, TicketX, Image as ImageIcon, Calendar, Armchair, Coffee, LogOut, Bell, X, ChevronRight, Map, ChevronLeft } from 'lucide-react';
import api from '../utils/api';

export default function Dashboard() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);

  // ======== 新增：用于控制移动端侧滑面板动画的状态 ========
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [notices, setNotices] = useState<any[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  const [roomDict, setRoomDict] = useState<Record<string, any>>({});
  const [seatDict, setSeatDict] = useState<Record<string, any>>({});
  const [isDictLoaded, setIsDictLoaded] = useState(false);
  
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  useEffect(() => {
    fetchData();
    fetchNotices();
    loadLocalDictionaries();
  }, []);

  useEffect(() => {
    setShowFloorPlan(false);
  }, [selectedRes]);

  const fetchData = async () => {
    try {
      const rsvRes = await api.get('/reservations');
      const data = Array.isArray(rsvRes.data) ? rsvRes.data : [];
      setReservations(data);
      // PC 端默认选中第一个，移动端不默认选中以显示列表
      if (window.innerWidth >= 1024 && data.length > 0 && !selectedRes) {
        setSelectedRes(data[0]);
        setIsMobileOpen(true); // 自动打开面板
      }
    } catch (err: any) {
      console.error("获取预约失败", err);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.post('/notices', { limit: 5, page: 1 });
      if (res.data?.data?.data) {
        setNotices(res.data.data.data);
      }
    } catch (err) {}
  };

  const fetchNoticeDetail = async (id: string) => {
    try {
      const res = await api.post('/noticeDetail', { id });
      if (res.data?.data) {
        setSelectedNotice(res.data.data);
      }
    } catch (err) {
      alert("无法加载公告内容");
    }
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

  const handleAction = async (e: React.MouseEvent, res: any, actionName: string) => {
    e.stopPropagation(); 
    if (!confirm(`确定要执行 [${actionName}] 操作吗？`)) return;
    
    try {
      if (actionName === '取消预约') {
        await api.post('/cancel', { id: res.id.toString(), type: Number(res.type) });
      } else {
        await api.post('/placeholder_action_endpoint', {});
      }
      
      alert(`${actionName} 成功`);
      if (['取消预约', '完全离开', '结束使用'].includes(actionName)) {
        if (selectedRes?.id === res.id) {
          // 如果取消的是当前正在查看的预约，在移动端先滑出再清空
          setIsMobileOpen(false);
          setTimeout(() => setSelectedRes(null), 300);
        }
      }
      fetchData(); 
    } catch (err: any) {
      alert(`${actionName} 失败: ${err.message}`);
    }
  };

  const formatTimeRange = (begin?: string, end?: string) => {
    if (!begin || !end) return '未知时段';
    const b = begin.split(' ')[1]?.substring(0, 5) || '';
    const e = end.split(' ')[1]?.substring(0, 5) || '';
    return `${b} - ${e}`;
  };

  const renderActionButtons = (res: any) => {
    const type = Number(res.type);
    const status = res.statusname;

    if (type === 2) {
      if (status === '使用中') return <button onClick={(e) => handleAction(e, res, '结束使用')} className="action-btn-danger"><LogOut size={14} className="mr-1.5" /> 结束使用</button>;
      else return <button onClick={(e) => handleAction(e, res, '取消预约')} className="action-btn-danger"><TicketX size={14} className="mr-1.5" /> 取消预约</button>;
    } else if (type === 1) {
      if (status === '使用中') {
        return (
          <div className="flex space-x-2 w-full">
            <button onClick={(e) => handleAction(e, res, '临时离开')} className="action-btn-warning flex-1"><Coffee size={14} className="mr-1.5" /> 临时离开</button>
            <button onClick={(e) => handleAction(e, res, '完全离开')} className="action-btn-danger flex-1"><LogOut size={14} className="mr-1.5" /> 完全离开</button>
          </div>
        );
      } else if (status === '临时离开') {
        return <button onClick={(e) => handleAction(e, res, '完全离开')} className="action-btn-danger"><LogOut size={14} className="mr-1.5" /> 完全离开</button>;
      } else {
        return <button onClick={(e) => handleAction(e, res, '取消预约')} className="action-btn-danger"><TicketX size={14} className="mr-1.5" /> 取消预约</button>;
      }
    }
    return null;
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

  const currentImageUrl = getLocalImageUrl(selectedRes, showFloorPlan);

  return (
    // 外层添加 overflow-hidden 避免动画时出现滚动条
    <div className="flex h-full w-full relative overflow-hidden bg-[#0E0F11]">
      <style>{`
        .action-btn-danger { display: flex; justify-content: center; align-items: center; width: 100%; padding: 8px 0; border-radius: 8px; background-color: #222326; color: #A0A0A0; font-size: 12px; font-weight: 500; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .action-btn-danger:hover { background-color: #3F1D1D; color: #F87171; border-color: rgba(248, 113, 113, 0.3); }
        .action-btn-warning { display: flex; justify-content: center; align-items: center; width: 100%; padding: 8px 0; border-radius: 8px; background-color: #222326; color: #A0A0A0; font-size: 12px; font-weight: 500; border: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .action-btn-warning:hover { background-color: #3d2c18; color: #FBBF24; border-color: rgba(251, 191, 36, 0.3); }
        .html-content-wrapper * { font-family: inherit !important; color: #CCCCCC !important; background-color: transparent !important; }
      `}</style>

      {/* 左栏：现在永远渲染在底层，不再隐藏，PC端宽度 440px 保持规范 */}
      <div className="w-full lg:w-110 border-r border-[#222326] flex flex-col bg-[#111214] shrink-0 h-full">
        <div className="h-14 flex items-center px-6 border-b border-[#222326] shrink-0">
          <h2 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">当前预约 (Active)</h2>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2B2D31] text-[#A0A0A0]">
            {reservations.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {reservations.length === 0 ? (
            <div className="text-center py-20 text-[#555555]">
              <p className="text-sm">暂无进行中的预约</p>
            </div>
          ) : (
            reservations.map((res: any, idx: number) => {
              const isSelected = selectedRes?.id === res.id;
              const dateStr = res.beginTime ? res.beginTime.split(' ')[0] : (res.beginDate || '未知日期');
              
              return (
                <div 
                  key={res.id || idx}
                  onClick={() => {
                    setSelectedRes(res);
                    // 延迟 10ms 触发动画，给 React 足够的时间渲染选中状态
                    setTimeout(() => setIsMobileOpen(true), 10);
                  }}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                    isSelected ? 'bg-[#1C1D21] border-[#4F46E5] shadow-[0_0_0_1px_rgba(79,70,229,0.3)]' : 'bg-[#18191B] border-[#2B2D31] hover:border-[#444444]'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#4F46E5] rounded-r-full" />}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center text-[#EAEAEA] font-medium text-sm mb-1"><Calendar size={14} className="mr-1.5 text-[#888888]" />{dateStr}</div>
                      <div className="flex items-center text-[#A0A0A0] text-xs"><Clock size={13} className="mr-1.5" />{formatTimeRange(res.beginTime, res.endTime)}</div>
                    </div>
                    <span className="px-2 py-1 bg-[#4F46E5]/10 text-[#818CF8] text-[10px] font-bold rounded uppercase tracking-wider border border-[#4F46E5]/20">
                      {Number(res.type) === 1 ? '座位' : '空间'}
                    </span>
                  </div>

                  <div className="w-full border-t border-dashed border-[#333333] my-3 relative">
                    <div className="absolute -left-5 -top-1.5 w-3 h-3 bg-[#111214] rounded-full border-r border-[#333333]" />
                    <div className="absolute -right-5 -top-1.5 w-3 h-3 bg-[#111214] rounded-full border-l border-[#333333]" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center text-[#CCCCCC] text-sm mb-2">
                      <MapPin size={16} className="mr-2 text-[#4F46E5] shrink-0" />
                      <span className="font-medium truncate">{res.areaName || res.nameMerge || '未知地点'}</span>
                    </div>
                    {Number(res.type) === 1 && res.spaceName && (
                      <div className="flex items-center text-[#A0A0A0] text-xs ml-1">
                        <Armchair size={14} className="mr-2.5 shrink-0" />
                        <span className="truncate">座位编号: {res.spaceName}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                     <span className={`text-[11px] font-medium px-2 py-1 rounded ${
                       res.statusname === '使用中' ? 'bg-emerald-500/10 text-emerald-400' :
                       res.statusname === '临时离开' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#2B2D31] text-[#A0A0A0]'
                     }`}>
                       当前状态: {res.statusname || '未知状态'}
                     </span>
                  </div>
                  <div className="mt-1">{renderActionButtons(res)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右栏：移动端绝对定位侧滑覆盖，PC端静态排布 */}
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
                {/* 移动端返回按钮，点击后触发滑出动画 */}
                <button 
                  className="lg:hidden mr-3 p-1.5 rounded-lg bg-[#1C1D21] border border-[#2B2D31] text-[#A0A0A0] hover:text-white transition-colors"
                  onClick={() => {
                    setIsMobileOpen(false);
                    setTimeout(() => setSelectedRes(null), 300);
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[#888888] text-sm mr-2 hidden sm:inline">当前预览图:</span>
                <span className="text-[#EAEAEA] text-sm font-medium truncate max-w-37.5 sm:max-w-62.5">{selectedRes?.areaName || '空间平面图'}</span>
              </div>
              {selectedRes && Number(selectedRes.type) === 2 && (
                <button 
                  onClick={() => setShowFloorPlan(!showFloorPlan)}
                  className="flex items-center px-3 py-1.5 bg-[#1C1D21] border border-[#2B2D31] hover:bg-[#2B2D31] rounded-lg text-xs font-medium text-[#A0A0A0] hover:text-[#EAEAEA] transition-colors"
                >
                  <Map size={14} className="mr-1.5 text-blue-500 hidden sm:block" />
                  {showFloorPlan ? '查看详情' : '区域方位'}
                </button>
              )}
            </div>
            
            <div className="flex-1 flex flex-col relative min-h-[50%]">
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
                 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                 
                 {currentImageUrl ? (
                   <img 
                     src={currentImageUrl} 
                     alt="Floor Plan" 
                     className="max-w-full max-h-full rounded-xl shadow-2xl border border-[#222326] object-contain relative z-10"
                     onError={(e) => {
                       (e.target as HTMLImageElement).style.display = 'none';
                       e.currentTarget.parentElement?.classList.add('image-failed');
                     }}
                   />
                 ) : (
                   <div className="flex flex-col items-center text-[#555555] relative z-10">
                     <ImageIcon size={64} className="mb-4 opacity-50" strokeWidth={1} />
                     <p className="text-sm font-medium">暂无平面图</p>
                   </div>
                 )}
              </div>
            </div>

            {/* 通知公告区 */}
            <div className="h-auto lg:h-80 flex border-t border-[#222326] bg-[#111214] flex-col shrink-0 flex-1 lg:flex-none">
              <div className="h-12 flex items-center px-4 lg:px-6 border-b border-[#222326] shrink-0 bg-[#151618]">
                <Bell size={16} className="text-[#4F46E5] mr-2" />
                <h3 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">通知与公告</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notices.length === 0 ? (
                  <p className="text-[#555555] text-sm text-center mt-10">暂无最新通知</p>
                ) : (
                  notices.map((notice) => (
                    <div key={notice.id} onClick={() => fetchNoticeDetail(notice.id)} className="group flex items-center justify-between p-3.5 bg-[#18191B] border border-[#2B2D31] hover:border-[#4F46E5]/50 hover:bg-[#1C1D21] rounded-xl cursor-pointer transition-all duration-200">
                      <div className="flex items-center overflow-hidden flex-1 mr-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] mr-3 shrink-0" />
                        <span className="text-[#CCCCCC] group-hover:text-[#EAEAEA] text-sm truncate font-medium transition-colors">{notice.title}</span>
                      </div>
                      <div className="flex items-center shrink-0">
                        <span className="text-[#888888] text-xs font-mono mr-2 hidden sm:inline">{notice.create_time}</span>
                        <ChevronRight size={14} className="text-[#555555] group-hover:text-[#A0A0A0] transition-colors" />
                      </div>
                    </div>
                  ))
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
    </div>
  );
}