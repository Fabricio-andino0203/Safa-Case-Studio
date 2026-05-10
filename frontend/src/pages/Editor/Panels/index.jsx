import React, { useRef } from 'react';
import * as fabric from 'fabric';
import { X, Upload, CloudUpload } from 'lucide-react';
import { useEditorStore } from '../store';
import { getImageUrl } from '../../../config';
import { motion, AnimatePresence } from 'framer-motion';

const UploadPanel = () => {
  const { canvas, setActiveTab } = useEditorStore();
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !canvas) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      fabric.FabricImage.fromURL(ev.target.result, { crossOrigin: 'anonymous' }).then((img) => {
        // Find the mold to calculate scale based on mold size
        const mold = canvas.getObjects().find(o => o.id === 'mold-clip');
        const W = canvas.width;
        const H = canvas.height;
        const targetWidth = mold ? mold.getScaledWidth() * 0.8 : W * 0.5;

        img.set({
          left: W / 2, top: H / 2, 
          originX: 'center', originY: 'center',
          cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', 
          cornerStyle: 'circle', transparentCorners: false, 
          cornerSize: 16, padding: 12
        });
        
        img.scaleToWidth(targetWidth);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setActiveTab(null); // Close panel
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h3 className="text-sm font-black text-zinc-900 mb-1">Sube tu Imagen</h3>
        <p className="text-xs text-zinc-500">Formatos soportados: JPG, PNG, WEBP</p>
      </div>

      <button 
        onClick={() => fileInputRef.current?.click()}
        className="w-full aspect-square border-2 border-dashed border-zinc-300 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-red hover:bg-red-50 transition-all group"
      >
        <div className="p-4 bg-zinc-100 rounded-full group-hover:bg-brand-red group-hover:text-white text-zinc-400 transition-colors">
          <CloudUpload className="w-8 h-8" />
        </div>
        <span className="text-[11px] font-black text-zinc-600 uppercase tracking-wider group-hover:text-brand-red">Explorar Archivos</span>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
      </button>

      <button className="w-full bg-black text-white py-3 rounded-xl text-xs font-bold shadow-lg hover:bg-zinc-800 transition-colors">
        Subir desde Celular (QR)
      </button>
    </div>
  );
};

