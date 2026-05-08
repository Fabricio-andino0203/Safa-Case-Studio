import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Canvas, FabricImage, Rect } from 'fabric';
import { 
  Upload, ArrowRight, ArrowLeft, Layers, Trash2, ChevronUp, ChevronDown, 
  Grid3X3, Palette, Image as ImageIcon, Sparkles, Check, RefreshCw, 
  Maximize, Minimize, ZoomIn, ZoomOut, Move, RotateCcw, RotateCw, AlignCenter, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getImageUrl } from '../config';

const BG_COLORS = [
  { id: 'check', label: 'Transparente', value: null },
  { id: 'white', label: 'Blanco', value: '#ffffff' },
  { id: 'black', label: 'Negro', value: '#000000' },
  { id: 'gray', label: 'Gris', value: '#9ca3af' },
  { id: 'pink', label: 'Rosa', value: '#f9a8d4' },
  { id: 'blue', label: 'Azul', value: '#93c5fd' },
  { id: 'green', label: 'Verde', value: '#86efac' },
  { id: 'yellow', label: 'Amarillo', value: '#fde68a' },
];

const COLLAGE_LAYOUTS = [
  { id: 'free', label: 'Libre', min: 1 },
  { id: 'split_h', label: '2 Horizontal', min: 2 },
  { id: 'split_v', label: '2 Vertical', min: 2 },
  { id: 'tri', label: '1+2', min: 3 },
  { id: 'grid4', label: '2×2', min: 4 },
];

