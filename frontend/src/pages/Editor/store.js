import { create } from 'zustand';
import * as fabric from 'fabric';

export const useEditorStore = create((set, get) => ({
  // Core State
  canvas: null,
  modelo: null,
  fondos: [],
  
  // UI State
  activeTab: null, // 'upload', 'designs', 'layers', 'filters'
  selectedObject: null,
  zoom: 1,
  baseWidth: 0,
  baseHeight: 0,
  centerX: 0,
  centerY: 0,
  
  // Actions
  setCanvas: (canvas) => set({ canvas }),
  setModelo: (modelo) => set({ modelo }),
  setFondos: (fondos) => set({ fondos }),
  setActiveTab: (tab) => set((state) => ({ activeTab: state.activeTab === tab ? null : tab })),
  setSelectedObject: (obj) => set({ selectedObject: obj }),
  setZoom: (zoom) => set({ zoom }),
  setBaseDimensions: (dims) => set(dims),

  // Editor Actions
  deleteSelected: () => {
    const { canvas } = get();
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => {
        // Prevent deleting the mold/clipPath
        if (!obj.id?.includes('mold')) {
          canvas.remove(obj);
        }
      });
      canvas.renderAll();
    }
  },

  bringForward: () => {
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !obj.id?.includes('mold')) {
      canvas.bringObjectForward(obj);
      canvas.renderAll();
    }
  },

  sendBackward: () => {
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !obj.id?.includes('mold')) {
      canvas.sendObjectBackward(obj);
      canvas.renderAll();
    }
  },

  autoCenter: () => {
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !obj.id?.includes('mold')) {
      obj.center();
      obj.setCoords();
      canvas.renderAll();
    }
  }
}));
