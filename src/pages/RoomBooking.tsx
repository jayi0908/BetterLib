import React, { useState, useEffect } from 'react';
import { MapPin, Info, Loader2, CalendarIcon, AlertTriangle, ChevronLeft, Plus, X, ChevronDown, ChevronUp, Map } from 'lucide-react';
import ReactSlider from 'react-slider';
import api from '../utils/api';

const MIN_TIME = 510;
const MAX_TIME = 1350;

export default function RoomBooking() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [roomDict, setRoomDict] = useState<Record<string, any>>({});
  const [isDictLoaded, setIsDictLoaded] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [occupancyData, setOccupancyData] = useState<any | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedRange, setSelectedRange] = useState<[number, number]>([510, 570]);
  
  const [occupiedSlots, setOccupiedSlots] = useState<{begin: number, end: number}[]>([]);
  const [freeSlots, setFreeSlots] = useState<{begin: number, end: number}[]>([]);
  const [hasValidSlots, setHasValidSlots] = useState(true);

  const [isFormView, setIsFormView] = useState(false);
  const [applicantName, setApplicantName] = useState('加载中...');
  
  // 成员管理
  const [memberInput, setMemberInput] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([]);
  const [recentMembers, setRecentMembers] = useState<{id: string, name: string}[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  
  // 表单字段
  const [theme, setTheme] = useState('团队讨论(班团,社团,兴趣小组,项目讨论)');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState('');
  const [isOpen, setIsOpen] = useState('0'); // 0: 不公开, 1: 公开
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast 弹窗
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    api.get('/user').then(res => setApplicantName(res.data || '未知用户')).catch(() => {});
    const cachedRecent = localStorage.getItem('recentMembers');
    if (cachedRecent) setRecentMembers(JSON.parse(cachedRecent));

    fetch('/data/room_dict.json')
      .then(res => res.json())
      .then(data => {
        setRoomDict(data);
        setIsDictLoaded(true);
        fetchRooms(1);
      }).catch(err => console.error("字典加载失败", err));
  }, []);

  useEffect(() => {
    if (selectedRoom && isDictLoaded) {
      setIsFormView(false); 
      const areaId = selectedRoom.id.toString();
      const venues = roomDict[areaId]?.venues;
      if (venues) fetchOccupancy(areaId, venues);
    }
  }, [selectedRoom, isDictLoaded]);

  const fetchRooms = async (targetPage: number) => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.post('/room_list', { page: targetPage });
      const newList = res.data?.data?.list || [];
      const totalPage = res.data?.data?.totalPage || 1;
      setRooms(prev => targetPage === 1 ? newList : [...prev, ...newList]);
      setPage(targetPage);
      setHasMore(targetPage < totalPage);
      
      // PC 端自动选中第一个
      if (window.innerWidth >= 1024 && targetPage === 1 && newList.length > 0 && !selectedRoom) {
        setSelectedRoom(newList[0]);
        setIsMobileOpen(true);
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) fetchRooms(page + 1);
  };

  const fetchOccupancy = async (roomId: string, area: string) => {
    try {
      const res = await api.post('/room_occupancy', { room_id: roomId, area });
      const data = res.data?.data;
      if (data && data.list) {
        setOccupancyData(data);
        setSelectedDateIndex(0);
        parseDateData(data.list[0]);
      }
    } catch (err) {}
  };

  const parseDateData = (dayData: any) => {
    let rawSlots = [];
    if (dayData?.info?.list) rawSlots = dayData.info.list.map((item: any) => ({ begin: item.beginNum, end: item.endNum }));
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dayData?.date === todayStr) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const blockedUntil = Math.ceil(currentMins / 15) * 15;
      if (blockedUntil > MIN_TIME) rawSlots.push({ begin: MIN_TIME, end: Math.min(blockedUntil, MAX_TIME) });
    }
    rawSlots.sort((a: any, b: any) => a.begin - b.begin);
    let mergedOccupied: {begin: number, end: number}[] = [];
    for (let slot of rawSlots) {
      if (mergedOccupied.length === 0) mergedOccupied.push(slot);
      else {
        let last = mergedOccupied[mergedOccupied.length - 1];
        if (slot.begin <= last.end) last.end = Math.max(last.end, slot.end);
        else mergedOccupied.push(slot);
      }
    }
    setOccupiedSlots(mergedOccupied);
    let calculatedFreeSlots = [];
    let currentStart = MIN_TIME;
    for (let slot of mergedOccupied) {
      if (slot.begin - currentStart >= 60) calculatedFreeSlots.push({ begin: currentStart, end: slot.begin });
      currentStart = Math.max(currentStart, slot.end);
    }
    if (MAX_TIME - currentStart >= 60) calculatedFreeSlots.push({ begin: currentStart, end: MAX_TIME });
    setFreeSlots(calculatedFreeSlots);
    if (calculatedFreeSlots.length === 0) {
      setHasValidSlots(false);
      setSelectedRange([MIN_TIME, MAX_TIME]);
    } else {
      setHasValidSlots(true);
      setSelectedRange([calculatedFreeSlots[0].begin, calculatedFreeSlots[0].begin + 60]);
    }
  };

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleSliderChange = (newValues: [number, number], index: number) => {
    if (!hasValidSlots) return;
    let [newStart, newEnd] = newValues;
    const diff = newEnd - newStart;
    const startMoved = index === 0;
    const endMoved = index === 1;

    if (diff < 60) {
      if (startMoved) newEnd = newStart + 60;
      else if (endMoved) newStart = newEnd - 60;
    } else if (diff > 240) {
      if (startMoved) newEnd = newStart + 240;
      else if (endMoved) newStart = newEnd - 240;
    }

    const currentDur = newEnd - newStart;
    if (newStart < MIN_TIME) {
      newStart = MIN_TIME;
      newEnd = newStart + currentDur;
    }
    if (newEnd > MAX_TIME) {
      newEnd = MAX_TIME;
      newStart = newEnd - currentDur;
      if (newStart < MIN_TIME) newStart = MIN_TIME;
    }
    setSelectedRange([newStart, newEnd]);
  };

  const handleSliderAfterChange = (newValues: [number, number]) => {
    if (!hasValidSlots || freeSlots.length === 0) return;
    const [start, end] = newValues;
    if (freeSlots.some(free => start >= free.begin && end <= free.end)) return;
    let target = freeSlots.find(slot => slot.end >= start + 60) || freeSlots[0];
    const dur = end - start;
    let snapStart = Math.max(target.begin, start);
    let snapEnd = snapStart + dur;
    if (snapEnd > target.end) {
      snapEnd = target.end; snapStart = snapEnd - dur;
      if (snapStart < target.begin) { snapStart = target.begin; snapEnd = snapStart + 60; }
    }
    setSelectedRange([snapStart, snapEnd]);
  };

  const getCurrentDateStr = () => occupancyData?.date?.[selectedDateIndex] || '';
  const getFormattedTimeStr = (mins: number) => `${getCurrentDateStr()} ${formatTime(mins)}`;

  const updateRecentMembers = (member: {id: string, name: string}) => {
    let queue = [...recentMembers];
    queue = queue.filter(m => m.id !== member.id);
    queue.unshift(member);
    if (queue.length > 10) queue.pop();
    setRecentMembers(queue);
    localStorage.setItem('recentMembers', JSON.stringify(queue));
  };

  const handleAddMember = async () => {
    const card = memberInput.trim();
    if (!card) return;
    if (teamMembers.some(m => m.id === card)) return showToast('该成员已在列表中', 'error');

    setIsAddingMember(true);
    try {
      const areaId = selectedRoom?.id.toString();
      const venues = roomDict[areaId]?.venues;
      
      const res = await api.get(`/name/${card}`, {
        params: { area: venues, beginTime: getFormattedTimeStr(selectedRange[0]), endTime: getFormattedTimeStr(selectedRange[1]) }
      });

      if (res.data.code === 1) {
        const newMember = { id: res.data.data.id, name: res.data.data.name };
        setTeamMembers([...teamMembers, newMember]);
        updateRecentMembers(newMember);
        setMemberInput('');
      } else {
        showToast(res.data.msg || '无法添加该成员', 'error');
      }
    } catch (err) {
      showToast('网络请求失败', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const removeMember = (id: string) => setTeamMembers(teamMembers.filter(m => m.id !== id));

  const submitBooking = async () => {
    if (!desc.trim() || !phone.trim()) return showToast('请填写申请说明和联系电话', 'error');
    
    setIsSubmitting(true);
    try {
      const areaId = selectedRoom?.id.toString();

      const payload = {
        day: getCurrentDateStr(), 
        start_time: formatTime(selectedRange[0]),
        end_time: formatTime(selectedRange[1]),
        title: theme,
        content: desc,
        mobile: phone,
        room: areaId,
        open: isOpen,
        teamusers: teamMembers.map(m => m.id).join(',')
      };

      const res = await api.post('/room/book', payload);
      if (res.data.code === 1) {
        showToast('预约成功！', 'success');
        setTimeout(() => setIsFormView(false), 1500);
      } else {
        showToast(res.data.msg || '预约失败', 'error');
      }
    } catch (err) {
      showToast('提交失败，网络异常', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAreaId = selectedRoom?.id.toString();
  const currentFloorPath = currentAreaId ? roomDict[currentAreaId]?.floor : null;

  return (
    // 外层添加 overflow-hidden，防止动画滑动时撑爆页面出现水平滚动条
    <div className="flex h-full w-full bg-[#0E0F11] relative overflow-hidden">
      
      {/* 全局 Toast 提示 */}
      {toast && (
        <div className={`absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-100 px-6 py-3 rounded-full flex items-center shadow-2xl animate-in fade-in slide-in-from-top-4 w-11/12 md:w-auto text-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
          {toast.type === 'error' && <AlertTriangle size={18} className="mr-2 shrink-0" />}
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}

      {/* 左栏：现在永远使用 flex 显示，不隐藏，移动端它将铺满底层 */}
      <div className="w-full lg:w-100 border-r border-[#222326] flex flex-col bg-[#111214] shrink-0 h-full">
         <div className="h-14 flex items-center px-6 border-b border-[#222326] shrink-0">
          <h2 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">研讨室与空间</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" onScroll={handleScroll}>
          {rooms.map((room) => {
            const areaId = room.id.toString();
            const dictInfo = roomDict[areaId] || {};
            const isSelected = selectedRoom?.id === room.id;
            const imgPath = dictInfo.path ? `/${dictInfo.path}/room.jpg` : room.firstimg;

            return (
              <div 
                key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  // 使用 setTimeout 保证 DOM 渲染选中态后，再触发滑动入场动画
                  setTimeout(() => setIsMobileOpen(true), 10);
                }}
                className={`relative flex p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isSelected ? 'bg-[#1C1D21] border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.3)]' : 'bg-[#18191B] border-[#2B2D31] hover:border-[#444444]'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-3 bottom-3 w-0.75 bg-blue-600 rounded-r-full" />}
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[#0E0F11] rounded-lg border border-[#2B2D31] overflow-hidden shrink-0 mr-4">
                  <img src={imgPath} alt={room.name} className="w-full h-full object-cover opacity-80" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150/111214/555555?text=No+Image' }}/>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <h3 className="text-[#EAEAEA] font-bold text-sm truncate">{dictInfo.name || room.name}</h3>
                  <div className="flex items-center space-x-2 mt-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-400 text-[10px] font-semibold rounded border border-blue-600/20">{dictInfo.typeCategory === "2" ? "单人自习室" : "多人研讨间"}</span>
                    <span className="flex items-center text-[#A0A0A0] text-[10px] truncate"><MapPin size={10} className="mr-1 shrink-0" />{dictInfo.location || '未知方位'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {(dictInfo.feature || []).slice(0, 3).map((feat: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 bg-[#2B2D31] text-[#A0A0A0] text-[9px] font-medium rounded">
                        {feat}
                      </span>
                    ))}
                    {(dictInfo.feature?.length || 0) > 3 && (
                      <span className="px-1.5 py-0.5 bg-[#222326] text-[#666666] text-[9px] font-medium rounded">...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右栏：移动端绝对定位侧滑覆盖，PC端静态排布 */}
      <div className={`
        absolute inset-0 z-40 lg:static lg:z-auto lg:flex-1 
        flex flex-col bg-[#0E0F11] 
        transition-transform duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {selectedRoom ? (
          <>
            <div className="h-14 flex items-center px-4 lg:px-6 border-b border-[#222326] bg-[#0E0F11]/80 backdrop-blur-md z-10 shrink-0">
              {/* 移动端/表单 返回按钮统一处理 */}
              <button 
                onClick={() => {
                  if (isFormView) {
                    setIsFormView(false);
                  } else {
                    // 返回列表时，先执行滑出动画，300ms 后再清空数据
                    setIsMobileOpen(false);
                    setTimeout(() => setSelectedRoom(null), 300);
                  }
                }} 
                className={`${isFormView || selectedRoom ? 'block lg:hidden' : 'hidden'} mr-3 p-1.5 rounded-lg bg-[#1C1D21] border border-[#2B2D31] text-[#A0A0A0] transition-colors`}
              >
                <ChevronLeft size={18} />
              </button>

              {isFormView && (
                <button onClick={() => setIsFormView(false)} className="hidden lg:block mr-4 p-1 rounded hover:bg-[#222326] text-[#A0A0A0] hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
              )}
              <span className="text-[#888888] text-sm mr-2 hidden sm:inline">{isFormView ? '填写预约表单:' : '正在安排:'}</span>
              <span className="text-[#EAEAEA] text-sm font-medium truncate max-w-37.5 sm:max-w-62.5">{roomDict[selectedRoom.id.toString()]?.name || selectedRoom.name}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-12 custom-scrollbar">
              <div className="max-w-2xl mx-auto">
                
                {/* 模式 1：时间轴选择模式 */}
                {!isFormView ? (
                  <div className="animate-in fade-in duration-300">
                    
                    {currentFloorPath && (
                      <div className="mb-6 lg:mb-10 bg-[#151618] border border-[#2B2D31] rounded-2xl p-4 lg:p-5 shadow-xl">
                        <h3 className="text-[#EAEAEA] font-semibold mb-4 flex items-center text-sm lg:text-base">
                          <Map size={18} className="mr-2 text-blue-500" /> 区域方位指示
                        </h3>
                        <div className="w-full h-full lg:h-56 bg-[#0E0F11] rounded-xl overflow-hidden border border-[#222326] flex items-center justify-center relative">
                           <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                           <img 
                             src={`/${currentFloorPath}/floor.jpg`} 
                             alt="Floor Plan" 
                             className="w-full h-full object-contain relative z-10"
                             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                           />
                        </div>
                      </div>
                    )}

                    <h3 className="text-[#EAEAEA] font-semibold mb-4 flex items-center text-sm lg:text-base">
                      <CalendarIcon size={18} className="mr-2 text-blue-500" /> 选择日期
                    </h3>
                    <div className="flex space-x-3 mb-6 lg:mb-10 overflow-x-auto pb-2 custom-scrollbar">
                      {occupancyData?.date?.map((dateStr: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedDateIndex(idx); parseDateData(occupancyData.list[idx]); }}
                          className={`px-4 lg:px-5 py-2 lg:py-3 rounded-xl border transition-all shrink-0 ${
                            selectedDateIndex === idx ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-[#18191B] border-[#2B2D31] text-[#A0A0A0] hover:bg-[#1C1D21] hover:text-[#EAEAEA]'
                          }`}
                        >
                          <div className="text-xs lg:text-sm font-bold">{dateStr.substring(5)}</div>
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl p-4 lg:p-6 shadow-xl mb-8 relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[#888888] text-xs lg:text-sm font-medium">选择时段 (60~240分钟)</span>
                        <div className="text-[#EAEAEA] font-bold text-base lg:text-lg font-mono">
                          {hasValidSlots ? `${formatTime(selectedRange[0])} - ${formatTime(selectedRange[1])}` : '--:-- - --:--'}
                        </div>
                      </div>
                      <div className="relative h-6 pt-1">
                        <div className="absolute left-0 right-0 h-3 bg-blue-500/20 rounded-full overflow-hidden">
                          {occupiedSlots.map((slot, i) => {
                            const total = MAX_TIME - MIN_TIME;
                            const left = ((slot.begin - MIN_TIME) / total) * 100;
                            const width = ((slot.end - slot.begin) / total) * 100;
                            return <div key={i} className="absolute top-0 bottom-0 bg-[#6B7280] border-x border-[#4B5563]" style={{ left: `${left}%`, width: `${width}%` }} />;
                          })}
                        </div>
                        <ReactSlider
                          className="w-full relative h-3 z-10"
                          thumbClassName={`w-5 h-5 rounded-full cursor-grab outline-none -top-1 ${hasValidSlots ? 'bg-white border-4 border-blue-600 shadow-md' : 'hidden'}`}
                          trackClassName="h-3 rounded-full"
                          renderTrack={(props, state) => <div {...props} className={`h-3 rounded-full ${state.index === 1 && hasValidSlots ? 'bg-blue-600' : 'bg-transparent'}`} />}
                          min={MIN_TIME} max={MAX_TIME} step={15} value={selectedRange}
                          onChange={handleSliderChange} onAfterChange={handleSliderAfterChange} disabled={!hasValidSlots}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsFormView(true)}
                      disabled={!hasValidSlots}
                      className="w-full py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:bg-[#222326] disabled:text-[#555555] disabled:cursor-not-allowed"
                    >
                      {hasValidSlots ? "下一步：填写预约信息" : "该区域今日无可预约时段"}
                    </button>
                  </div>
                ) : (
                /* 模式 2：表单填写模式 */
                  <div className="animate-in slide-in-from-right-8 fade-in duration-300 space-y-4 lg:space-y-6">
                    <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl p-4 lg:p-5 grid grid-cols-2 gap-3 lg:gap-4">
                      <div><p className="text-[#666666] text-[10px] lg:text-xs mb-1">申请人姓名</p><p className="text-[#EAEAEA] text-xs lg:text-sm font-bold">{applicantName}</p></div>
                      <div><p className="text-[#666666] text-[10px] lg:text-xs mb-1">预约房间</p><p className="text-[#EAEAEA] text-xs lg:text-sm font-bold truncate">{roomDict[selectedRoom.id.toString()]?.name || selectedRoom.name}</p></div>
                      <div className="col-span-2"><p className="text-[#666666] text-[10px] lg:text-xs mb-1">预约时段</p><p className="text-xs lg:text-sm font-bold text-blue-400">{getCurrentDateStr()} {formatTime(selectedRange[0])} 至 {formatTime(selectedRange[1])}</p></div>
                    </div>

                    <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl p-4 lg:p-6">
                      <h4 className="text-[#EAEAEA] text-sm font-bold mb-4">参与成员配置</h4>
                      <div className="flex space-x-2 mb-3">
                        <input 
                          type="text" value={memberInput} onChange={e => setMemberInput(e.target.value)} placeholder="输入学号" 
                          className="flex-1 bg-[#0E0F11] border border-[#2B2D31] rounded-lg px-3 lg:px-4 py-2 text-xs lg:text-sm text-[#EAEAEA] focus:border-blue-500 outline-none transition-colors"
                        />
                        <button onClick={handleAddMember} disabled={isAddingMember} className="bg-[#2B2D31] hover:bg-blue-600 text-[#EAEAEA] hover:text-white px-3 lg:px-4 py-2 rounded-lg transition-colors flex items-center text-xs lg:text-sm font-medium">
                          {isAddingMember ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} className="mr-1 hidden sm:block" />} 添加
                        </button>
                      </div>

                      {teamMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 p-2 lg:p-3 bg-[#0E0F11]/50 rounded-lg border border-[#222326]">
                          {teamMembers.map(m => (
                            <div key={m.id} className="flex items-center bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs">
                              <span>{m.name} <span className="text-blue-400/50 hidden sm:inline">({m.id})</span></span>
                              <button onClick={() => removeMember(m.id)} className="ml-2 hover:text-white"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      {recentMembers.length > 0 && (
                        <div className="mt-4 border-t border-[#222326] pt-3">
                          <button onClick={() => setShowRecent(!showRecent)} className="flex items-center text-[#888888] hover:text-[#EAEAEA] text-[10px] lg:text-xs font-medium w-full transition-colors">
                            {showRecent ? <ChevronUp size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />} 最近选择的成员
                          </button>
                          {showRecent && (
                            <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in duration-200">
                              {recentMembers.map(m => (
                                <button key={m.id} onClick={() => setMemberInput(m.id)} className="text-[10px] lg:text-xs bg-[#222326] hover:bg-[#2B2D31] text-[#A0A0A0] hover:text-[#EAEAEA] border border-[#333333] px-2 py-1 rounded transition-colors">
                                  {m.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#151618] border border-[#2B2D31] rounded-2xl p-4 lg:p-6 space-y-4 lg:space-y-5">
                      <div>
                        <label className="block text-[#888888] text-[10px] lg:text-xs mb-2">预约主题</label>
                        <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full bg-[#0E0F11] border border-[#2B2D31] rounded-lg px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm text-[#EAEAEA] focus:border-blue-500 outline-none transition-colors appearance-none">
                          <option value="3">团队讨论(班团,社团,兴趣小组,项目讨论)</option>
                          <option value="2">课题研讨(导师组会,学术讨论)</option>
                          <option value="1">其他研讨活动(视频会议)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[#888888] text-[10px] lg:text-xs mb-2">申请说明 (必填)</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="简要描述您的使用意图..." className="w-full bg-[#0E0F11] border border-[#2B2D31] rounded-lg px-3 lg:px-4 py-2 text-xs lg:text-sm text-[#EAEAEA] focus:border-blue-500 outline-none transition-colors custom-scrollbar resize-none" />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-[#888888] text-[10px] lg:text-xs mb-2">联系电话 (必填)</label>
                          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="您的手机号码" className="w-full bg-[#0E0F11] border border-[#2B2D31] rounded-lg px-3 lg:px-4 py-2 text-xs lg:text-sm text-[#EAEAEA] focus:border-blue-500 outline-none transition-colors" />
                        </div>
                        <div className="sm:w-1/3">
                          <label className="block text-[#888888] text-[10px] lg:text-xs mb-2">是否公开</label>
                          <select value={isOpen} onChange={e => setIsOpen(e.target.value)} className="w-full bg-[#0E0F11] border border-[#2B2D31] rounded-lg px-3 lg:px-4 py-2 text-xs lg:text-sm text-[#EAEAEA] focus:border-blue-500 outline-none transition-colors appearance-none">
                            <option value="1">公开</option>
                            <option value="0">不公开</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <button onClick={submitBooking} disabled={isSubmitting} className="w-full py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 text-white text-sm lg:text-base font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center justify-center">
                      {isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2"/> 正在提交...</> : '确认预约'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#444444] h-full">
            <Info size={48} className="mb-4 opacity-50" strokeWidth={1.5} />
            <p className="text-sm">在左侧选择一个研讨室开始预约</p>
          </div>
        )}
      </div>
    </div>
  );
}