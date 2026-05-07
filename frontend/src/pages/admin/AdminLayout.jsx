import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Smartphone, Package, ShieldCheck, Image as ImageIcon, ExternalLink, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function AdminLayout() {
  const location = useLocation();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  const menu = [
    { name: 'Órdenes', path: '/admin', icon: LayoutDashboard },
    { name: 'Modelos de Cover', path: '/admin/modelos', icon: Smartphone },
    { name: 'Inventario / Stock', path: '/admin/inventario', icon: Package },
    { name: 'Fondos Pre-cargados', path: '/admin/fondos', icon: ImageIcon },
  ];

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'REINICIAR') return;
    setResetting(true);
    try {
      await axios.post('http://localhost:5000/api/admin/reset-db');
      alert('¡Base de datos y archivos de prueba reiniciados con éxito! Stock restaurado a 100 unidades.');
      setShowResetModal(false);
      setResetConfirmText('');
      window.location.reload(); // reload current view to refresh data
    } catch (err) {
      console.error(err);
      alert('Error al reiniciar base de datos');
    } finally {
      setResetting(false);
    }
  };

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
        <div className="p-4 border-t border-white/5 bg-brand-black/40 space-y-2">
          
          {/* SECURE DB RESET TRIGGER */}
          <button onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-brand-red hover:text-white transition-all py-2.5 bg-brand-red/10 hover:bg-brand-red rounded-xl border border-brand-red/20 cursor-pointer">
            <RefreshCw className="w-3 h-3 text-brand-red group-hover:text-white" />
            <span>Mantenimiento</span>
          </button>

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

      {/* DOUBLE-CONFIRM MAINTENANCE SECURITY MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass max-w-md w-full rounded-3xl p-6 md:p-8 border border-brand-red/20 shadow-2xl relative">
            
            <div className="w-12 h-12 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto mb-4 text-brand-red">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-center font-black text-white text-lg uppercase tracking-tight mb-2">
              Reiniciar Sistema de Pruebas
            </h3>
            
            <p className="text-zinc-400 text-xs text-center leading-relaxed mb-6">
              Esta acción es irreversible y realizará lo siguiente:<br />
              1. **Eliminará todas las órdenes** registradas en el sistema.<br />
              2. **Borrará físicamente** todos los archivos de diseño, PDFs de impresión y códigos QR creados.<br />
              3. **Restaurará el inventario (stock)** de todas las fundas a **100 unidades** para que continúes tus pruebas con datos limpios.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center mb-2">
                  Escribe <span className="text-brand-red font-black">"REINICIAR"</span> para confirmar la acción:
                </label>
                <input type="text" value={resetConfirmText}
                  onChange={e => setResetConfirmText(e.target.value.toUpperCase())}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white text-center font-black tracking-widest uppercase"
                  placeholder="REINICIAR" />
              </div>

              <div className="flex gap-3 pt-2">
                <button disabled={resetConfirmText !== 'REINICIAR' || resetting}
                  onClick={handleResetDatabase}
                  className="btn-primary flex-1 py-3 text-xs uppercase tracking-wider font-extrabold disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>Confirmar Reinicio</span>
                </button>
                <button type="button" onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}
                  className="btn-secondary flex-1 py-3 text-xs uppercase tracking-wider font-bold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

