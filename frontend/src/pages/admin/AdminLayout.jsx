import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Package, ShieldCheck, Image as ImageIcon } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const menu = [
    { name: 'Órdenes', path: '/admin', icon: LayoutDashboard },
    { name: 'Modelos', path: '/admin/modelos', icon: Smartphone },
    { name: 'Inventario', path: '/admin/inventario', icon: Package },
    { name: 'Fondos', path: '/admin/fondos', icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base">Safa Admin</h1>
            <p className="text-[10px] text-zinc-500">Panel de Taller</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menu.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 text-white font-semibold border border-violet-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors py-2"
          >
            ← Ver Tienda
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
