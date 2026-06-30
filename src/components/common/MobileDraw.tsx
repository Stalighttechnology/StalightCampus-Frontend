import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eraser, RotateCcw, Undo, Redo, Save, CheckCircle } from 'lucide-react';
import { API_ENDPOINT } from '@/utils/config';

export default function MobileDraw() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const drawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyStepRef = useRef(-1);

  const resizeCanvas = () => {
    if (containerRef.current && canvasRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Save current drawing
      const currentDrawing = canvas.toDataURL();

      // Resize
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Restore white background
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Restore drawing if we had one, otherwise initialize history
      if (historyStepRef.current > -1) {
        const img = new Image();
        img.src = historyRef.current[historyStepRef.current] || currentDrawing;
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
        };
      } else {
        saveHistory();
      }
    }
  };

  useEffect(() => {
    // Prevent scrolling/bouncing on iOS while drawing
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const saveHistory = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const nextHistory = historyRef.current.slice(0, historyStepRef.current + 1);
    nextHistory.push(dataUrl);
    historyRef.current = nextHistory;
    historyStepRef.current = nextHistory.length - 1;
  };

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates in case canvas bounding box is resized
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    const mouseEvent = e as React.MouseEvent;
    return {
      x: (mouseEvent.clientX - rect.left) * scaleX,
      y: (mouseEvent.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    lastXRef.current = coords.x;
    lastYRef.current = coords.y;
    drawingRef.current = true;
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(coords.x, coords.y);
    
    ctx.strokeStyle = isEraser ? '#ffffff' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastXRef.current = coords.x;
    lastYRef.current = coords.y;
  };

  const stopDrawing = () => {
    if (drawingRef.current) {
      drawingRef.current = false;
      saveHistory();
    }
  };

  const handleUndo = () => {
    if (historyStepRef.current > 0 && canvasRef.current) {
      historyStepRef.current -= 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = historyRef.current[historyStepRef.current];
        img.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const handleRedo = () => {
    if (historyStepRef.current < historyRef.current.length - 1 && canvasRef.current) {
      historyStepRef.current += 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = historyRef.current[historyStepRef.current];
        img.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveHistory();
    }
  };

  const saveCanvasDrawing = async () => {
    if (!canvasRef.current || !sessionId) return;
    setIsSubmitting(true);
    
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      const response = await fetch(`${API_ENDPOINT}/exams/mobile-draw/upload/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          image_data: dataUrl
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        alert("Failed to send drawing: " + data.message);
      }
    } catch (err: any) {
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 p-4 text-center text-slate-500">
        Missing session ID. Please scan the QR code from your desktop again.
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-emerald-50 p-6 text-center">
        <CheckCircle className="text-emerald-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-emerald-900 mb-2">Drawing Sent!</h1>
        <p className="text-emerald-700">Your drawing has been synced successfully. You can now look at your computer and close this window.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 w-full overflow-hidden fixed inset-0">
      
      {/* Top Toolbar - Fully Responsive */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full p-2 bg-white shadow-sm border-b z-10 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsEraser(false)}
            className={`flex items-center justify-center px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!isEraser ? 'bg-[#8b5cf6] text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
          >
            Pen
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${isEraser ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Eraser size={14} /> Eraser
          </button>
        </div>
        
        <div className="flex items-center gap-3 bg-white shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-700">Color:</span>
            <input 
              type="color" 
              value={brushColor} 
              onChange={(e) => {
                setBrushColor(e.target.value);
                setIsEraser(false);
              }}
              className="w-7 h-7 p-0 border-0 rounded cursor-pointer"
              title="Brush Color"
            />
          </div>
          
          <div className="flex items-center gap-2 max-w-[120px]">
            <span className="text-xs text-gray-700 whitespace-nowrap">Size: {brushSize}px</span>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-16 sm:w-24 h-1.5 bg-blue-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleUndo}
            disabled={historyStepRef.current <= 0}
            className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50"
          >
            <Undo size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStepRef.current >= historyRef.current.length - 1}
            className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50"
          >
            <Redo size={14} />
          </button>
          <button
            onClick={clearCanvas}
            className="flex items-center justify-center gap-1 px-2.5 h-8 rounded border border-gray-200 bg-white text-red-500 hover:text-red-600 hover:bg-red-50 text-sm font-medium"
            title="Clear All"
          >
            <RotateCcw size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full bg-white relative touch-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 shrink-0 pb-safe">
        <button
          onClick={saveCanvasDrawing}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-lg shadow-lg disabled:opacity-70 transition-colors"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Save size={24} />
              Save & Send to Desktop
            </>
          )}
        </button>
      </div>

    </div>
  );
}
