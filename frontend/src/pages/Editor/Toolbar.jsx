import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Download, Undo, Redo } from 'lucide-react';
import { useEditorStore } from './store';

const Toolbar = () => {
  const navigate = useNavigate();
  const { modelo, canvas, baseWidth, baseHeight, centerX, centerY } = useEditorStore();

  const handleFinalize = () => {
    if (!canvas) return;
    
    const moldClip = canvas.getObjects().find(o => o.id === 'mold-clip');
    const outline = canvas.getObjects().find(o => o.id === 'mold-outline');
    
    // 1. Hide the red guide outline so it doesn't print
    if (outline) outline.set('visible', false);
    
    // 2. Remove the SVG clipping mask to get a solid production rectangle
    const originalClipPath = canvas.clipPath;
    canvas.clipPath = null;
    
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
    canvas.clipPath = originalClipPath;
    if (outline) outline.set('visible', true);
    canvas.renderAll();

    navigate('/checkout', { state: { modelo, diseno_base64 } });
  };

  return (
    <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-50">
      <div className="flex items-center gap-3 sm:gap-6">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {modelo && (
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-900 leading-none">
              {modelo.nombre}
            </h1>
            <span className="text-[9px] sm:text-[10px] text-brand-red font-bold uppercase mt-0.5 tracking-wider">
              {modelo.marca}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Undo / Redo - Desktop only for now to save space, or icons only */}
        <div className="hidden sm:flex items-center gap-1 border-r border-zinc-200 pr-4 mr-2">
           <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Undo className="w-4 h-4" /></button>
           <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"><Redo className="w-4 h-4" /></button>
        </div>

        <button 
          onClick={handleFinalize} 
          className="bg-brand-red text-white px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-brand-red/20 transition-all active:scale-95"
        >
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
