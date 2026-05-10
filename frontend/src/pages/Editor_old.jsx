import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as fabric from 'fabric';
import axios from 'axios';
import { 
  Upload, 
  Image as ImageIcon, 
  Layers, 
  Move, 
  ChevronUp, 
  Trash2, 
  ArrowLeft,
  ChevronRight,
  RotateCw,
  AlignCenter,
  FlipHorizontal,
  X,
  Loader2,
  ZoomIn,
  ZoomOut
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

  // Constants
  const [W, setW] = useState(500); 
  const [H, setH] = useState(800); 
  const [modelo, setModelo] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [fondos, setFondos] = useState([]);
  const [viewportSize, setViewportSize] = useState({ w: 500, h: 800 });
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Load Data
  useEffect(() => {
    const load = async () => {
      try {
        console.log("Loading model:", modeloId);
        const [resMod, resFon] = await Promise.all([
          axios.get(`${API_URL}/modelos/${modeloId}`),
          axios.get(`${API_URL}/fondos`)
        ]);
        setModelo(resMod.data);
        setFondos(resFon.data);
        
        if (resMod.data.ancho_impresion && resMod.data.alto_impresion) {
          const ratio = resMod.data.ancho_impresion / resMod.data.alto_impresion;
          const baseHeight = 700;
          const baseWidth = baseHeight * ratio;
          // Mesa de Trabajo: 100px larger than the mold
          setW(baseWidth + 100);
          setH(baseHeight + 100);
        }
      } catch (err) {
        console.error('Error loading editor data:', err);
      }
    };
    load();
  }, [modeloId]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !modelo || !W || !H) return;

    console.log("Initializing Fabric.js Canvas...");
    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: W,
        height: H,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
      });

      fabricRef.current = canvas;

      // Perfect SVG Mask & Outline using Callback approach (proven to work)
      if (modelo.molde_svg_path) {
        const svgUrl = getImageUrl(modelo.molde_svg_path);
        
        // 1. Load for Clip Path
        fabric.util.loadSVGFromURL(svgUrl, (objects, options) => {
          if (!objects) return;
          
          const padding = 100;
          const mW = W - padding;
          const mH = H - padding;

          const clipGroup = fabric.util.groupSVGElements(objects, options);
          clipGroup.getObjects().forEach(obj => {
            obj.set({ fill: '#000000', stroke: null }); // Solid mask
          });
          clipGroup.set({
            originX: 'center', originY: 'center',
            left: W / 2, top: H / 2,
            scaleX: mW / (clipGroup.width || 1),
            scaleY: mH / (clipGroup.height || 1),
            absolutePositioned: true
          });
          
          canvas.clipPath = clipGroup;
          canvas.renderAll();

          // 2. Load AGAIN for Outline (prevents object mutation bugs)
          fabric.util.loadSVGFromURL(svgUrl, (obj2, opt2) => {
             if (!obj2) return;
             const outlineGroup = fabric.util.groupSVGElements(obj2, opt2);
             outlineGroup.getObjects().forEach(obj => {
                obj.set({ fill: null, stroke: '#E11D2E', strokeWidth: 4 }); 
             });
             outlineGroup.set({
               originX: 'center', originY: 'center',
               left: W / 2, top: H / 2,
               scaleX: mW / (outlineGroup.width || 1),
               scaleY: mH / (outlineGroup.height || 1),
               selectable: false, evented: false
             });
             canvas.add(outlineGroup);
             canvas.renderAll();
          });
        });
      }

      const handleSelection = () => {
        const active = canvas.getActiveObject();
        setSelectedIdx(active?._imgIdx ?? null);
      };

      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', () => setSelectedIdx(null));

      const updateSize = () => {
        if (!containerRef.current || !fabricRef.current) return;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const padding = 20; 
        const maxW = Math.max(100, cw - padding);
        const maxH = Math.max(100, ch - padding);
        
        let rw = maxW;
        let rh = rw * (H / W);
        if (rh > maxH) {
          rh = maxH;
          rw = rh * (W / H);
        }

        setViewportSize({ w: rw, h: rh });
        fabricRef.current.setDimensions({ width: rw, height: rh });
        fabricRef.current.setZoom(rw / W);
        fabricRef.current.renderAll();
      };

      updateSize();
      window.addEventListener('resize', updateSize);
      
      return () => {
        window.removeEventListener('resize', updateSize);
        canvas.dispose();
        fabricRef.current = null;
      };
    } catch (err) {
      console.error("Canvas Initialization Error:", err);
    }
  }, [modelo, W, H]);

  // Actions
  const addImageToCanvas = useCallback((url, name, isTexture = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newId = imageCountRef.current++;
    
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: W / 2, top: H / 2, originX: 'center', originY: 'center',
        cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', cornerStyle: 'circle',
        transparentCorners: false, cornerSize: 12, padding: 8
      });
      const scale = isTexture 
        ? Math.max((W - 100) / img.width, (H - 100) / img.height)
        : Math.max(((W - 100) * 0.8) / img.width, ((H - 100) * 0.6) / img.height);
      img.scale(scale);
      img._imgIdx = newId;
      canvas.add(img);
      img.sendToBack(); 
      canvas.setActiveObject(img);
      canvas.renderAll();
      setImages(prev => [...prev, { id: newId, name, fabricObj: img }]);
      setSelectedIdx(newId);
    });
  }, [W, H]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addImageToCanvas(ev.target.result, file.name);
    reader.readAsDataURL(file);
    e.target.value = '';
    setActiveTab(null); // Close drawer after upload
  };

  const finalizeDesign = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const diseno_base64 = canvas.toDataURL({ format: 'png', multiplier: 2 });
    navigate('/checkout', { state: { modelo, diseno_base64 } });
  };

  if (!modelo) return <div className="h-screen w-full bg-white flex items-center justify-center text-zinc-900 font-bold uppercase tracking-widest animate-pulse">Cargando Editor...</div>;

  return (
    <div className="h-screen w-full bg-white flex flex-col overflow-hidden font-sans text-zinc-900">
      
      {/* Header */}
      <header className="h-12 bg-white border-b border-zinc-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black uppercase tracking-widest leading-none text-zinc-900">{modelo.nombre}</h1>
            <span className="text-[8px] text-zinc-400 font-bold uppercase mt-0.5">{modelo.marca}</span>
          </div>
        </div>
        <button onClick={finalizeDesign} className="bg-brand-red text-white px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-700 flex items-center gap-1.5 shadow-lg shadow-brand-red/20 transition-all active:scale-95">
          FINALIZAR <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (Ultra Compact) */}
        <aside className="w-14 border-r flex flex-col py-4 items-center justify-start gap-8 bg-white z-40 relative">
          <button onClick={() => setActiveTab(activeTab === 'upload' ? null : 'upload')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'upload' ? 'text-brand-red' : 'text-zinc-400 hover:text-zinc-900'}`}>
            <div className={`p-2.5 rounded-xl ${activeTab === 'upload' ? 'bg-red-50' : 'hover:bg-zinc-50'}`}><Upload className="w-5 h-5" /></div>
            <span className="text-[7px] font-black uppercase tracking-tighter">Subir</span>
          </button>
          <button onClick={() => setActiveTab(activeTab === 'fondos' ? null : 'fondos')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'fondos' ? 'text-brand-red' : 'text-zinc-400 hover:text-zinc-900'}`}>
            <div className={`p-2.5 rounded-xl ${activeTab === 'fondos' ? 'bg-red-50' : 'hover:bg-zinc-50'}`}><ImageIcon className="w-5 h-5" /></div>
            <span className="text-[7px] font-black uppercase tracking-tighter">Diseños</span>
          </button>
        </aside>

        {/* Drawers */}
        {activeTab === 'upload' && (
          <div className="fixed left-14 top-12 bottom-0 w-72 bg-white border-r shadow-2xl p-6 z-50">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Subir Imagen</h2>
               <button onClick={() => setActiveTab(null)}><X className="w-4 h-4" /></button>
             </div>
             <label className="w-full aspect-square border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-50">
               <Upload className="w-6 h-6 text-zinc-300" />
               <span className="text-[10px] font-black text-zinc-400 uppercase">Seleccionar Archivo</span>
               <input type="file" className="hidden" onChange={handleUpload} />
             </label>
          </div>
        )}

        {activeTab === 'fondos' && (
          <div className="fixed left-14 top-12 bottom-0 w-72 bg-white border-r shadow-2xl p-6 z-50 overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Diseños</h2>
               <button onClick={() => setActiveTab(null)}><X className="w-4 h-4" /></button>
             </div>
             <div className="grid grid-cols-2 gap-2">
               {fondos.map((f, i) => (
                 <button key={i} onClick={() => { addImageToCanvas(getImageUrl(f.imagen_url), 'Fondo', true); setActiveTab(null); }} className="aspect-square rounded-xl overflow-hidden border border-zinc-200 hover:border-brand-red">
                   <img src={getImageUrl(f.imagen_url)} className="w-full h-full object-cover" />
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* Main Content */}
        <main ref={containerRef} className="flex-1 relative flex items-center justify-center bg-[#f8f8f8] p-2 md:p-4">
          <div className="relative shadow-xl bg-white border border-zinc-200 overflow-hidden rounded-[1rem]" style={{ width: viewportSize.w, height: viewportSize.h }}>
            
            {/* Checkerboard Background for the Canvas */}
            <div className="absolute inset-0 z-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)',
              backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }} />

            {/* The Canvas */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <canvas ref={canvasRef} className="bg-transparent" />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;