const DesignsPanel = () => {
  const { canvas, fondos, setActiveTab } = useEditorStore();

  const addDesign = (url) => {
    if (!canvas) return;
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const W = canvas.width;
      const H = canvas.height;
      img.set({
        left: W / 2, top: H / 2, originX: 'center', originY: 'center',
        cornerColor: '#E11D2E', cornerStrokeColor: '#ffffff', cornerStyle: 'circle', transparentCorners: false, cornerSize: 16, padding: 12
      });
      // Fill the mold height
      const mold = canvas.getObjects().find(o => o.id === 'mold-clip');
      const targetHeight = mold ? mold.getScaledHeight() : H * 0.8;
      img.scaleToHeight(targetHeight);
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setActiveTab(null);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-black text-zinc-900 mb-2">Diseños Precargados</h3>
      <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 pb-20 custom-scrollbar">
        {fondos.length > 0 ? fondos.map((f, i) => (
          <button 
            key={i} 
            onClick={() => addDesign(getImageUrl(f.imagen_url))} 
            className="aspect-[1/2] rounded-2xl overflow-hidden border border-zinc-200 hover:border-brand-red hover:shadow-lg transition-all group"
          >
            <img src={getImageUrl(f.imagen_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </button>
        )) : (
          // Placeholders if no designs
          [1,2,3,4].map(i => (
             <div key={i} className="aspect-[1/2] rounded-2xl bg-zinc-100 animate-pulse border border-zinc-200"></div>
          ))
        )}
      </div>
    </div>
  );
};

const ColorPanel = () => {
  const { canvas, setActiveTab } = useEditorStore();
  const colors = ['#ffffff', '#000000', '#E11D2E', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#8b5cf6'];

  const applyColor = (color) => {
    if (!canvas) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
    setActiveTab(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-black text-zinc-900 mb-2">Color de Fondo</h3>
      <div className="grid grid-cols-4 gap-3">
        {colors.map(c => (
          <button 
            key={c} onClick={() => applyColor(c)}
            className="aspect-square rounded-full border border-zinc-200 shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
};

const LayersPanel = () => {
  const { canvas, selectedObject, setSelectedObject, bringForward, sendBackward, deleteSelected } = useEditorStore();
  const [layers, setLayers] = React.useState([]);

  React.useEffect(() => {
    if (!canvas) return;
    const updateLayers = () => {
      // Get all objects except the mold outline which is purely UI
      const objs = canvas.getObjects().filter(o => o.id !== 'mold-outline');
      // Reverse so top objects are at the top of the list
      setLayers([...objs].reverse());
    };
    updateLayers();
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);
    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
    };
  }, [canvas]);

  if (layers.length === 0) return <p className="text-xs text-zinc-500 text-center mt-10">No hay capas en el lienzo.</p>;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-black text-zinc-900 mb-2">Capas</h3>
      {layers.map((obj, i) => {
        const isSelected = selectedObject === obj;
        return (
          <div key={i} onClick={() => { canvas.setActiveObject(obj); canvas.renderAll(); }} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-brand-red bg-red-50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
            <span className="text-xs font-bold text-zinc-700 truncate">{obj.type === 'image' ? 'Imagen' : 'Capa'}</span>
            {isSelected && (
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); bringForward(); }} className="p-1 hover:bg-zinc-200 rounded text-zinc-500">↑</button>
                <button onClick={(e) => { e.stopPropagation(); sendBackward(); }} className="p-1 hover:bg-zinc-200 rounded text-zinc-500">↓</button>
                <button onClick={(e) => { e.stopPropagation(); deleteSelected(); }} className="p-1 hover:bg-red-200 rounded text-red-500">X</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const FiltersPanel = () => {
  const { canvas, selectedObject } = useEditorStore();
  const [brightness, setBrightness] = React.useState(0);

  const handleBrightness = (e) => {
    const val = parseFloat(e.target.value);
    setBrightness(val);
    if (!canvas || !selectedObject || selectedObject.type !== 'image') return;
    
    // In Fabric v7, filters are accessed via fabric.filters
    const filter = new fabric.filters.Brightness({ brightness: val });
    selectedObject.filters = [filter];
    selectedObject.applyFilters();
    canvas.renderAll();
  };

  if (!selectedObject || selectedObject.type !== 'image') {
    return <p className="text-xs text-zinc-500 text-center mt-10">Selecciona una imagen para aplicar filtros.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-black text-zinc-900 mb-2">Filtros</h3>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-zinc-700">Brillo</label>
        <input 
          type="range" min="-1" max="1" step="0.05" value={brightness} onChange={handleBrightness}
          className="w-full accent-brand-red"
        />
      </div>
      {/* Contrast and Saturation can be added similarly */}
    </div>
  );
};

const CollagePanel = () => {
  const { setActiveTab } = useEditorStore();
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-black text-zinc-900 mb-2">Plantillas Collage</h3>
      <div className="grid grid-cols-2 gap-3">
         {/* Simple placeholders for now */}
         <div className="aspect-square bg-zinc-100 border-2 border-zinc-200 rounded-xl flex flex-col gap-1 p-2 hover:border-brand-red cursor-pointer">
           <div className="flex-1 bg-zinc-200 rounded-lg"></div>
           <div className="flex-1 bg-zinc-200 rounded-lg"></div>
         </div>
         <div className="aspect-square bg-zinc-100 border-2 border-zinc-200 rounded-xl flex gap-1 p-2 hover:border-brand-red cursor-pointer">
           <div className="flex-1 bg-zinc-200 rounded-lg"></div>
           <div className="flex-1 bg-zinc-200 rounded-lg"></div>
         </div>
         <div className="aspect-square bg-zinc-100 border-2 border-zinc-200 rounded-xl grid grid-cols-2 grid-rows-2 gap-1 p-2 hover:border-brand-red cursor-pointer">
           <div className="bg-zinc-200 rounded-lg"></div>
           <div className="bg-zinc-200 rounded-lg"></div>
           <div className="bg-zinc-200 rounded-lg"></div>
           <div className="bg-zinc-200 rounded-lg"></div>
         </div>
      </div>
      <p className="text-[10px] text-zinc-400 text-center mt-2">Haz clic para auto-acomodar tus fotos (Próximamente funcional)</p>
    </div>
  );
};

export const PanelContainer = () => {
  const { activeTab, setActiveTab } = useEditorStore();

  return (
    <AnimatePresence>
      {activeTab && (
        <motion.div 
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-16 left-0 right-0 h-[50vh] sm:h-auto sm:bottom-0 sm:left-20 sm:top-0 sm:w-80 bg-white/95 backdrop-blur-xl border-t sm:border-t-0 sm:border-r border-zinc-200 shadow-2xl p-4 sm:p-6 z-30 rounded-t-[2rem] sm:rounded-none"
        >
          <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              {activeTab === 'upload' ? 'Archivos' : activeTab}
            </h2>
            <button onClick={() => setActiveTab(null)} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-brand-red transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-full overflow-y-auto">
            {activeTab === 'upload' && <UploadPanel />}
            {activeTab === 'designs' && <DesignsPanel />}
            {activeTab === 'color' && <ColorPanel />}
            {activeTab === 'layers' && <LayersPanel />}
            {activeTab === 'filters' && <FiltersPanel />}
            {activeTab === 'collage' && <CollagePanel />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
