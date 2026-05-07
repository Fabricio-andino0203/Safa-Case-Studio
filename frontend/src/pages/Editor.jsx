import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Canvas, FabricImage, Rect } from 'fabric';
import { Upload, ArrowRight, ArrowLeft, Layers, Trash2, ChevronUp, ChevronDown, Grid3X3, Palette, Image as ImageIcon } from 'lucide-react';
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
          cornerColor: '#a78bfa', cornerStrokeColor: '#7c3aed', borderColor: '#a78bfa',
          cornerSize: 14, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2,
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
        cornerColor: '#a78bfa', cornerStrokeColor: '#7c3aed', borderColor: '#a78bfa',
        cornerSize: 14, cornerStyle: 'circle', transparentCorners: false, borderScaleFactor: 2,
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-zinc-900 p-6 lg:p-10">
        <div className="relative">
          <div className="absolute -inset-3 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-[2rem] blur-xl" />
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-zinc-700/50"
            style={bgId === 'check' ? {
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            } : {}}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-[380px] bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col overflow-y-auto max-h-screen">
        <div className="p-6 flex-1 overflow-y-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <h2 className="text-xl font-bold mb-1">
            Diseña tu <span className="text-violet-400">{modelo?.nombre}</span>
          </h2>
          <p className="text-zinc-500 text-xs mb-5">
            {modelo?.marca && <span>{modelo.marca} · </span>}{modelo?.ancho_impresion} × {modelo?.alto_impresion} cm
          </p>

          {/* Upload */}
          <label className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 px-4 rounded-xl cursor-pointer transition-all font-semibold shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] mb-4 text-sm">
            <Upload className="w-4 h-4" />
            <span>{images.length > 0 ? 'Agregar Otra Imagen' : 'Subir Imagen'}</span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} />
          </label>

          {images.length > 0 && (
            <p className="text-xs text-zinc-500 mb-4">{images.length} imagen{images.length > 1 ? 'es' : ''} · Toca una para seleccionar</p>
          )}

          {/* Pre-loaded Fondos */}
          {fondos.length > 0 && (
            <div className="mb-4">
              <button onClick={() => setShowFondos(!showFondos)}
                className="flex items-center gap-2 mb-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors w-full">
                <ImageIcon className="w-4 h-4 text-violet-400" />
                <span>Diseños y Texturas</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showFondos ? 'rotate-180' : ''}`} />
              </button>
              {showFondos && (
                <div className="grid grid-cols-4 gap-2 animate-fade-in">
                  {fondos.map(f => (
                    <button key={f.id} onClick={() => addUrlImage(`http://localhost:5000${f.imagen_url}`, f.nombre)}
                      className="aspect-square rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-violet-500 transition-colors group"
                      title={f.nombre}>
                      <img src={`http://localhost:5000${f.imagen_url}`} alt={f.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collage Layouts */}
          {images.length >= 2 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Grid3X3 className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium">Collage</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLLAGE_LAYOUTS.filter(l => l.id === 'free' || images.length >= l.min).map(l => (
                  <button key={l.id} onClick={() => l.id === 'free' ? clearCollage() : applyCollage(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeLayout === l.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background Color */}
          <div className="mb-4">
            <button onClick={() => setShowBg(!showBg)}
              className="flex items-center gap-2 mb-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors w-full">
              <Palette className="w-4 h-4 text-violet-400" />
              <span>Fondo del Diseño</span>
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showBg ? 'rotate-180' : ''}`} />
            </button>
            {showBg && (
              <div className="flex gap-2 flex-wrap animate-fade-in">
                {BG_COLORS.map(c => (
                  <button key={c.id} onClick={() => setBgId(c.id)} title={c.label}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${bgId === c.id ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-zinc-700'}`}
                    style={c.value ? { backgroundColor: c.value } : {
                      backgroundImage: 'linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 50%, #ccc 50%, #ccc 75%, #fff 75%)',
                      backgroundSize: '8px 8px'
                    }} />
                ))}
              </div>
            )}
          </div>

          {/* Layers Panel */}
          {images.length > 0 && (
            <div>
              <button onClick={() => setShowLayers(!showLayers)}
                className="flex items-center gap-2 mb-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors w-full">
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Capas ({images.length})</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showLayers ? 'rotate-180' : ''}`} />
              </button>
              {showLayers && (
                <div className="space-y-1 animate-fade-in">
                  {images.map((item, i) => (
                    <div key={item.id}
                      onClick={() => selectImage(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${selectedIdx === i ? 'bg-violet-600/20 border border-violet-500/30 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'}`}>
                      <span className="flex-1 truncate">{item.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'up'); }}
                        className="p-1 hover:bg-zinc-700 rounded" title="Subir capa">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(i, 'down'); }}
                        className="p-1 hover:bg-zinc-700 rounded" title="Bajar capa">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded" title="Eliminar">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="p-6 border-t border-zinc-800">
          <button onClick={handleExport} disabled={images.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 px-6 rounded-xl hover:bg-zinc-100 transition-all font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
            <span>Continuar</span> <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
