import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Package, ShieldCheck, Image as ImageIcon, ExternalLink } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const menu = [
    { name: 'Órdenes', path: '/admin', icon: LayoutDashboard },
    { name: 'Modelos de Cover', path: '/admin/modelos', icon: Smartphone },
    { name: 'Inventario / Stock', path: '/admin/inventario', icon: Package },
    { name: 'Fondos Pre-cargados', path: '/admin/fondos', icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Sidebar - SaaS Premium Panel */}
      <aside className="w-64 border-r border-white/5 bg-[#121212]/90 flex flex-col shrink-0 relative z-10">
        
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center animate-pulse-glow shrink-0">
            <ShieldCheck className="w-5 h-5 text-brand-red" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold text-sm uppercase tracking-wider text-white leading-none">
              SAFA <span className="text-brand-red">STUDIO</span>
            </h1>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Panel de Taller</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1">
          {menu.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  isActive
                    ? 'bg-brand-red/10 border border-brand-red/30 text-white shadow-md shadow-brand-red/5'
                    : 'text-zinc-500 hover:bg-brand-medium/50 hover:text-white'
                }`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-red' : ''}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-brand-black/40">
          <Link to="/"
            className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors py-2.5 bg-brand-medium/40 rounded-xl border border-white/5 hover:bg-brand-medium">
            <span>Ver Tienda</span>
            <ExternalLink className="w-3 h-3 text-brand-red" />
          </Link>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-auto bg-[#080808] relative">
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
