import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Canvas, 
  FabricImage, 
  Rect, 
  Point, 
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
  Maximize,
  ArrowLeft,
  ChevronRight,
  Maximize2
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
  const [activeTab, setActiveTab] = useState('upload');
  const [fondos, setFondos] = useState([]);
  const [viewportSize, setViewportSize] = useState({ w: 400, h: 750 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const padding = 60;
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
  }, [modelo]);

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
        cornerSize: 10,
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
    }).catch(err => console.error("Error loading image in canvas:", err));
  }, []);

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
    <div className="h-screen w-full bg-[#f3f4f6] flex flex-col overflow-hidden font-sans text-zinc-900">
      
      {/* SVG FILTERS FOR ROBUST MOLD CLIPPING */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="moldFilter">
          {/* 
              Take the original mold image (which has a white case and dark background)
              and turn white pixels transparent, and dark pixels opaque black.
          */}
          <feColorMatrix type="matrix" values="
            0 0 0 0 0
            0 0 0 0 0
            0 0 0 0 0
            -1 -1 -1 1 0
          " />
          {/* Add a strong red drop-shadow for the outline */}
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#E11D2E" />
          <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#E11D2E" />
        </filter>
      </svg>

      {/* HEADER */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wider">{modelo?.nombre || 'Editor'}</h1>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">{modelo?.marca}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={finalizeDesign}
            disabled={loading}
            className="bg-brand-red text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'PROCESANDO...' : 'FINALIZAR'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOLBAR */}
        <aside className="w-20 bg-white border-r border-zinc-200 flex flex-col items-center py-6 gap-6 z-40">
          {[
            { id: 'upload', icon: Upload, label: 'Subir' },
            { id: 'fondos', icon: ImageIcon, label: 'Diseños' },
            { id: 'layers', icon: Layers, label: 'Capas' },
            { id: 'config', icon: MousePointer2, label: 'Ajustes' },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex flex-col items-center gap-1.5 transition-all ${activeTab === tab.id ? 'text-brand-red' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <div className={`p-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-brand-red/10 shadow-inner' : 'group-hover:bg-zinc-50'}`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* CONTEXTUAL DRAWER */}
        <aside className="w-72 bg-white border-r border-zinc-200 p-6 flex flex-col gap-6 z-30 overflow-y-auto shadow-xl">
          {activeTab === 'upload' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Tus Imágenes</h2>
              <label className="w-full aspect-square border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-red hover:bg-brand-red/[0.02] transition-all group active:scale-[0.98]">
                <Upload className="w-5 h-5 text-zinc-400 group-hover:text-brand-red" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Seleccionar</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              </label>
            </div>
          )}
          {activeTab === 'fondos' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Biblioteca</h2>
              <div className="grid grid-cols-2 gap-3">
                {fondos.map(f => (
                  <button key={f.id} onClick={() => addUrlImage(getImageUrl(f.url), f.nombre)} className="aspect-[2/3] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-95">
                    <img src={getImageUrl(f.url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'layers' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Capas</h2>
              <div className="flex flex-col gap-2">
                {images.length === 0 ? <p className="text-[10px] text-zinc-400 text-center py-8 italic">Sin capas</p> : 
                  [...images].reverse().map(img => (
                    <div key={img.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${selectedIdx === img.id ? 'border-brand-red bg-brand-red/5' : 'border-zinc-100 hover:bg-zinc-50'}`}>
                      <span className="text-[10px] font-bold text-zinc-700 truncate w-32 uppercase">{img.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveLayer(img.id, 'up')} className="p-1 hover:text-brand-red transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => deleteLayer(img.id)} className="p-1 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </aside>

        {/* EDITOR MAIN AREA */}
        <main ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden p-10 bg-[#e5e7eb]">
          
          {/* VIEWPORT */}
          <div className="relative shadow-2xl rounded-[2.5rem] overflow-hidden border border-zinc-300 bg-white"
            style={{ width: viewportSize.w, height: viewportSize.h }}
          >
            {/* Checkerboard */}
            <div className="absolute inset-0 z-0 bg-white" style={{
              backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
              backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }} />

            {/* CANVAS */}
            <div className="absolute inset-0 z-10">
              <canvas ref={canvasRef} />
            </div>

            {/* THE MOLD (ROBUST RE-IMPLEMENTATION) */}
            {/* 
                Instead of a PNG mask that might fail, we use the ORIGINAL mold image
                and apply the SVG filter we defined above. This turns the white case transparent
                and keeps the background opaque, WITH a red outline.
            */}
            <img 
              src={getImageUrl(modelo?.molde_url)} 
              alt="Mold Mask"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
              style={{ filter: 'url(#moldFilter)' }}
            />
          </div>

          {/* BOTTOM TOOLBAR */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white px-4 py-2 rounded-2xl shadow-xl z-50">
             <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"><ZoomOut className="w-4 h-4" /></button>
             <span className="text-[10px] font-black w-10 text-center text-zinc-600">{Math.round(canvasZoom * 100)}%</span>
             <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors"><ZoomIn className="w-4 h-4" /></button>
             <div className="w-px h-4 bg-zinc-200 mx-2" />
             <button onClick={() => setPanMode(!panMode)} className={`p-2 rounded-xl transition-all ${panMode ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' : 'text-zinc-500 hover:bg-zinc-100'}`}><Move className="w-4 h-4" /></button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;
