import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';
import { useEditorStore } from './store';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import { PanelContainer } from './Panels';
import CanvasEngine from './CanvasEngine';
import FloatingContextMenu from './FloatingContextMenu';

const EditorLayout = () => {
  const { modeloId } = useParams();
  const { setModelo, setFondos } = useEditorStore();

  useEffect(() => {
    const loadData = async () => {
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
    loadData();
  }, [modeloId, setModelo, setFondos]);

  return (
    <div className="h-screen w-full bg-white flex flex-col overflow-hidden font-sans text-zinc-900 selection:bg-brand-red/20">
      <Toolbar />
      <div className="flex-1 flex flex-col-reverse sm:flex-row overflow-hidden relative">
        <Sidebar />
        <PanelContainer />
        <main className="flex-1 relative flex flex-col overflow-hidden">
          <CanvasEngine />
          <FloatingContextMenu />
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;
