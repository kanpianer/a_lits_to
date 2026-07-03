import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const startIdx = content.indexOf('const startDrag = (e: React.PointerEvent) => {');
const endIdx = content.indexOf('const cancelDrag = () => {');

if (startIdx !== -1 && endIdx !== -1) {
  const startDragReplacement = `const startDrag = (e: React.PointerEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      isDragging.current = true;
      dragControls.start(e);
      if (navigator.vibrate) navigator.vibrate(50);
      
      const container = document.getElementById("task-scroll-container");
      if (!container) return;
      
      const initialScrollHeight = container.scrollHeight;
      const maxScrollTop = initialScrollHeight - container.clientHeight;
      
      const scrollState = { speed: 0, raf: null as number | null };
      
      const handlePointerMove = (moveEvent: PointerEvent | TouchEvent) => {
        if (!isDragging.current) return;
        
        const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as PointerEvent).clientY;
        
        const rect = container.getBoundingClientRect();
        const threshold = 100;
        const maxSpeed = 20;
        
        if (clientY < rect.top + threshold) {
          scrollState.speed = -maxSpeed * (1 - Math.max(0, clientY - rect.top) / threshold);
        } else if (clientY > rect.bottom - threshold) {
          scrollState.speed = maxSpeed * (1 - Math.max(0, rect.bottom - clientY) / threshold);
        } else {
          scrollState.speed = 0;
        }
        
        if (scrollState.speed !== 0 && !scrollState.raf) {
          const scrollLoop = () => {
            if (scrollState.speed !== 0 && isDragging.current) {
              let newScrollTop = container.scrollTop + scrollState.speed;
              if (newScrollTop > maxScrollTop) newScrollTop = maxScrollTop;
              if (newScrollTop < 0) newScrollTop = 0;
              container.scrollTop = newScrollTop;
              scrollState.raf = requestAnimationFrame(scrollLoop);
            } else {
              scrollState.raf = null;
            }
          };
          scrollState.raf = requestAnimationFrame(scrollLoop);
        }
      };
      
      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("touchmove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("touchend", handlePointerUp);
        scrollState.speed = 0;
        if (scrollState.raf) {
          cancelAnimationFrame(scrollState.raf);
          scrollState.raf = null;
        }
      };
      
      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("touchmove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("touchend", handlePointerUp);
    }, 300);
  };

  `;

  content = content.slice(0, startIdx) + startDragReplacement + content.slice(endIdx);
  fs.writeFileSync('src/App.tsx', content);
}
