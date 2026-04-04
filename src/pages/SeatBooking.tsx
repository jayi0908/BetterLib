import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, Check, Loader2, AlertTriangle, Map as MapIcon, List as ListIcon, Armchair, Calendar, Library, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import api from '../utils/api';

// 动态地图渲染引擎
const SeatMapEngine = ({ 
  layoutStr, 
  mapInfo, 
  seats, 
  selectedSeat, 
  onSelect,
  showToast
}: { 
  layoutStr: string, 
  mapInfo: any, 
  seats: any[], 
  selectedSeat: any, 
  onSelect: (s: any) => void,
  showToast: (msg: string, type: 'success' | 'info') => void
}) => {
  const seatDict = useMemo(() => {
    const dict: Record<string, any> = {};
    seats.forEach(s => { dict[s.no] = s; });
    return dict;
  }, [seats]);

  const rows = useMemo(() => layoutStr.split('\n'), [layoutStr]);
  const [scale, setScale] = useState(1);

  // 获取滚动容器的 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 自动计算并居中滚动条
  useEffect(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      // 使用 setTimeout 确保 DOM 尺寸渲染完毕后再进行计算
      setTimeout(() => {
        el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
        el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      }, 50);
    }
  }, [layoutStr, scale]); // 依赖中加入 scale，确保每次缩放都保持居中

  const boardPaddingStyle = useMemo(() => {
    let pt = 64, pb = 64, pl = 64, pr = 64; 

    const hasWindow = (s: string) => mapInfo?.windowSide === s;
    const hasBookshelf = (s: string) => mapInfo?.bookshelfSide === s && mapInfo?.bookshelves?.length > 0;

    const sides = ['N', 'S', 'E', 'W'];
    sides.forEach(side => {
      const w = hasWindow(side);
      const b = hasBookshelf(side);
      
      let pad = 64; 
      if (w && b) pad = 160;       
      else if (b) pad = 120;       
      else if (w) pad = 80;        

      if (side === 'N' && mapInfo?.compass) pad = Math.max(pad, 80);
      if (side === 'E' && mapInfo?.compass) pad = Math.max(pad, 80);

      if (side === 'N') pt = pad;
      if (side === 'S') pb = pad;
      if (side === 'E') pr = pad;
      if (side === 'W') pl = pad;
    });

    return { 
      paddingTop: `${pt}px`, 
      paddingBottom: `${pb}px`, 
      paddingLeft: `${pl}px`, 
      paddingRight: `${pr}px` 
    };
  }, [mapInfo]);

  const getBookshelfContainerClass = (side: string, beginDir: string, endDir: string) => {
    let cls = 'absolute z-20 ';
    const isShared = mapInfo?.windowSide === side;
    
    if (side === 'N') cls += (isShared ? 'top-12 md:top-16 ' : 'top-4 md:top-8 ') + 'left-1/2 -translate-x-1/2 ';
    if (side === 'S') cls += (isShared ? 'bottom-12 md:bottom-16 ' : 'bottom-4 md:bottom-8 ') + 'left-1/2 -translate-x-1/2 ';
    if (side === 'E') cls += (isShared ? 'right-12 md:right-16 ' : 'right-4 md:right-8 ') + 'top-1/2 -translate-y-1/2 ';
    if (side === 'W') cls += (isShared ? 'left-12 md:left-16 ' : 'left-4 md:left-8 ') + 'top-1/2 -translate-y-1/2 ';

    if (beginDir === 'W' && endDir === 'E') cls += 'flex flex-row space-x-3';
    else if (beginDir === 'E' && endDir === 'W') cls += 'flex flex-row-reverse space-x-3 space-x-reverse';
    else if (beginDir === 'N' && endDir === 'S') cls += 'flex flex-col space-y-3';
    else if (beginDir === 'S' && endDir === 'N') cls += 'flex flex-col-reverse space-y-3 space-y-reverse';
    else cls += 'flex flex-row space-x-3'; 

    return cls;
  };

  const getBookshelfShapeClass = (side: string) => {
    if (side === 'N' || side === 'S') return 'w-5 h-16 md:w-6 md:h-20'; 
    return 'w-16 h-5 md:w-20 md:h-6'; 
  };

  return (
  <div className="relative w-full h-full overflow-hidden">
    <div 
      ref={scrollContainerRef} // 绑定 ref 以便控制滚动条
      className="absolute inset-0 overflow-auto custom-scrollbar touch-pan-x touch-pan-y"
    >
      <div className="w-max min-w-full min-h-full p-12 md:p-20 flex pb-40">
        <div 
          className="m-auto transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${scale})` }}
        >
          <div 
            className="relative bg-[#111214] border border-[#2B2D31] rounded-2xl shadow-2xl transition-all duration-300 m-auto"
            style={boardPaddingStyle}
          >

            {/* ========== 1. 方位标 ========== */}
            {mapInfo?.compass && (
              <div className="absolute top-8 md:top-10 right-10 md:right-12 flex flex-col items-center text-[#555555] font-bold select-none">
                <span className="text-[12px] leading-none mb-0.5">{mapInfo.compass}</span>
                <span className="text-[16px] leading-none">▲</span>
              </div>
            )}

            {/* ========== 2. 靠窗区域 ========== */}
            {mapInfo?.windowSide && (
              <div className={`absolute flex items-center text-[#555555] font-bold tracking-widest select-none opacity-80 z-10
                ${mapInfo.windowSide === 'N' ? 'top-6 md:top-8 left-1/2 -translate-x-1/2' : ''}
                ${mapInfo.windowSide === 'S' ? 'bottom-6 md:bottom-8 left-1/2 -translate-x-1/2' : ''}
                ${mapInfo.windowSide === 'W' ? 'left-6 md:left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center' : ''}
                ${mapInfo.windowSide === 'E' ? 'right-6 md:right-8 top-1/2 -translate-y-1/2 rotate-90 origin-center' : ''}
              `}>
                <div className="w-8 md:w-12 h-px bg-[#333] mr-3" />
                <span className="text-[10px] md:text-xs whitespace-nowrap">🪟 靠窗侧</span>
                <div className="w-8 md:w-12 h-px bg-[#333] ml-3" />
              </div>
            )}

            {/* ========== 3. 黄色书架排布 ========== */}
            {mapInfo?.bookshelfSide && mapInfo?.bookshelves?.length > 0 && (
              <div className={getBookshelfContainerClass(mapInfo.bookshelfSide, mapInfo.bookshelfBeginDirection, mapInfo.bookshelfEndDirection)}>
                {mapInfo.bookshelves.map((shelf: any, idx: number) => {
                  if (!shelf.books) {
                    return <div key={idx} className={`${getBookshelfShapeClass(mapInfo.bookshelfSide)}`} />;
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => showToast(`【${shelf.name}】 ${shelf.books}`, 'info')}
                      className={`${getBookshelfShapeClass(mapInfo.bookshelfSide)} bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/60 hover:shadow-[0_0_12px_rgba(234,179,8,0.2)] transition-all flex items-center justify-center cursor-pointer rounded-xs group`}
                      title={`${shelf.name}: ${shelf.books}`}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Library size={12} className="text-yellow-500/50 group-hover:text-yellow-400 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ========== 4. 矩阵座位渲染 ========== */}
            <div className="flex flex-col items-start justify-center space-y-1 relative z-30">
              {rows.map((row, rIdx) => {
                const tokens = row.match(/(\[[a-zA-Z0-9_]+\]|\||\s+)/g);
                if (!tokens || tokens.length === 0 || row.trim() === '') {
                  return <div key={rIdx} className="h-6 md:h-8" />; 
                }

                return (
                  <div key={rIdx} className="flex items-center">
                    {tokens.map((token, cIdx) => {
                      if (token === '|') return <div key={cIdx} className="w-3 h-10 bg-[#3F2E23] border-x border-[#2A1E16] z-10 shadow-sm rounded-[1px]" />;
                      if (token.trim() === '') return <div key={cIdx} style={{ width: `${token.length * 12}px` }} />;
                      if (token.startsWith('[')) {
                        const seatNo = token.slice(1, -1);
                        const seat = seatDict[seatNo];

                        const isAvailable = seat ? seat.status === '1' : false;
                        const isSelected = selectedSeat?.id === seat?.id;

                        let bgClass = 'bg-[#1C1D21] border-[#333333] text-[#444]'; 
                        if (seat) {
                          if (isSelected) bgClass = 'bg-blue-500 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] z-20 scale-105';
                          else {
                            switch (seat.status) {
                              case '1': bgClass = 'bg-white border-gray-200 text-black hover:border-blue-400 hover:shadow-sm'; break;
                              case '6': bgClass = 'bg-blue-600 border-blue-500 text-white opacity-90'; break;
                              case '7': bgClass = 'bg-emerald-600 border-emerald-500 text-white opacity-90'; break;
                              case '2': bgClass = 'bg-red-600 border-red-500 text-white opacity-90'; break;
                              case '8': default: bgClass = 'bg-[#222326] border-[#333333] text-[#555555]'; break;
                            }
                          }
                        }

                        return (
                          <button
                            key={cIdx}
                            disabled={!isAvailable}
                            onClick={() => seat && isAvailable && onSelect(seat)}
                            className={`relative w-11 h-8 md:w-11.5 md:h-8.5 mx-1 rounded-md border flex flex-col items-center justify-center transition-all duration-150 outline-none select-none ${bgClass} ${isAvailable ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed opacity-80'}`}
                          >
                            {isSelected && <div className="absolute -top-1.5 -right-1.5 bg-white w-4 h-4 rounded-full flex items-center justify-center shadow-md border border-gray-100 z-10"><Check size={10} className="text-blue-600" strokeWidth={4} /></div>}
                            <span className="text-[10px] md:text-[11px] font-mono font-extrabold tracking-tighter">{seatNo.slice(-3)}</span>
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 【核心修复 1】：将 bottom-6 调整为 bottom-24 lg:bottom-28，彻底避开底部操作栏的遮挡 */}
    <div className="absolute bottom-24 right-4 lg:bottom-28 lg:right-10 flex flex-col bg-[#1C1D21] border border-[#2B2D31] rounded-xl shadow-xl z-50 overflow-hidden text-[#A0A0A0]">
      <button 
        onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} 
        className="p-3 hover:bg-[#2B2D31] hover:text-white transition-colors border-b border-[#2B2D31] flex items-center justify-center"
        title="放大"
      >
        <ZoomIn size={18} />
      </button>
      <button 
        onClick={() => setScale(1)} 
        className="p-3 hover:bg-[#2B2D31] hover:text-white transition-colors border-b border-[#2B2D31] flex items-center justify-center"
        title="重置缩放"
      >
        <Maximize size={18} />
      </button>
      <button 
        onClick={() => setScale(s => Math.max(s - 0.2, 0.4))} 
        className="p-3 hover:bg-[#2B2D31] hover:text-white transition-colors flex items-center justify-center"
        title="缩小"
      >
        <ZoomOut size={18} />
      </button>
    </div>
  </div>
  );
};


export default function SeatBooking() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [venuesData, setVenuesData] = useState<any>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [selectedPremise, setSelectedPremise] = useState<string | null>(null);
  const [selectedStorey, setSelectedStorey] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map'); 
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seats, setSeats] = useState<any[]>([]);
  const [segment, setSegment] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [seatDict, setSeatDict] = useState<Record<string, any>>({});
  const [mapLayoutStr, setMapLayoutStr] = useState<string>('');
  const [mapInfo, setMapInfo] = useState<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'info' ? 3000 : 2000);
  };

  useEffect(() => { 
    fetchVenues(); 
    fetch('/data/seat_area_dict.json').then(r => r.json()).then(setSeatDict).catch(() => {});
  }, []);

  const fetchVenues = async (dateParam?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/venues', { params: dateParam ? { date: dateParam } : {} });
      const data = res.data?.data || res.data; 
      if (data) {
        setVenuesData(data);
        if (data.date && data.date.length > 0 && !dateParam) {
          setDates(data.date);
          setSelectedDate(data.date[0] || '');
        }

        if (data.premises && data.premises.length > 0) {
          let pId = selectedPremise;
          if (!pId || !data.premises.find((p: any) => p.id === pId)) {
            pId = data.premises[0].id;
            setSelectedPremise(pId);
          }
          
          const relatedStoreys = data.storey?.filter((s: any) => s.parentId === pId) || [];
          let sId = selectedStorey;
          if (!sId || !relatedStoreys.find((s: any) => s.id === sId)) {
            if (relatedStoreys.length > 0) {
              sId = relatedStoreys[0].id;
              setSelectedStorey(sId);
            } else {
              setSelectedStorey(null);
            }
          }
        }
        
        if (dateParam) {
          setSelectedArea(null);
          setSeats([]);
          setIsMobileOpen(false);
        }
      }
    } catch (err) {
      showToast('获取场馆信息失败', 'error');
    } finally { setLoading(false); }
  };

  const handlePremiseChange = (id: string) => {
    setSelectedPremise(id);
    const relatedStoreys = venuesData?.storey?.filter((s: any) => s.parentId === id) || [];
    if (relatedStoreys.length > 0) setSelectedStorey(relatedStoreys[0].id);
    else setSelectedStorey(null);
    setSelectedArea(null);
    setSeats([]);
    setIsMobileOpen(false);
  };

  const handleStoreyChange = (id: string) => {
    setSelectedStorey(id);
    setSelectedArea(null);
    setSeats([]);
    setIsMobileOpen(false);
  };

  const handleAreaChange = async (id: string) => {
    setSelectedArea(id);
    setTimeout(() => setIsMobileOpen(true), 10);
    setLoadingSeats(true);
    try {
      const res = await api.get(`/seats/${id}`, { params: { date: selectedDate } });
      if (res.data) {
        setSegment(res.data.segment);
        setSeats(res.data.seats || []);
        setSelectedSeat(null);
      }

      const path = seatDict[id]?.path;
      if (path) {
        const [txtRes, infoRes] = await Promise.allSettled([
          fetch(`/${path}/seat.txt`).then(r => r.ok ? r.text() : Promise.reject()),
          fetch(`/${path}/info.json`).then(r => r.ok ? r.json() : Promise.reject())
        ]);
        
        setMapLayoutStr(txtRes.status === 'fulfilled' ? txtRes.value : '');
        setMapInfo(infoRes.status === 'fulfilled' ? infoRes.value : null);
      } else {
        setMapLayoutStr('');
        setMapInfo(null);
      }

    } catch (err: any) {
      showToast(err.response?.data?.detail || '获取座位失败', 'error');
      setSeats([]);
    } finally { setLoadingSeats(false); }
  };

  const handleBack = () => {
    setIsMobileOpen(false);
    setTimeout(() => setSelectedArea(null), 300);
  };

  const handleReserve = async () => {
    if (!selectedSeat) return;
    setIsSubmitting(true);
    try {
      const payload = { seat_id: selectedSeat.id, segment: segment };
      const res = await api.post('/seats/book', payload);
      if (res.data && res.data.code === 1) {
        showToast('预约成功！', 'success');
        if (selectedArea) handleAreaChange(selectedArea);
      } else { showToast(res.data?.msg || '预约失败', 'error'); }
    } catch (err) { showToast('预约请求异常', 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const renderCard = (item: any, isSelected: boolean, onClick: () => void) => (
    <div
      key={item.id}
      onClick={onClick}
      className={`relative p-3 rounded-xl cursor-pointer border transition-all duration-200 select-none ${
        isSelected ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 'bg-[#18191B] border-[#2B2D31] hover:border-[#444444]'
      }`}
    >
      {isSelected && <div className="absolute top-0 right-0 bg-blue-500 w-5 h-5 rounded-bl-xl rounded-tr-xl flex items-center justify-center"><Check size={12} className="text-white" strokeWidth={3} /></div>}
      <div className={`text-sm font-bold text-center mt-1 mb-2 ${isSelected ? 'text-blue-400' : 'text-[#EAEAEA]'}`}>{item.name}</div>
      <div className="flex justify-between text-[10px] text-[#888888] font-mono">
        <span>空余: <span className={item.free_num > 0 ? 'text-emerald-400' : 'text-red-400'}>{item.free_num}</span></span>
        <span>总数: {item.total_num}</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-[#0E0F11]">
      {toast && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-100 px-6 py-3 rounded-full flex items-center shadow-2xl animate-in fade-in slide-in-from-top-4 w-11/12 md:w-auto text-center justify-center ${
          toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : 
          toast.type === 'info' ? 'bg-[#2B2D31]/90 backdrop-blur border border-[#444444] text-[#EAEAEA]' :
          'bg-red-500/20 border border-red-500 text-red-400'
        }`}>
          {toast.type === 'error' && <AlertTriangle size={18} className="mr-2 shrink-0" />}
          {toast.type === 'info' && <Library size={18} className="mr-2 text-amber-500 shrink-0" />}
          <span className="text-sm font-bold truncate max-w-62.5 sm:max-w-md">{toast.msg}</span>
        </div>
      )}

      {/* ================= 左栏 ================= */}
      <div className="w-full lg:w-110 border-r border-[#222326] flex flex-col bg-[#111214] shrink-0 h-full z-10">
        <div className="h-14 flex items-center px-6 border-b border-[#222326] shrink-0">
          <h2 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">座位预约检索</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
          <div>
            <h3 className="text-[#888888] text-xs font-bold mb-3">选择日期</h3>
            <div className="flex space-x-3">
              {dates.map(date => {
                const isToday = date === new Date().toISOString().split('T')[0];
                return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); fetchVenues(date); }}
                    className={`relative px-5 py-2.5 rounded-xl border transition-all ${selectedDate === date ? 'bg-blue-600/10 border-blue-500' : 'bg-[#18191B] border-[#2B2D31] hover:bg-[#1C1D21]'}`}
                  >
                    {selectedDate === date && <div className="absolute top-0 right-0 bg-blue-500 w-4 h-4 rounded-bl-lg rounded-tr-xl flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={3} /></div>}
                    <div className={`text-sm font-bold flex items-center ${selectedDate === date ? 'text-blue-400' : 'text-[#EAEAEA]'}`}><Calendar size={14} className="mr-1.5 opacity-70"/>{date}</div>
                    <div className={`text-xs mt-0.5 text-center ${selectedDate === date ? 'text-blue-400/70' : 'text-[#666666]'}`}>{isToday ? '今天' : '明天'}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {loading && !venuesData ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : venuesData ? (
            <>
              <div>
                <h3 className="text-[#888888] text-xs font-bold mb-3">馆舍</h3>
                <div className="grid grid-cols-2 gap-3">{venuesData.premises?.map((p: any) => renderCard(p, selectedPremise === p.id, () => handlePremiseChange(p.id)))}</div>
              </div>
              {selectedPremise && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                  <h3 className="text-[#888888] text-xs font-bold mb-3">楼层</h3>
                  <div className="grid grid-cols-2 gap-3">{venuesData.storey?.filter((s: any) => s.parentId === selectedPremise).map((s: any) => renderCard(s, selectedStorey === s.id, () => handleStoreyChange(s.id)))}</div>
                </div>
              )}
              {selectedStorey && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                  <h3 className="text-[#888888] text-xs font-bold mb-3">区域 (点击直接选座)</h3>
                  <div className="grid grid-cols-2 gap-3 pb-8">{venuesData.area?.filter((a: any) => a.parentId === selectedStorey).map((a: any) => renderCard(a, selectedArea === a.id, () => handleAreaChange(a.id)))}</div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ================= 右栏 ================= */}
      <div className={`
        absolute inset-0 z-40 
        lg:relative lg:inset-auto lg:z-auto lg:flex-1 
        flex flex-col bg-[#0E0F11] overflow-hidden
        transition-transform duration-300 ease-out 
        ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {selectedArea ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-[#222326] bg-[#151618] shrink-0 z-10">
              <div className="flex items-center overflow-hidden mr-4">
                <button onClick={handleBack} className="lg:hidden p-1.5 mr-3 rounded-lg bg-[#1C1D21] border border-[#2B2D31] text-[#A0A0A0] hover:text-white transition-colors shrink-0">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[#EAEAEA] text-sm font-bold truncate">
                  {venuesData?.area?.find((a: any) => a.id === selectedArea)?.nameMerge || '座位选择'}
                </span>
              </div>
              <div className="flex p-0.5 bg-[#0E0F11] border border-[#2B2D31] rounded-lg shrink-0">
                <button onClick={() => setViewMode('map')} className={`flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'map' ? 'bg-[#222326] text-blue-400 shadow-sm' : 'text-[#666666] hover:text-[#A0A0A0]'}`}>
                  <MapIcon size={14} className="mr-1.5" /> 地图
                </button>
                <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-[#222326] text-blue-400 shadow-sm' : 'text-[#666666] hover:text-[#A0A0A0]'}`}>
                  <ListIcon size={14} className="mr-1.5" /> 列表
                </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-[#0E0F11] border-b border-[#222326] flex justify-center space-x-4 text-[10px] text-[#A0A0A0] shrink-0 z-10">
              <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-white border border-gray-300 mr-1.5"/> 空闲</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-blue-600 border border-blue-500 mr-1.5"/> 使用中</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-emerald-600 border border-emerald-500 mr-1.5"/> 暂离</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-red-600 border border-red-500 mr-1.5"/> 已预约</span>
              <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-[#222326] border border-[#333333] mr-1.5"/> 不可用</span>
            </div>

            <div className="flex-1 min-h-0 relative w-full">
              {loadingSeats ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-[#555555]">
                    <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
                    <p className="text-sm">正在加载座位图...</p>
                 </div>
              ) : viewMode === 'map' ? (
                
                mapLayoutStr ? (
                  <SeatMapEngine 
                    layoutStr={mapLayoutStr} 
                    mapInfo={mapInfo}
                    seats={seats} 
                    selectedSeat={selectedSeat} 
                    onSelect={setSelectedSeat} 
                    showToast={showToast}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#444444]">
                    <MapIcon size={48} className="mb-4 opacity-50" strokeWidth={1.5} />
                    <p className="text-sm">该区域暂无平面图数据</p>
                    <button onClick={() => setViewMode('list')} className="mt-4 px-4 py-2 bg-[#1C1D21] border border-[#2B2D31] rounded-lg text-[#A0A0A0] text-xs hover:text-[#EAEAEA]">切换回列表模式</button>
                  </div>
                )

              ) : (
                <div className="absolute inset-0 overflow-y-auto p-4 lg:p-8 custom-scrollbar pb-40">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 lg:gap-3 max-w-7xl mx-auto">
                    {seats.map((seat: any) => {
                      const isAvailable = seat.status === '1';
                      const isSelected = selectedSeat?.id === seat.id;
                      let bgClass = '';
                      if (isSelected) bgClass = 'bg-blue-500 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'; 
                      else {
                        switch (seat.status) {
                          case '1': bgClass = 'bg-white border-gray-200 text-black hover:border-blue-400 hover:shadow-sm'; break;
                          case '6': bgClass = 'bg-blue-600 border-blue-500 text-white opacity-90'; break;
                          case '7': bgClass = 'bg-emerald-600 border-emerald-500 text-white opacity-90'; break;
                          case '2': bgClass = 'bg-red-600 border-red-500 text-white opacity-90'; break;
                          case '8': default: bgClass = 'bg-[#222326] border-[#333333] text-[#555555]'; break;
                        }
                      }

                      return (
                        <button
                          key={seat.id} disabled={!isAvailable} onClick={() => setSelectedSeat(seat)}
                          className={`relative flex items-center justify-center p-2.5 rounded-lg border transition-all duration-150 outline-none select-none ${bgClass} ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                        >
                          {isSelected && <div className="absolute top-0 right-0 bg-white w-4 h-4 rounded-bl-lg rounded-tr-[7px] flex items-center justify-center shadow-sm"><Check size={10} className="text-blue-600" strokeWidth={4} /></div>}
                          <span className="text-xs font-mono font-bold tracking-wide truncate">{seat.no}</span>
                        </button>
                      );
                    })}
                    {seats.length === 0 && !loadingSeats && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#555555]">
                        <Armchair size={40} className="mb-3 opacity-50" />
                        <p className="text-sm">该区域暂无座位数据</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-[#151618]/95 backdrop-blur border-t border-[#222326] px-4 lg:px-8 py-3 lg:py-4 flex justify-between items-center z-50">
              <div className="flex flex-col">
                <span className="text-[10px] lg:text-xs text-[#888888] mb-0.5">已选座位号</span>
                <span className="text-sm lg:text-base font-bold text-blue-400 font-mono">{selectedSeat ? selectedSeat.no : '-'}</span>
              </div>
              <button
                onClick={handleReserve}
                disabled={!selectedSeat || isSubmitting}
                className="px-8 lg:px-12 py-3 lg:py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm lg:text-base font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:bg-[#222326] disabled:text-[#555555] disabled:shadow-none disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2"/> 提交中...</> : '立即预约'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#444444]">
            <Armchair size={48} className="mb-4 opacity-50" strokeWidth={1.5} />
            <p className="text-sm">请在左侧选择需要预约的区域</p>
          </div>
        )}
      </div>
    </div>
  );
}