import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Canvas, 
  FabricImage, 
  util 
} from 'fabric';
import axios from 'axios';
import { 
  Upload, 
  Image as ImageIcon, 
  Layers, 
  MousePointer2, 
  Move, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft,
  ChevronRight,
  Maximize2,
  RotateCw,
  AlignCenter,
  FlipHorizontal,
  X
} from 'lucide-react';
import { API_URL, getImageUrl } from '../config';

const Editor = () => {
  const { modeloId } = useParams();
  const navigate = useNavigate();
  
  // Refs
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const containerRef = useRef(null);
  const imageCountRef = useRef(0);

  // Constants for coordinate system
  const W = 400; 
  const H = 750; 

  // State
  const [modelo, setModelo] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // null = closed on mobile
  const [fondos, setFondos] = useState([]);
  const [viewportSize, setViewportSize] = useState({ w: 400, h: 750 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle Resize & Mobile Detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load Data
  useEffect(() => {
    const load = async () => {
      try {
        const [resMod, resFon] = await Promise.all([
          axios.get(`${API_URL}/modelos/${modeloId}`),
          axios.get(`${API_URL}/fondos`)
        ]);
        setModelo(resMod.data);
        setFondos(resFon.data);
      } catch (err) {
        console.error('Error loading editor data:', err);
      }
    };
    load();
  }, [modeloId]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !modelo) return;

    const canvas = new Canvas(canvasRef.current, {
      width: W,
      height: H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    // Load SVG ClipPath if available
    if (modelo.molde_svg_path) {
       util.loadSVGFromURL(getImageUrl(modelo.molde_svg_path), (objects, options) => {
          const group = util.groupSVGElements(objects, options);
          group.set({
             left: W / 2,
             top: H / 2,
             originX: 'center',
             originY: 'center',
             selectable: false,
             evented: false
          });
          canvas.clipPath = group;
          canvas.renderAll();
       });
    }

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active && active._imgIdx !== undefined) {
        setSelectedIdx(active._imgIdx);
      } else {
        setSelectedIdx(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedIdx(null));

    const updateSize = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const padding = isMobile ? 20 : 60;
      const maxW = cw - padding;
      const maxH = ch - padding;
      let rw = maxW;
      let rh = rw * (H / W);
      if (rh > maxH) {
        rh = maxH;
        rw = rh * (W / H);
      }
      setViewportSize({ w: rw, h: rh });
      canvas.setDimensions({ width: rw, height: rh });
      const zoom = rw / W;
      canvas.setZoom(zoom);
      canvas.renderAll();
      setCanvasZoom(zoom);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [modelo, isMobile]);

  // --------------------------------------------------------
  // IMAGE ACTIONS
  // --------------------------------------------------------

  const addImageToCanvas = useCallback((url, name, isTexture = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newId = imageCountRef.current++;
    
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((fabricImg) => {
      fabricImg.set({
        left: W / 2,
        top: H / 2,
        originX: 'center',
        originY: 'center',
        cornerColor: '#E11D2E',
        cornerStrokeColor: '#ffffff',
        borderColor: '#E11D2E',
        cornerSize: isMobile ? 32 : 12, // Bigger handles on mobile
        touchCornerSize: 48,
        cornerStyle: 'circle',
        transparentCorners: false,
        borderScaleFactor: 2.5,
        padding: 8,
      });
      const scale = isTexture 
        ? Math.max(W / fabricImg.width, H / fabricImg.height)
        : Math.max((W * 0.6) / fabricImg.width, (H * 0.4) / fabricImg.height);
      fabricImg.scale(scale);
      fabricImg._imgIdx = newId;
      canvas.add(fabricImg);
      canvas.setActiveObject(fabricImg);
      canvas.renderAll();
      setImages(prev => [...prev, { id: newId, name: name.substring(0, 15), fabricObj: fabricImg }]);
      setSelectedIdx(newId);
      if (isMobile) setActiveTab(null); // Close drawer on mobile after adding
    }).catch(err => console.error("Error loading image in canvas:", err));
  }, [isMobile]);

  const addImage = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => addImageToCanvas(e.target.result, file.name);
    reader.readAsDataURL(file);
  }, [addImageToCanvas]);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => addImage(f));
    e.target.value = '';
  };

  const addUrlImage = useCallback((url, name) => {
    addImageToCanvas(url, name, true);
  }, [addImageToCanvas]);

  // --------------------------------------------------------
  // QUICK ACTIONS
  // --------------------------------------------------------
  const rotateImage = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (active) {
      active.rotate((active.angle || 0) + 90);
      canvas.renderAll();
    }
  };

  const centerImage = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (active) {
      active.set({ left: W / 2, top: H / 2 });
      canvas.renderAll();
    }
  };

  const flipImage = () => {
    const canvas = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (active) {
      active.set('flipX', !active.flipX);
      canvas.renderAll();
    }
  };

  // --------------------------------------------------------
  // LAYER CONTROLS
  // --------------------------------------------------------

  const deleteLayer = (idx) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const item = images.find(img => img.id === idx);
    if (item) {
      canvas.remove(item.fabricObj);
      setImages(prev => prev.filter(img => img.id !== idx));
      setSelectedIdx(null);
      canvas.renderAll();
    }
  };

  const moveLayer = (idx, dir) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const item = images.find(img => img.id === idx);
    if (!item) return;
    if (dir === 'up') item.fabricObj.bringForward();
    else item.fabricObj.sendBackwards();
    const objs = canvas.getObjects();
    const sorted = [...images].sort((a, b) => objs.indexOf(a.fabricObj) - objs.indexOf(b.fabricObj));
    setImages(sorted);
    canvas.renderAll();
  };

  const finalizeDesign = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setLoading(true);
    
    // Generate high-res base64
    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width: W, height: H });
    
    const diseno_base64 = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });

    canvas.setZoom(currentZoom);
    canvas.setDimensions({ width: viewportSize.w, height: viewportSize.h });
    
    setLoading(false);
    navigate('/checkout', { state: { modelo, diseno_base64 } });
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col overflow-hidden font-sans text-zinc-900 relative">
      
      {/* SVG FILTERS */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="moldFilter">
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1 -1 -1 1 0" />
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#E11D2E" />
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#E11D2E" />
        </filter>
      </svg>

      {/* HEADER */}
      <header className="h-14 md:h-16 bg-[#121212] border-b border-white/5 px-4 md:px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="hidden sm:block">
            <h1 className="text-xs font-black uppercase tracking-widest text-white leading-none">{modelo?.nombre || 'Editor'}</h1>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight mt-1">{modelo?.marca}</p>
          </div>
        </div>

        <button 
          onClick={finalizeDesign}
          disabled={loading}
          className="bg-brand-red text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {loading ? '...' : 'FINALIZAR'} <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR / MOBILE BOTTOM BAR */}
        <aside className={`
          ${isMobile ? 'fixed bottom-0 left-0 right-0 h-20 flex-row px-4' : 'w-20 border-r flex-col py-6'}
          bg-[#121212]/95 backdrop-blur-xl border-white/5 flex items-center justify-around z-40 transition-all
        `}>
          {[
            { id: 'upload', icon: Upload, label: 'Subir' },
            { id: 'fondos', icon: ImageIcon, label: 'Diseños' },
            { id: 'layers', icon: Layers, label: 'Capas' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
              className={`group flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-brand-red' : 'text-zinc-500 hover:text-white'}`}
            >
              <div className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-brand-red/10 scale-110 shadow-inner' : 'hover:bg-white/5'}`}>
                <tab.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* CONTEXTUAL DRAWER (MOBILE BOTTOM SHEET / DESKTOP SIDEBAR) */}
        {activeTab && (
          <div className={`
            fixed z-50 transition-all duration-300 ease-out
            ${isMobile ? 'inset-x-0 bottom-20 bg-[#181818] rounded-t-[2.5rem] border-t border-white/10 shadow-2xl-up h-[60vh]' : 'left-20 top-0 bottom-0 w-80 bg-[#121212]/98 border-r border-white/5 shadow-2xl'}
          `}>
            <div className="h-full flex flex-col p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  {activeTab === 'upload' ? 'Mis Imágenes' : activeTab === 'fondos' ? 'Biblioteca' : 'Mis Capas'}
                </h2>
                <button onClick={() => setActiveTab(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {activeTab === 'upload' && (
                  <label className="w-full aspect-square border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-red/50 hover:bg-brand-red/5 transition-all group active:scale-[0.98]">
                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-brand-red/10 transition-colors">
                      <Upload className="w-6 h-6 text-zinc-500 group-hover:text-brand-red" />
                    </div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sube tu Imagen</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                  </label>
                )}
                {activeTab === 'fondos' && (
                  <div className="grid grid-cols-2 gap-3 pb-8">
                    {fondos.map(f => (
                      <button key={f.id} onClick={() => addUrlImage(getImageUrl(f.url), f.nombre)} className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 hover:border-brand-red transition-all active:scale-95">
                        <img src={getImageUrl(f.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === 'layers' && (
                  <div className="flex flex-col gap-3 pb-8">
                    {images.length === 0 ? <div className="text-center py-20 opacity-20"><Layers className="w-10 h-10 mx-auto mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">Sin Capas</p></div> : 
                      [...images].reverse().map(img => (
                        <div key={img.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedIdx === img.id ? 'border-brand-red bg-brand-red/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                          <span className="text-[10px] font-black text-zinc-300 truncate w-32 uppercase tracking-tight">{img.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => moveLayer(img.id, 'up')} className="p-2 hover:text-brand-red transition-colors"><ChevronUp className="w-4 h-4" /></button>
                            <button onClick={() => deleteLayer(img.id)} className="p-2 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EDITOR MAIN AREA */}
        <main ref={containerRef} className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden p-4 md:p-10 bg-[#080808] ${isMobile ? 'pb-24' : ''}`}>
          
          {/* BACKGROUND TEXTURE */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }} />

          {/* VIEWPORT */}
          <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden border border-white/5 bg-[#121212]"
            style={{ width: viewportSize.w, height: viewportSize.h }}
          >
            {/* Checkerboard */}
            <div className="absolute inset-0 z-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)',
              backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }} />

            {/* CANVAS */}
            <div className="absolute inset-0 z-10">
              <canvas ref={canvasRef} />
            </div>

            {/* THE MOLD OVERLAY */}
            <img 
              src={getImageUrl(modelo?.molde_url)} 
              alt="Mold"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
              style={{ filter: 'url(#moldFilter)' }}
            />
          </div>

          {/* QUICK ACTIONS BAR (FLOATING) */}
          {selectedIdx !== null && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-1 md:gap-2 bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 md:p-2 rounded-[2rem] shadow-2xl z-30">
              <button onClick={rotateImage} className="p-2.5 md:p-3 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"><RotateCw className="w-4 h-4 md:w-5 md:h-5" /></button>
              <button onClick={centerImage} className="p-2.5 md:p-3 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"><AlignCenter className="w-4 h-4 md:w-5 md:h-5" /></button>
              <button onClick={flipImage} className="p-2.5 md:p-3 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"><FlipHorizontal className="w-4 h-4 md:w-5 md:h-5" /></button>
              <div className="w-px h-6 bg-white/10 mx-1 md:mx-2" />
              <button onClick={() => deleteLayer(selectedIdx)} className="p-2.5 md:p-3 hover:bg-red-500/20 rounded-full text-red-500 transition-all"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
            </div>
          )}

          {/* ZOOM / PAN CONTROLS */}
          {!isMobile && (
            <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50">
               <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-zinc-400 transition-all"><ZoomIn className="w-5 h-5" /></button>
               <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-zinc-400 transition-all"><ZoomOut className="w-5 h-5" /></button>
               <button onClick={() => setPanMode(!panMode)} className={`p-3 border rounded-2xl transition-all ${panMode ? 'bg-brand-red text-white border-brand-red' : 'bg-white/5 text-zinc-400 border-white/5'}`}><Move className="w-5 h-5" /></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Editor;
