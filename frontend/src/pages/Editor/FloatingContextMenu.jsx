import React, { useEffect, useState } from 'react';
import { Trash2, Copy, BringToFront, SendToBack, Maximize, Target } from 'lucide-react';
import { useEditorStore } from './store';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingContextMenu = () => {
  const { selectedObject, canvas, deleteSelected, bringForward, sendBackward, autoCenter } = useEditorStore();
  const [position, setPosition] = useState({ top: -1000, left: -1000 });

  useEffect(() => {
    if (!canvas || !selectedObject) return;

    const updatePosition = () => {
      if (!selectedObject) return;
      
      // Get object's bounding rect in canvas coordinates
      const br = selectedObject.getBoundingRect();
      const zoom = canvas.getZoom();
      const vpt = canvas.viewportTransform;
      
      // Calculate true screen position taking zoom and pan into account
      const top = (br.top * zoom) + vpt[5];
      const left = (br.left * zoom) + vpt[4] + ((br.width * zoom) / 2);

      // Place it right above the object
      setPosition({ 
        top: top - 60, // 60px above the top edge
        left: left 
      });
    };

    // Update position on render, moving, scaling
    updatePosition();
    canvas.on('object:moving', updatePosition);
    canvas.on('object:scaling', updatePosition);
    canvas.on('mouse:wheel', updatePosition); // Also update on zoom
    
    return () => {
      canvas.off('object:moving', updatePosition);
      canvas.off('object:scaling', updatePosition);
      canvas.off('mouse:wheel', updatePosition);
    };
  }, [canvas, selectedObject]);

  const duplicate = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.clone().then((clone) => {
      clone.set({
        left: selectedObject.left + 20,
        top: selectedObject.top + 20,
        evented: true,
      });
      canvas.add(clone);
      canvas.setActiveObject(clone);
      canvas.renderAll();
    });
  };

  return (
    <AnimatePresence>
      {selectedObject && !selectedObject.id?.includes('mold') && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          style={{
             position: 'absolute',
             top: position.top,
             left: position.left,
             transform: 'translateX(-50%)', // Center horizontally
             zIndex: 50
          }}
          className="bg-zinc-900/95 backdrop-blur-md rounded-xl p-1.5 shadow-2xl flex items-center gap-1 border border-zinc-700/50"
        >
          <button onClick={autoCenter} title="Centrar" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors">
            <Target className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <button onClick={bringForward} title="Subir Capa" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors">
            <BringToFront className="w-4 h-4" />
          </button>
          <button onClick={sendBackward} title="Bajar Capa" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors">
            <SendToBack className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <button onClick={duplicate} title="Duplicar" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={deleteSelected} title="Eliminar" className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingContextMenu;
