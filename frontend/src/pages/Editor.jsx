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
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Refs
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const containerRef = useRef(null);
  const imageCountRef = useRef(0);

  // Constants for coordinate system
  const W = 400; // Base Width
  const H = 750; // Base Height

  // State
  const [modelo, setModelo] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [fondos, setFondos] = useState([]);
  const [viewportSize, setViewportSize] = useState({ w: 400, h: 750 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);

  // Helper for URLs
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  // Load Data
  useEffect(() => {
    const load = async () => {
      try {
        const [resMod, resFon] = await Promise.all([
          axios.get(`${API_URL}/api/modelos/${id}`),
          axios.get(`${API_URL}/api/fondos`)
        ]);
        setModelo(resMod.data);
        setFondos(resFon.data);
      } catch (err) {
        console.error('Error loading editor data:', err);
      }
    };
    load();
  }, [id]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !modelo) return;

    // Create Canvas
    const canvas = new Canvas(canvasRef.current, {
      width: W,
      height: H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    // Selection Handling
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

    // Handle Resize
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
    
    // v7 signature: fromURL(url, {crossOrigin}, imageOptions)
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

      setImages(prev => [...prev, { 
        id: newId, 
        name: name.substring(0, 15), 
        fabricObj: fabricImg 
      }]);
      setSelectedIdx(newId);
    }).catch(err => console.error("Error loading image in canvas:", err));
  }, []);

  const addImage = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
       addImageToCanvas(e.target.result, file.name);
    };
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
    
    // Sync state array with canvas order
    const objs = canvas.getObjects();
    const sorted = [...images].sort((a, b) => {
      return objs.indexOf(a.fabricObj) - objs.indexOf(b.fabricObj);
    });
    setImages(sorted);
    canvas.renderAll();
  };

  const finalizeDesign = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    // Reset zoom for high-res export
    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width: W, height: H });
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // High res
    });

    // Restore zoom
    canvas.setZoom(currentZoom);
    canvas.setDimensions({ width: viewportSize.w, height: viewportSize.h });
    
    alert('Diseño listo para producción. En un sistema real, aquí se guardaría en el servidor.');
  };

  return (
    <div className="h-screen w-full bg-[#f3f4f6] flex flex-col overflow-hidden font-sans text-zinc-900">
      
      {/* HEADER / NAVIGATION */}
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
          <div className="flex bg-zinc-100 rounded-lg p-1 mr-4">
             <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-400 hover:text-zinc-900"><Undo2 className="w-4 h-4" /></button>
             <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-400 hover:text-zinc-900"><Redo2 className="w-4 h-4" /></button>
          </div>
          <button 
            onClick={finalizeDesign}
            className="bg-brand-red text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 flex items-center gap-2 active:scale-95"
          >
            FINALIZAR <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT TOOLBAR (Icons Only) */}
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
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-brand-red/10 transition-colors">
                  <Upload className="w-5 h-5 text-zinc-400 group-hover:text-brand-red" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Seleccionar Archivo</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              </label>
            </div>
          )}

          {activeTab === 'fondos' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Biblioteca de Diseños</h2>
              <div className="grid grid-cols-2 gap-3">
                {fondos.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => addUrlImage(getImageUrl(f.url), f.nombre)}
                    className="aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-100 hover:border-brand-red transition-all active:scale-95 shadow-sm hover:shadow-md"
                  >
                    <img src={getImageUrl(f.url)} alt={f.nombre} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Capas Activas</h2>
              <div className="flex flex-col gap-2">
                {images.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic text-center py-8">No hay imágenes en el lienzo</p>
                ) : (
                  [...images].reverse().map((img) => (
                    <div key={img.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${selectedIdx === img.id ? 'border-brand-red bg-brand-red/5' : 'border-zinc-100 hover:bg-zinc-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-200 overflow-hidden shrink-0">
                           <img src={img.fabricObj.getSrc()} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-700 truncate w-24 uppercase">{img.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveLayer(img.id, 'up')} className="p-1 hover:text-brand-red transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => deleteLayer(img.id)} className="p-1 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        {/* EDITOR MAIN AREA */}
        <main ref={containerRef} className="flex-1 flex items-center justify-center relative overflow-hidden p-10 bg-[#e5e7eb]">
          
          {/* Shadow behind the case */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[640px] rounded-[3.5rem] bg-black/10 blur-3xl pointer-events-none" />

          {/* VIEWPORT */}
          <div 
            className="relative shadow-2xl rounded-[2.5rem] overflow-hidden border border-zinc-300 bg-white"
            style={{ 
              width: viewportSize.w, 
              height: viewportSize.h,
              transition: 'width 0.2s, height 0.2s'
            }}
          >
            {/* White/Gray Checkerboard */}
            <div className="absolute inset-0 z-0 bg-white"
              style={{
                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />

            {/* CANVAS LAYER */}
            <div className="absolute inset-0 z-10">
              <canvas ref={canvasRef} />
            </div>

            {/* MASK OVERLAY */}
            <img 
              src={getImageUrl(modelo?.molde_mask_url || modelo?.molde_url)} 
              alt="Mask"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
              style={{ width: '100%', height: '100%' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* BOTTOM TOOLBAR (Zoom, etc) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 backdrop-blur-xl border border-white px-4 py-2 rounded-2xl shadow-xl shadow-black/5 z-50">
             <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500"><ZoomOut className="w-4 h-4" /></button>
             <span className="text-[10px] font-black w-10 text-center text-zinc-600">{Math.round(canvasZoom * 100)}%</span>
             <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500"><ZoomIn className="w-4 h-4" /></button>
             <div className="w-px h-4 bg-zinc-200 mx-2" />
             <button 
               onClick={() => setPanMode(!panMode)}
               className={`p-2 rounded-xl transition-all ${panMode ? 'bg-brand-red text-white' : 'hover:bg-zinc-100 text-zinc-500'}`}
             >
               <Move className="w-4 h-4" />
             </button>
             <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-zinc-500"><Maximize2 className="w-4 h-4" /></button>
          </div>

        </main>
      </div>
    </div>
  );
};

export default Editor;
