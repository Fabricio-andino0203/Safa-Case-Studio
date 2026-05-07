import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Canvas, FabricImage, Rect } from 'fabric';
import { Upload, ArrowRight, ArrowLeft, Layers, Trash2, ChevronUp, ChevronDown, Grid3X3, Palette, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import axios from 'axios';

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
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [bgId, setBgId] = useState('check');
  const [activeLayout, setActiveLayout] = useState('free');
  const [showLayers, setShowLayers] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [fondos, setFondos] = useState([]);
  const [showFondos, setShowFondos] = useState(true);

  const modelo = state?.modelo;
  const W = 400, H = 750;

  useEffect(() => {
    if (!modelo) { navigate('/'); return; }
    const canvas = new Canvas(canvasRef.current, {
      width: W, height: H, backgroundColor: null, preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Selection events
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj?._imgIdx !== undefined) setSelectedIdx(obj._imgIdx);
    });
    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0];
      if (obj?._imgIdx !== undefined) setSelectedIdx(obj._imgIdx);
    });
    canvas.on('selection:cleared', () => setSelectedIdx(-1));

    // Load mask overlay
    const maskUrl = modelo.molde_mask_url
      ? `http://localhost:5000${modelo.molde_mask_url}`
      : `http://localhost:5000${modelo.molde_url}`;

    (async () => {
      try {
        const img = await FabricImage.fromURL(maskUrl, { crossOrigin: 'anonymous' });
        const scale = Math.min(W / img.width, H / img.height);
        img.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center',
          left: W / 2, top: H / 2, selectable: false, evented: false });
        canvas.overlayImage = img;
        canvas.renderAll();
      } catch (err) { console.error('Mask error:', err); }
    })();

    return () => { canvas.dispose(); fabricRef.current = null; };
  }, [modelo, navigate]);

  // Fetch pre-loaded fondos
  useEffect(() => {
    axios.get('http://localhost:5000/api/fondos/activos')
      .then(res => setFondos(res.data))
      .catch(err => console.error(err));
  }, []);

  // Update canvas background when bgId changes
  useEffect(() => {
    if (!fabricRef.current) return;
    const color = BG_COLORS.find(c => c.id === bgId)?.value;
    fabricRef.current.backgroundColor = color;
    fabricRef.current.renderAll();
  }, [bgId]);

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
          cornerSize: 12, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2,
        });
        img._imgIdx = idx;
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.setActiveObject(img);

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

  const addUrlImage = useCallback(async (url, name) => {
    const canvas = fabricRef.current;
    if (!canvas || !url) return;
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      const idx = images.length;
      const scale = Math.max((W * 0.8) / img.width, (H * 0.5) / img.height);
      img.set({
        scaleX: scale, scaleY: scale, originX: 'center', originY: 'center',
        left: W / 2, top: H / 2,
        cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', borderColor: '#E11D2E',
        cornerSize: 12, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2,
      });
      img._imgIdx = idx;
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.setActiveObject(img);

      setImages(prev => [...prev, { id: idx, name: name.substring(0, 20), fabricObj: img }]);
      setSelectedIdx(idx);
    } catch (err) { console.error(err); }
  }, [images.length]);

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

      // Create clip path for the cell
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

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas || images.length === 0) { alert('Sube al menos una imagen.'); return; }
    canvas.discardActiveObject();
    canvas.renderAll();
    const overlay = canvas.overlayImage;
    canvas.overlayImage = null;
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
    canvas.overlayImage = overlay;
    canvas.renderAll();
    navigate('/checkout', { state: { modelo, diseno_base64: dataUrl } });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080808]">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 relative">
        <div className="absolute top-6 left-6 z-10">
          <button onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all bg-brand-dark/80 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-md cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 text-brand-red" /> Volver
          </button>
        </div>

        {/* Studio Canvas Showcase */}
        <div className="relative mt-8">
          <div className="absolute -inset-4 bg-gradient-to-r from-brand-red/10 to-brand-red/5 rounded-[2.5rem] blur-2xl opacity-60 pointer-events-none" />
          <div className="relative rounded-[1.8rem] overflow-hidden shadow-2xl shadow-black border border-white/5"
            style={bgId === 'check' ? {
              backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
              backgroundColor: '#080808'
            } : {}}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Canva Style Tool Sidebar */}
      <div className="w-full lg:w-[400px] bg-brand-dark border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-screen overflow-hidden shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5 bg-brand-black/40">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-brand-red" />
            <span className="text-[10px] font-bold text-brand-red uppercase tracking-widest">Case Personalizado</span>
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{modelo?.nombre}</h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            {modelo?.marca && <span>{modelo.marca} · </span>}{modelo?.ancho_impresion} × {modelo?.alto_impresion} cm
          </p>
        </div>

        {/* Workspace Panels (Scrollable) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* UPLOAD SECTION */}
          <div>
            <label className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white py-3.5 px-4 rounded-xl cursor-pointer transition-all duration-300 font-bold shadow-lg shadow-brand-red/20 hover:scale-[1.01] active:scale-[0.99] text-xs uppercase tracking-wider">
              <Upload className="w-4 h-4" />
              <span>{images.length > 0 ? 'Añadir Más Fotos' : 'Subir mis Fotos'}</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
            </label>
            {images.length > 0 && (
              <p className="text-[11px] text-zinc-500 text-center mt-2.5">
                💡 Toca una capa en la lista para moverla o escalarla.
              </p>
            )}
          </div>

          {/* BACKGROUND TEXTURES & PATTERNS */}
          {fondos.length > 0 && (
            <div className="border border-white/5 rounded-2xl bg-brand-black/30 p-4">
              <button onClick={() => setShowFondos(!showFondos)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors w-full">
                <ImageIcon className="w-4 h-4 text-brand-red" />
                <span>Diseños y Texturas</span>
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFondos ? 'rotate-180' : ''}`} />
              </button>
              {showFondos && (
                <div className="grid grid-cols-4 gap-2 mt-3 animate-fade-in">
                  {fondos.map(f => (
                    <button key={f.id} onClick={() => addUrlImage(`http://localhost:5000${f.imagen_url}`, f.nombre)}
                      className="aspect-square rounded-xl bg-brand-medium border border-white/5 overflow-hidden hover:border-brand-red/50 transition-all group cursor-pointer"
                      title={f.nombre}>
                      <img src={`http://localhost:5000${f.imagen_url}`} alt={f.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COLLAGE CONFIGURATION */}
          {images.length >= 2 && (
            <div className="border border-white/5 rounded-2xl bg-brand-black/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Grid3X3 className="w-4 h-4 text-brand-red" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Layout Automático (Collage)</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLLAGE_LAYOUTS.filter(l => l.id === 'free' || images.length >= l.min).map(l => (
                  <button key={l.id} onClick={() => l.id === 'free' ? clearCollage() : applyCollage(l.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeLayout === l.id 
                        ? 'bg-brand-red text-white shadow-lg shadow-brand-red/15' 
                        : 'bg-brand-medium text-zinc-400 hover:text-white border border-white/5 hover:bg-brand-light'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DESIGN BACKGROUND COLOR */}
          <div className="border border-white/5 rounded-2xl bg-brand-black/30 p-4">
            <button onClick={() => setShowBg(!showBg)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors w-full">
              <Palette className="w-4 h-4 text-brand-red" />
              <span>Color de Fondo</span>
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showBg ? 'rotate-180' : ''}`} />
            </button>
            {showBg && (
              <div className="flex gap-2 flex-wrap mt-3 animate-fade-in">
                {BG_COLORS.map(c => (
                  <button key={c.id} onClick={() => setBgId(c.id)} title={c.label}
                    className={`w-7 h-7 rounded-lg border transition-all cursor-pointer hover:scale-110 flex items-center justify-center ${
                      bgId === c.id 
                        ? 'border-brand-red ring-2 ring-brand-red/20' 
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={c.value ? { backgroundColor: c.value } : {
                      backgroundImage: 'linear-gradient(45deg, #333 25%, #111 25%, #111 50%, #333 50%, #333 75%, #111 75%)',
                      backgroundSize: '8px 8px'
                    }}>
                    {bgId === c.id && <Check className="w-3.5 h-3.5 text-brand-red" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LAYER WORKSPACE MANAGER */}
          {images.length > 0 && (
            <div className="border border-white/5 rounded-2xl bg-brand-black/30 p-4">
              <button onClick={() => setShowLayers(!showLayers)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors w-full">
                <Layers className="w-4 h-4 text-brand-red" />
                <span>Capas ({images.length})</span>
                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showLayers ? 'rotate-180' : ''}`} />
              </button>
              {showLayers && (
                <div className="space-y-2 mt-3 animate-fade-in">
                  {images.map((item, i) => (
                    <div key={item.id}
                      onClick={() => selectImage(i)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border text-xs font-semibold ${
                        selectedIdx === i 
                          ? 'bg-brand-red/10 border-brand-red/30 text-white' 
                          : 'bg-brand-medium border-white/5 text-zinc-400 hover:text-white hover:bg-brand-light'
                      }`}>
                      <span className="flex-1 truncate">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'up'); }}
                          className="p-1 hover:bg-brand-light rounded-lg text-zinc-400 hover:text-white transition-colors" title="Subir capa">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'down'); }}
                          className="p-1 hover:bg-brand-light rounded-lg text-zinc-400 hover:text-white transition-colors" title="Bajar capa">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="p-1 hover:bg-brand-red/20 text-zinc-500 hover:text-brand-red rounded-lg transition-all" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer with Continue Action */}
        <div className="p-6 border-t border-white/5 bg-brand-black/40">
          <button onClick={handleExport} disabled={images.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-xl shadow-brand-red/15 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed uppercase tracking-wider text-xs">
            <span>Continuar al Pago</span> <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
