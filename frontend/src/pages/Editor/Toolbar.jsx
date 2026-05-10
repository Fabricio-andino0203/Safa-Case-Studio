import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Download, Undo, Redo } from 'lucide-react';
import { useEditorStore } from './store';

const Toolbar = () => {
  const navigate = useNavigate();
  const { modelo, canvas, baseWidth, baseHeight, centerX, centerY } = useEditorStore();

  const handleFinalize = () => {
    if (!canvas) return;
    
    const overlay = canvas.getObjects().find(o => o.id === 'mold-overlay');
    const outline = canvas.getObjects().find(o => o.id === 'mold-outline');
    
    // 1. Hide the red guide outline and the overlay mask so they don't print
    if (outline) outline.set('visible', false);
    if (overlay) overlay.set('visible', false);
    
    // 2. (Clip path is no longer used, so we don't need to clear it)
    // const originalClipPath = canvas.clipPath;
    // canvas.clipPath = null;
    
    // 3. Save current zoom/pan and reset to default for accurate cropping
    const originalVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    
    let options = { format: 'png', multiplier: 3 };
    
    // 4. Crop exactly to the physical artboard dimensions
    // Using baseWidth/baseHeight and centerX/centerY guarantees a perfect 1:1 aspect ratio
    options.left = centerX - baseWidth / 2;
    options.top = centerY - baseHeight / 2;
    options.width = baseWidth;
    options.height = baseHeight;
    
    // Ensure canvas has a background (optional, but good for printing)
    // If the user didn't set a background color, it will be transparent.
    // That's fine, printers usually ignore transparent pixels.
    
    const diseno_base64 = canvas.toDataURL(options);
    
    // 5. Restore everything
    canvas.setViewportTransform(originalVpt);
    // canvas.clipPath = originalClipPath;
    if (outline) outline.set('visible', true);
    if (overlay) overlay.set('visible', true);
    canvas.renderAll();

    navigate('/checkout', { state: { modelo, diseno_base64 } });
  };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-50">
      <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 sm:p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {modelo && (
          <div className="flex flex-col min-w-0">
            <h1 className="text-[10px] sm:text-sm font-black uppercase tracking-widest text-zinc-900 leading-none truncate">
              {modelo.nombre}
            </h1>
            <span className="text-[8px] sm:text-[10px] text-brand-red font-bold uppercase mt-0.5 tracking-wider truncate">
              {modelo.marca}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Undo / Redo - Desktop only for now to save space, or icons only */}
        <div className="hidden sm:flex items-center gap-1 border-r border-zinc-200 pr-4 mr-2">
           <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Undo className="w-4 h-4" /></button>
           <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Redo className="w-4 h-4" /></button>
        </div>

        <button 
          onClick={handleFinalize} 
          className="bg-brand-red text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-red-700 flex items-center gap-1 sm:gap-2 shadow-lg shadow-brand-red/20 transition-all active:scale-95 whitespace-nowrap"
        >
          Siguiente <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