function getCollagePositions(layout, count, W, H) {
  switch (layout) {
    case 'split_h': return [
      { x: 0, y: 0, w: W, h: H / 2 },
      { x: 0, y: H / 2, w: W, h: H / 2 },
    ];
    case 'split_v': return [
      { x: 0, y: 0, w: W / 2, h: H },
      { x: W / 2, y: 0, w: W / 2, h: H },
    ];
    case 'tri': return [
      { x: 0, y: 0, w: W, h: H * 0.55 },
      { x: 0, y: H * 0.55, w: W / 2, h: H * 0.45 },
      { x: W / 2, y: H * 0.55, w: W / 2, h: H * 0.45 },
    ];
    case 'grid4': return [
      { x: 0, y: 0, w: W / 2, h: H / 2 },
      { x: W / 2, y: 0, w: W / 2, h: H / 2 },
      { x: 0, y: H / 2, w: W / 2, h: H / 2 },
      { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
    ];
    default: return [];
  }
}

export default function Editor() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const containerRef = useRef(null);

  // States
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [bgId, setBgId] = useState('check');
  const [activeLayout, setActiveLayout] = useState('free');
  const [fondos, setFondos] = useState([]);
  
  // Minimalist Panel Drawer state
  const [activePanel, setActivePanel] = useState(null); // 'textures' | 'collage' | 'layers' | 'bg' | null
  
  // Responsive Scaling & Zoom states
  const [viewportSize, setViewportSize] = useState({ w: 400, h: 750 });
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);

  // Selected Object Properties (Tactile sliders sync)
  const [objScale, setObjScale] = useState(1);
  const [objAngle, setObjAngle] = useState(0);

  const modelo = state?.modelo;
  const W = 400, H = 750;

  // Sync selected properties to sliders
  const syncSelectedProperties = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      setObjScale(active.scaleX);
      setObjAngle(active.angle || 0);
      
      const idx = images.findIndex(img => img.fabricObj === active);
      setSelectedIdx(idx >= 0 ? idx : 999);
    } else {
      setSelectedIdx(-1);
    }
  }, [images]);

  // Init canvas
  useEffect(() => {
    if (!modelo) { navigate('/'); return; }
    const canvas = new Canvas(canvasRef.current, {
      width: W, height: H, backgroundColor: null, preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Selection/Modification events
    canvas.on('selection:created', syncSelectedProperties);
    canvas.on('selection:updated', syncSelectedProperties);
    canvas.on('selection:cleared', () => setSelectedIdx(-1));
    canvas.on('object:moving', syncSelectedProperties);
    canvas.on('object:scaling', syncSelectedProperties);
    canvas.on('object:rotating', syncSelectedProperties);

    // Mouse wheel zoom relative to cursor (like Figma/Canva)
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.3), 5); // limits
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      setCanvasZoom(zoom);
    });

    // Figma-style drag panning
    let isDragging = false;
    let lastPosX, lastPosY;

    canvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      // Pan with spacebar/Alt or if panMode is active, or if clicking the background
      if (panMode || evt.altKey || !opt.target) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX || evt.touches?.[0]?.clientX;
        lastPosY = evt.clientY || evt.touches?.[0]?.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isDragging) {
        const evt = opt.e;
        const clientX = evt.clientX || evt.touches?.[0]?.clientX;
        const clientY = evt.clientY || evt.touches?.[0]?.clientY;
        const vpt = canvas.viewportTransform;
        vpt[4] += clientX - lastPosX;
        vpt[5] += clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = clientX;
        lastPosY = clientY;
      }
    });

    canvas.on('mouse:up', () => {
      isDragging = false;
      canvas.selection = true;
    });

    return () => { canvas.dispose(); fabricRef.current = null; };
  }, [modelo, navigate, panMode, syncSelectedProperties]);

  // Responsive workspace scaling
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parentWidth = containerRef.current.clientWidth;
      const parentHeight = containerRef.current.clientHeight;
      
      const padding = 32;
      const maxW = parentWidth - padding;
      const maxH = parentHeight - padding;
      
      const targetAspect = 400 / 750;
      
      let responsiveW, responsiveH;
      if (maxW / maxH < targetAspect) {
        responsiveW = maxW;
        responsiveH = maxW / targetAspect;
      } else {
        responsiveH = maxH;
        responsiveW = maxH * targetAspect;
      }
      
      responsiveW = Math.min(responsiveW, 400);
      responsiveH = Math.min(responsiveH, 750);
      
      setViewportSize({ w: responsiveW, h: responsiveH });
      
      const canvas = fabricRef.current;
      if (canvas) {
        canvas.setDimensions({ width: responsiveW, height: responsiveH });
        const zoom = responsiveW / 400;
        canvas.setZoom(zoom);
        canvas.requestRenderAll();
        setCanvasZoom(zoom);
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [modelo]);

  // Fetch pre-loaded backgrounds
  useEffect(() => {
    axios.get(`${API_URL}/fondos/activos`)
      .then(res => setFondos(res.data))
      .catch(err => console.error(err));
  }, []);

  // Update canvas background color
  useEffect(() => {
    if (!fabricRef.current) return;
    const color = BG_COLORS.find(c => c.id === bgId)?.value;
    fabricRef.current.backgroundColor = color;
    fabricRef.current.renderAll();
  }, [bgId]);

  // Add Uploaded Image
  const addImage = useCallback(async (file) => {
    const canvas = fabricRef.current;
    if (!canvas || !file) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      try {
        const img = await FabricImage.fromURL(f.target.result);
        const idx = images.length;
        const scale = Math.max((W * 0.8) / img.width, (H * 0.5) / img.height);
        img.set({
          scaleX: scale, scaleY: scale, originX: 'center', originY: 'center',
          left: W / 2, top: H / 2,
          cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', borderColor: '#E11D2E',
          cornerSize: 10, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2.5,
          padding: 8
        });
        img._imgIdx = idx;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        setImages(prev => [...prev, { id: idx, name: file.name.substring(0, 20), fabricObj: img }]);
        setSelectedIdx(idx);
      } catch (err) { console.error(err); }
    };
    reader.readAsDataURL(file);
  }, [images.length]);

  const handleUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => addImage(f));
    e.target.value = '';
  };

  // Add Preloaded Design Texture
  const addUrlImage = useCallback(async (url, name) => {
    const canvas = fabricRef.current;
    if (!canvas || !url) return;
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      const idx = images.length;
      const scale = Math.max((W * 1.0) / img.width, (H * 1.0) / img.height);
      img.set({
        scaleX: scale, scaleY: scale, originX: 'center', originY: 'center',
        left: W / 2, top: H / 2,
        cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', borderColor: '#E11D2E',
        cornerSize: 10, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2.5,
        padding: 8
      });
      img._imgIdx = idx;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      setImages(prev => [...prev, { id: idx, name: name.substring(0, 20), fabricObj: img }]);
      setSelectedIdx(idx);
    } catch (err) { console.error(err); }
  }, [images.length]);

  // Depth operations
  const moveLayer = (idx, dir) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const img = images[idx]?.fabricObj;
    if (!img) return;
    if (dir === 'up') {
      const objs = canvas.getObjects();
      const i = objs.indexOf(img);
      if (i < objs.length - 1) { canvas.moveObjectTo(img, i + 1); canvas.renderAll(); }
    } else {
      const objs = canvas.getObjects();
      const i = objs.indexOf(img);
      if (i > 0) { canvas.moveObjectTo(img, i - 1); canvas.renderAll(); }
    }
  };

  const removeImage = (idx) => {
    const canvas = fabricRef.current;
    const img = images[idx]?.fabricObj;
    if (canvas && img) { canvas.remove(img); canvas.renderAll(); }
    setImages(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(-1);
  };

  const selectImage = (idx) => {
    const canvas = fabricRef.current;
    const img = images[idx]?.fabricObj;
    if (canvas && img) { canvas.setActiveObject(img); canvas.renderAll(); }
    setSelectedIdx(idx);
  };

  // Collage
  const applyCollage = (layoutId) => {
    const canvas = fabricRef.current;
    if (!canvas || images.length < 2) return;
    setActiveLayout(layoutId);
    if (layoutId === 'free') return;

    const positions = getCollagePositions(layoutId, images.length, W, H);
    images.forEach((item, i) => {
      if (i >= positions.length) return;
      const pos = positions[i];
      const img = item.fabricObj;
      const scale = Math.max(pos.w / (img.width || 1), pos.h / (img.height || 1));

      const clip = new Rect({
        width: pos.w / scale, height: pos.h / scale,
        originX: 'center', originY: 'center', absolutePositioned: false,
      });

      img.set({
        scaleX: scale, scaleY: scale, originX: 'center', originY: 'center',
        left: pos.x + pos.w / 2, top: pos.y + pos.h / 2, clipPath: clip,
      });
    });
    canvas.renderAll();
  };

  const clearCollage = () => {
    setActiveLayout('free');
    images.forEach(item => { item.fabricObj.clipPath = null; });
    fabricRef.current?.renderAll();
  };

  // Zoom methods
  const canvasZoomIn = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    let zoom = canvas.getZoom();
    zoom = Math.min(zoom * 1.2, 5);
    canvas.zoomToPoint({ x: viewportSize.w / 2, y: viewportSize.h / 2 }, zoom);
    setCanvasZoom(zoom);
  };

  const canvasZoomOut = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    let zoom = canvas.getZoom();
    zoom = Math.max(zoom / 1.2, 0.3);
    canvas.zoomToPoint({ x: viewportSize.w / 2, y: viewportSize.h / 2 }, zoom);
    setCanvasZoom(zoom);
  };

  const resetCanvasView = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const initZoom = viewportSize.w / 400;
    canvas.setZoom(initZoom);
    canvas.requestRenderAll();
    setCanvasZoom(initZoom);
  };

  // Image manual adjustments via Tactile controls
  const handleScaleChange = (val) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.set({ scaleX: val, scaleY: val });
      active.setCoords();
      canvas.requestRenderAll();
      setObjScale(val);
    }
  };

  const handleAngleChange = (val) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.set({ angle: val });
      active.setCoords();
      canvas.requestRenderAll();
      setObjAngle(val);
    }
  };

  const centerSelectedObject = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.set({ left: W / 2, top: H / 2 });
      active.setCoords();
      canvas.requestRenderAll();
    }
  };

  const flipHSelectedObject = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.set({ flipX: !active.flipX });
      canvas.requestRenderAll();
    }
  };

  const flipVSelectedObject = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      active.set({ flipY: !active.flipY });
      canvas.requestRenderAll();
    }
  };

  // Export Design
  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas || images.length === 0) { alert('Sube al menos una imagen.'); return; }
    
    // Save state, clear selection & viewport zoom to default (1.0 scale equivalent)
    canvas.discardActiveObject();
    
    // Remember previous zoom and viewport transform
    const prevZoom = canvas.getZoom();
    const prevVpt = [...canvas.viewportTransform];
    
    // Reset canvas to true 1:1 scale multiplier 3 to get extremely high resolution!
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width: 400, height: 750 });
    canvas.renderAll();
    
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
    
    // Restore layout responsive size & zoom
    canvas.setDimensions({ width: viewportSize.w, height: viewportSize.h });
    canvas.setZoom(prevZoom);
    canvas.setViewportTransform(prevVpt);
    canvas.renderAll();

    navigate('/checkout', { state: { modelo, diseno_base64: dataUrl } });
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col overflow-hidden relative select-none">
      
      {/* Hardware Accelerated SVG Outline Mask Filter */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="outline-red">
            <feFlood floodColor="#E11D2E" result="red-color" />
            <feComposite in="red-color" in2="SourceAlpha" operator="in" result="red-alpha" />
            <feMorphology operator="dilate" radius="1.5" in="red-alpha" result="dilated" />
            <feComposite in="dilated" in2="SourceAlpha" operator="out" result="border" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="border" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Editor Header Navigation */}
      <nav className="h-14 border-b border-white/5 bg-[#0b0b0c]/90 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
        <button onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer bg-brand-medium/30 px-3 py-2 rounded-xl border border-white/5">
          <ArrowLeft className="w-3.5 h-3.5 text-brand-red" /> Volver
        </button>
        <div className="text-center">
          <h1 className="text-xs font-bold text-white uppercase tracking-wider">{modelo?.nombre}</h1>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{modelo?.marca || 'Safa Case'}</p>
        </div>
        <button onClick={handleExport} disabled={images.length === 0}
          className="flex items-center gap-1.5 bg-brand-red hover:bg-brand-red-hover text-white px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-md shadow-brand-red/15 hover:scale-[1.02] disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer animate-pulse-glow">
          <span>Finalizar</span> <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* Main Studio Frame Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* LEFT BAR: Figma Style Minimal Floating Tools */}
        <div className="absolute top-6 left-6 flex flex-col gap-2.5 z-20">
          
          {/* UPLOAD TRIGGER */}
          <label className="w-12 h-12 rounded-full bg-brand-dark hover:bg-brand-medium border border-white/5 hover:border-brand-red/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xl text-zinc-300 hover:text-white" title="Subir Fotos">
            <Upload className="w-4 h-4 text-brand-red" />
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
          </label>

          {/* GALLERY DESIGNS PORTAL */}
          <button onClick={() => setActivePanel(activePanel === 'textures' ? null : 'textures')}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
              activePanel === 'textures' 
                ? 'bg-brand-red border-brand-red text-white' 
                : 'bg-brand-dark border-white/5 text-zinc-300 hover:text-white hover:border-brand-red/20'
            }`} title="Texturas y Fondos">
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* COLLAGE PORTAL (Only visible if 2+ photos) */}
          {images.length >= 2 && (
            <button onClick={() => setActivePanel(activePanel === 'collage' ? null : 'collage')}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
                activePanel === 'collage' 
                  ? 'bg-brand-red border-brand-red text-white' 
                  : 'bg-brand-dark border-white/5 text-zinc-300 hover:text-white hover:border-brand-red/20'
              }`} title="Distribución de Collage">
              <Grid3X3 className="w-4 h-4" />
            </button>
          )}

          {/* LAYER WORKSPACE PORTAL (Badge count included) */}
          {images.length > 0 && (
            <button onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl relative cursor-pointer ${
                activePanel === 'layers' 
                  ? 'bg-brand-red border-brand-red text-white' 
                  : 'bg-brand-dark border-white/5 text-zinc-300 hover:text-white hover:border-brand-red/20'
              }`} title="Orden de Capas">
              <Layers className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#080808]">
                {images.length}
              </span>
            </button>
          )}

          {/* CHOOSE SOLID CANVAS BG COLOR */}
          <button onClick={() => setActivePanel(activePanel === 'bg' ? null : 'bg')}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
              activePanel === 'bg' 
                ? 'bg-brand-red border-brand-red text-white' 
                : 'bg-brand-dark border-white/5 text-zinc-300 hover:text-white hover:border-brand-red/20'
            }`} title="Color de Fondo">
            <Palette className="w-4 h-4" />
          </button>

          <hr className="border-white/5 my-1" />

          {/* PANNING MODE HAND TOGGLE */}
          <button onClick={() => setPanMode(!panMode)}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer ${
              panMode 
                ? 'bg-brand-red border-brand-red text-white' 
                : 'bg-brand-dark border-white/5 text-zinc-300 hover:text-white hover:border-brand-red/20'
            }`} title="Modo Desplazamiento (Figma Hand)">
            <Move className="w-4 h-4" />
          </button>

          {/* GLOBAL RESET (Clear / Start over) */}
          <button onClick={() => { if (confirm('¿Reiniciar todo tu diseño?')) { clearCollage(); setImages([]); setBgId('check'); fabricRef.current?.clear(); setSelectedIdx(-1); } }}
            className="w-12 h-12 rounded-full bg-brand-dark hover:bg-brand-medium border border-white/5 hover:border-brand-red/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xl text-zinc-400 hover:text-brand-red" title="Limpiar Todo">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* POPUP TOOLS PANEL DRAWER (Minimalist floating card) */}
        {activePanel && (
          <div className="absolute top-6 left-22 w-72 bg-brand-dark/95 border border-white/5 rounded-3xl p-5 z-20 shadow-2xl backdrop-blur-md animate-fade-in max-h-[80vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-brand-red uppercase tracking-widest">
                {activePanel === 'textures' && 'Texturas Oficiales'}
                {activePanel === 'collage' && 'Layout de Collage'}
                {activePanel === 'layers' && 'Capas de Diseño'}
                {activePanel === 'bg' && 'Color de Base'}
              </span>
              <button onClick={() => setActivePanel(null)} className="text-zinc-500 hover:text-white text-xs font-bold uppercase cursor-pointer">
                Cerrar
              </button>
            </div>

            {/* Panel Content matching selected tool */}
            {activePanel === 'textures' && (
              <div className="grid grid-cols-3 gap-2">
                {fondos.map(f => (
                  <button key={f.id} onClick={() => addUrlImage(getImageUrl(f.imagen_url), f.nombre)}
                    className="aspect-square rounded-xl bg-brand-medium border border-white/5 overflow-hidden hover:border-brand-red/30 transition-all group cursor-pointer"
                    title={f.nombre}>
                    <img src={getImageUrl(f.imagen_url)} alt={f.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </button>
                ))}
              </div>
            )}

            {activePanel === 'collage' && (
              <div className="space-y-2">
                {COLLAGE_LAYOUTS.filter(l => l.id === 'free' || images.length >= l.min).map(l => (
                  <button key={l.id} onClick={() => l.id === 'free' ? clearCollage() : applyCollage(l.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      activeLayout === l.id 
                        ? 'bg-brand-red border-brand-red text-white' 
                        : 'bg-brand-medium/50 border-white/5 text-zinc-400 hover:text-white'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}

            {activePanel === 'layers' && (
              <div className="space-y-1.5">
                {images.map((item, i) => (
                  <div key={item.id} onClick={() => selectImage(i)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors text-xs font-bold ${
                      selectedIdx === i 
                        ? 'bg-brand-red/10 border-brand-red/20 text-white' 
                        : 'bg-brand-medium/40 border-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}>
                    <span className="truncate max-w-[130px]">{item.name}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'up'); }} className="p-1 text-zinc-500 hover:text-white">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'down'); }} className="p-1 text-zinc-500 hover:text-white">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeImage(i); }} className="p-1 text-zinc-500 hover:text-brand-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === 'bg' && (
              <div className="grid grid-cols-4 gap-2.5">
                {BG_COLORS.map(c => (
                  <button key={c.id} onClick={() => setBgId(c.id)}
                    className={`aspect-square rounded-xl border flex items-center justify-center hover:scale-105 transition-all cursor-pointer ${
                      bgId === c.id ? 'border-brand-red ring-2 ring-brand-red/15' : 'border-white/5 hover:border-white/20'
                    }`}
                    style={c.value ? { backgroundColor: c.value } : {
                      backgroundImage: 'linear-gradient(45deg, #444 25%, #111 25%, #111 50%, #444 50%, #444 75%, #111 75%)',
                      backgroundSize: '10px 10px'
                    }} title={c.label}>
                    {bgId === c.id && <Check className="w-4 h-4 text-brand-red" />}
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

        {/* WORKSPACE CENTRAL AREA (Figma Layout) */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center bg-[#0d0d0f] relative overflow-hidden p-6">
          
          {/* Subtle Ambient Light Glow Behind the Case */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[550px] rounded-[3rem] bg-brand-red/5 blur-3xl pointer-events-none" />

          {/* SCALABLE VIEWPORT CONTAINER (Matches phone case dimensions) */}
          <div className="relative shadow-2xl shadow-black overflow-hidden rounded-[2.5rem] border border-white/5"
            style={{ 
              width: viewportSize.w, 
              height: viewportSize.h,
              transition: 'width 0.2s, height 0.2s'
            }}>
            
            {/* Transparent Checkerboard Base */}
            <div className="absolute inset-0 z-0 bg-brand-black"
              style={{
                backgroundImage: 'linear-gradient(45deg, #121213 25%, transparent 25%), linear-gradient(-45deg, #121213 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #121213 75%), linear-gradient(-45deg, transparent 75%, #121213 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            />

            {/* THE FABRIC CANVAS */}
            <div className="absolute inset-0 z-10 pointer-events-auto">
              <canvas ref={canvasRef} />
            </div>

            {/* ADVANCED VECTOR OVERLAY MASK with SVG Outline Filter */}
            <img 
              src={getImageUrl(modelo?.molde_mask_url || modelo?.molde_url)} 
              alt="Outline Contour Mask"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
              style={{ 
                width: viewportSize.w, 
                height: viewportSize.h,
                filter: 'url(#outline-red)',
                mixBlendMode: 'normal'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />

          </div>

          {/* FIGMA ZOOM STATUS FLAG IN CORNER */}
          <div className="absolute bottom-6 left-6 bg-brand-dark/80 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 z-20">
            {panMode ? (
              <span className="flex items-center gap-1 text-brand-red"><Move className="w-3 h-3" /> Arrastrar Lienzo</span>
            ) : (
              <span>Modo Selección</span>
            )}
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300">{Math.round((viewportSize.w / 400) * canvasZoom * 100)}%</span>
          </div>

        </div>

        {/* RIGHT SIDE: Figma / Canva Style contextual touch-slider widget */}
        {selectedIdx !== -1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 md:bottom-6 w-[90%] max-w-sm bg-brand-dark/95 border border-white/5 rounded-3xl p-5 z-20 shadow-2xl backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
              <span className="text-[10px] font-bold text-brand-red uppercase tracking-widest flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> Ajuste Táctil
              </span>
              <button onClick={() => centerSelectedObject()} className="text-[9px] font-bold uppercase text-zinc-500 hover:text-white flex items-center gap-1 bg-brand-medium/50 px-2.5 py-1 rounded-lg border border-white/5 cursor-pointer">
                <AlignCenter className="w-3 h-3 text-brand-red" /> Centrar Imagen
              </button>
            </div>

            <div className="space-y-4">
              {/* ESCALA SLIDER */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  <span>Escalar</span>
                  <span className="text-zinc-300 font-bold">{Math.round(objScale * 100)}%</span>
                </div>
                <input type="range" min="0.05" max="3" step="0.01" value={objScale}
                  onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                  className="w-full accent-brand-red bg-brand-medium h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              {/* ROTACION SLIDER */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  <span>Rotar</span>
                  <span className="text-zinc-300 font-bold">{Math.round(objAngle)}°</span>
                </div>
                <input type="range" min="0" max="360" step="1" value={objAngle}
                  onChange={(e) => handleAngleChange(parseInt(e.target.value))}
                  className="w-full accent-brand-red bg-brand-medium h-1.5 rounded-lg appearance-none cursor-pointer" />
              </div>

              {/* FLIPS AND DELETE ACTION ROW */}
              <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <button onClick={flipHSelectedObject} className="p-2.5 bg-brand-medium/40 hover:bg-brand-medium border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Voltear Horizontal">
                    <Maximize className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                  <button onClick={flipVSelectedObject} className="p-2.5 bg-brand-medium/40 hover:bg-brand-medium border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer" title="Voltear Vertical">
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button onClick={() => { if (selectedIdx !== 999) removeImage(selectedIdx); else { const canvas = fabricRef.current; canvas.remove(canvas.getActiveObject()); canvas.requestRenderAll(); setSelectedIdx(-1); } }}
                  className="px-4 py-2 bg-brand-red/10 hover:bg-brand-red hover:text-white text-brand-red border border-brand-red/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Capa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM RIGHT: Zooming Canvas controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-1.5 z-20">
          <button onClick={canvasZoomOut} className="w-10 h-10 rounded-xl bg-brand-dark hover:bg-brand-medium text-zinc-400 hover:text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetCanvasView} className="h-10 px-3 rounded-xl bg-brand-dark hover:bg-brand-medium text-zinc-400 hover:text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer text-[10px] font-bold uppercase tracking-wider shadow-lg active:scale-95" title="Reset Vista">
            Ajustar
          </button>
          <button onClick={canvasZoomIn} className="w-10 h-10 rounded-xl bg-brand-dark hover:bg-brand-medium text-zinc-400 hover:text-white border border-white/5 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
