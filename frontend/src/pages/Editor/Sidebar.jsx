import React from 'react';
import { Upload, Image as ImageIcon, Layers, SlidersHorizontal, Grid3X3, Palette } from 'lucide-react';
import { useEditorStore } from './store';

const Sidebar = () => {
  const { activeTab, setActiveTab } = useEditorStore();

  const tabs = [
    { id: 'upload', icon: Upload, label: 'Subir' },
    { id: 'designs', icon: ImageIcon, label: 'Diseños' },
    { id: 'collage', icon: Grid3X3, label: 'Collage' },
    { id: 'color', icon: Palette, label: 'Color' },
    { id: 'filters', icon: SlidersHorizontal, label: 'Ajustes' },
    { id: 'layers', icon: Layers, label: 'Capas' },
  ];

  return (
    <aside className="w-full h-16 sm:w-20 sm:h-full bg-white border-t sm:border-t-0 sm:border-r border-zinc-200 flex flex-row sm:flex-col py-2 sm:py-6 items-center justify-around sm:justify-start gap-2 sm:gap-6 z-40 relative shadow-[0_-4px_24px_rgba(0,0,0,0.02)] sm:shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:w-full transition-all group ${isActive ? 'text-brand-red' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${isActive ? 'bg-red-50 shadow-sm' : 'group-hover:bg-zinc-50'}`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </div>
            <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        );
      })}
    </aside>
  );
};

export default Sidebar;
