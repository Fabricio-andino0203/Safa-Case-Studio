import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { useEditorStore } from './store';
import { getImageUrl } from '../../config';

const CanvasEngine = () => {
  const canvasContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const { modelo, setCanvas, setSelectedObject, setZoom } = useEditorStore();

  useEffect(() => {
    if (!canvasRef.current || !canvasContainerRef.current || !modelo) return;

    // Get container dimensions
    const containerWidth = canvasContainerRef.current.clientWidth;
    const containerHeight = canvasContainerRef.current.clientHeight;

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      preserveObjectStacking: true,
      selection: true,
      // The background will be transparent to show the checkerboard CSS underneath
    });

    // Handle Resize
    const handleResize = () => {
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;
      canvas.setDimensions({ width: w, height: h });
      canvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    // Zoom & Pan Implementation
    canvas.on('mouse:wheel', function (opt) {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.2) zoom = 0.2;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      setZoom(zoom);
    });

    canvas.on('mouse:down', function (opt) {
      const evt = opt.e;
      // Space + Drag or Alt + Drag to pan
      if (evt.altKey || evt.code === 'Space') {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    canvas.on('mouse:move', function (opt) {
      if (this.isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    canvas.on('mouse:up', function () {
      this.setViewportTransform(this.viewportTransform);
      this.isDragging = false;
      this.selection = true;
    });

    // Selection Handling
    const handleSelection = () => setSelectedObject(canvas.getActiveObject() || null);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelection);

    setCanvas(canvas);

    // ==========================================
    // 2. Load the Mold & Set Workspace
    // ==========================================
    if (modelo.molde_svg_path) {
      const svgUrl = getImageUrl(modelo.molde_svg_path);
      
      // We calculate the physical dimensions based on the impression size
      const baseHeight = 700;
      const ratio = (modelo.ancho_impresion && modelo.alto_impresion) 
        ? modelo.ancho_impresion / modelo.alto_impresion 
        : 400 / 700;
      const baseWidth = baseHeight * ratio;

      // To center it initially, we put it in the middle of the container
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;

      // Store these for export logic
      useEditorStore.getState().setBaseDimensions({ baseWidth, baseHeight, centerX, centerY });

      // 1. Load for Clip Path
      fabric.loadSVGFromURL(svgUrl).then(({ objects, options }) => {
        if (!objects || objects.length === 0) return;
        
        objects.forEach(obj => {
          obj.set({ fill: '#ffffff', stroke: null }); // Solid white background inside mold
        });
        const clipGroup = fabric.util.groupSVGElements(objects, options);
        
        // MANTENER ASPECT RATIO: Escalar proporcionalmente usando Math.min (Contain)
        const scale = Math.min(
          baseWidth / (clipGroup.width || 1),
          baseHeight / (clipGroup.height || 1)
        );
        
        clipGroup.set({
          id: 'mold-clip',
          originX: 'center', originY: 'center',
          left: centerX, top: centerY,
          scaleX: scale, scaleY: scale,
          absolutePositioned: true, // Crucial for clipPath
          selectable: false, evented: false
        });
        
        // Assign the strict mask
        canvas.clipPath = clipGroup;
        canvas.renderAll();

        // 2. Load again for the Red Outline
        fabric.loadSVGFromURL(svgUrl).then(({ objects: obj2, options: opt2 }) => {
           if (!obj2 || obj2.length === 0) return;
           
           obj2.forEach(obj => {
              // Fine red outline as requested
              obj.set({ fill: null, stroke: '#E11D2E', strokeWidth: 3 }); 
           });
           const outlineGroup = fabric.util.groupSVGElements(obj2, opt2);
           
           outlineGroup.set({
             id: 'mold-outline',
             originX: 'center', originY: 'center',
             left: centerX, top: centerY,
             scaleX: scale, scaleY: scale,
             selectable: false, evented: false
           });
           canvas.add(outlineGroup);
           
           // Automatically center the view on the mold
           canvas.zoomToPoint({x: centerX, y: centerY}, 1);
           
           // GUARANTEE the outline stays on top of everything
           const forceOutlineToFront = () => {
             const outline = canvas.getObjects().find(o => o.id === 'mold-outline');
             if (outline) canvas.bringObjectToFront(outline);
           };
           canvas.on('object:added', forceOutlineToFront);
           canvas.on('object:modified', forceOutlineToFront);
           
           canvas.renderAll();
        }).catch(err => console.error("Outline load error", err));
      }).catch(err => console.error("SVG load error", err));
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      setCanvas(null);
    };
  }, [modelo, setCanvas, setSelectedObject, setZoom]);

  return (
    <div 
      ref={canvasContainerRef} 
      className="flex-1 w-full h-full relative overflow-hidden bg-[#e5e5e5]" // Professional gray background
    >
      {/* Photoshop style checkerboard pattern applied to the container, 
          the canvas on top will be transparent, so the clipPath hole will reveal this! 
          Wait, no, the clipPath limits where objects are drawn. 
          If the clipPath limits it, the area OUTSIDE the mold will show this background. */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }} />
      
      <div className="absolute inset-0 z-10">
        <canvas ref={canvasRef} />
      </div>

      {/* Floating Zoom Indicator */}
      <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-[10px] font-bold text-zinc-600 z-20 pointer-events-none border border-zinc-200">
        Alt + Drag para Mover
      </div>
    </div>
  );
};

export default CanvasEngine;
