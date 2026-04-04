import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function BookSearch() {
  const [isLoading, setIsLoading] = useState(true);

  const targetUrl = `http://libapi.jayi0908.cn/proxy/http://bis.lib.zju.edu.cn:8003/searchbook/#/search-books`;

  // 用于监听容器宽度并动态计算缩放比例
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // 设定 iframe 强制渲染的“虚拟桌面宽度”
  // 如果学校系统在 1024px 就能正常显示，设为 1024；如果需要更宽，设为 1200
  const VIRTUAL_DESKTOP_WIDTH = 1024; 

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // 如果当前屏幕宽度小于我们设定的桌面宽度，就计算缩小比例
        if (containerWidth < VIRTUAL_DESKTOP_WIDTH) {
          setScale(containerWidth / VIRTUAL_DESKTOP_WIDTH);
        } else {
          // 电脑端屏幕够宽，不需要缩放
          setScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#0E0F11] relative overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-[#222326] shrink-0 bg-[#111214] z-10">
        <h2 className="text-[#EAEAEA] text-sm font-semibold tracking-wide">书目检索</h2>
        {/* <a 
          href={targetUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center text-[#888888] hover:text-[#EAEAEA] text-xs transition-colors"
          title="在浏览器中打开"
        >
          <ExternalLink size={14} className="mr-1.5" />
          <span>外部打开</span>
        </a> */}
      </div>

      {/* iframe 容器：注意 overflow-hidden 和 ref 的绑定 */}
      <div ref={containerRef} className="flex-1 relative w-full bg-white overflow-hidden">
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E0F11] z-20">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
            <p className="text-[#888888] text-sm">正在加载图书馆系统...</p>
          </div>
        )}

        {/* 核心缩放逻辑：
          1. 宽度强行锁死为 VIRTUAL_DESKTOP_WIDTH
          2. 高度为了匹配缩小后的比例，需要反向放大 (100% / scale)
          3. transformOrigin 固定在左上角
        */}
        <iframe
          src={targetUrl}
          onLoad={() => setIsLoading(false)}
          className="absolute top-0 left-0 border-none"
          title="学校图书馆检索系统"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          style={{
            width: scale === 1 ? '100%' : `${VIRTUAL_DESKTOP_WIDTH}px`,
            height: scale === 1 ? '100%' : `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        />
      </div>
    </div>
  );
}