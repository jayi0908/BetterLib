import { useState } from 'react';
import { Search, Map, CheckCircle, Crosshair } from 'lucide-react';
import api from '../utils/api';

export default function SeatBooking() {
  const [areaData, setAreaData] = useState<string>('暂未查询');
  const [areaId, setAreaId] = useState('');
  
  // 右侧表单状态
  const [seatId, setSeatId] = useState('');
  const [segment, setSegment] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const fetchVenues = async () => {
    try {
      const res = await api.get('/venues');
      setAreaData(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setAreaData(`错误: ${err.message}`);
    }
  };

  const fetchSeats = async () => {
    if (!areaId) return alert('请输入区域 ID');
    try {
      const res = await api.get(`/seats/${areaId}`);
      setAreaData(JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      setAreaData(`错误: ${err.message}`);
    }
  };

  const reserveSeat = async () => {
    if (!seatId || !segment) return alert('请填写完整的座位和时段信息');
    setIsBooking(true);
    try {
      const res = await api.post('/reserve', {
        seat_id: seatId.trim(),
        segment: segment.trim()
      });
      alert(`预约成功！服务器返回: ${JSON.stringify(res.data)}`);
    } catch (err: any) {
      alert(`预约失败: ${err.message}`);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">座位预约</h2>
        <p className="text-slate-500 mt-2 font-medium">浏览场馆资源并锁定您的专属学习空间</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* 左侧：资源检索区 */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-6">
              <Map className="mr-2 text-blue-500" size={20} />
              场馆与区域检索
            </h3>
            
            <div className="flex space-x-3 mb-6">
              <button 
                onClick={fetchVenues} 
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm"
              >
                查看所有场馆
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="输入区域 ID 查询空座"
                  className="w-full pl-4 pr-12 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                />
                <button 
                  onClick={fetchSeats}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 relative group">
              <span className="absolute top-4 right-4 text-xs font-bold text-slate-400 uppercase tracking-wider">JSON Data</span>
              <pre className="text-xs font-mono text-slate-600 h-100 overflow-y-auto whitespace-pre-wrap">
                {areaData}
              </pre>
            </div>
          </div>
        </div>

        {/* 右侧：快速下单区 */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-0">
             <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
               <Crosshair size={24} />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">锁定座位</h3>
             <p className="text-sm text-slate-500 mb-8">在左侧找到您心仪的座位 ID 和可用时段后，在此处提交预约请求。</p>

             <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">座位编号 (Seat ID)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                    placeholder="例如: 28491"
                    value={seatId}
                    onChange={(e) => setSeatId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">预约时段 (Segment)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium"
                    placeholder="例如: 1445103"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                  />
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={reserveSeat}
                    disabled={isBooking}
                    className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 active:scale-[0.98]"
                  >
                    {isBooking ? '正在提交...' : (
                      <>
                        <CheckCircle size={18} className="mr-2" />
                        立即预订
                      </>
                    )}
                  </button>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}