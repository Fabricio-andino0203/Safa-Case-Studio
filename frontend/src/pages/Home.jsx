import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, Sparkles, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import axios from 'axios';

import { API_URL, getImageUrl } from '../config';

export default function Home() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMarca, setFiltroMarca] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/modelos`)
      .then(res => {
        setModelos(res.data.filter(m => m.stock > 0 && m.activo));
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const marcas = [...new Set(modelos.map(m => m.marca).filter(Boolean))];
  const filtered = filtroMarca === 'todos' ? modelos : modelos.filter(m => m.marca === filtroMarca);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Navbar Superior */}
      <nav className="border-b border-white/5 bg-[#080808]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Safa Digital" 
              onError={(e) => { e.target.style.display = 'none'; }}
              className="h-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none text-white flex items-center gap-1">
                SAFA <span className="text-brand-red">CASE</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-medium leading-none mt-1">
                Lo que te imaginas te lo creamos
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] bg-brand-red/10 border border-brand-red/20 text-brand-red font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full animate-pulse-glow">
              Taller Activo (24h Express)
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-12 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-red/10 rounded-full blur-[120px]" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-medium border border-white/5 text-zinc-300 text-xs font-semibold mb-6 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5 text-brand-red" />
            <span>PERSONALIZACIÓN EXPRESS ULTRA-RÁPIDA</span>
          </div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-4 animate-fade-in-up uppercase">
            <span className="bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">Crea tu Cobertor</span><br />
            <span className="text-brand-red text-glow-red">Premium</span>
          </h1>
          
          <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto mb-8 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Sube tus imágenes favoritas, añade texturas y fondos precargados en segundos.
            Impresión de alta fidelidad garantizada por <span className="text-white font-semibold">Safa Digital</span>.
          </p>

          {/* Quick trust badges */}
          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-red" /> Envío Express</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-brand-red" /> Calidad Garantizada</span>
          </div>
        </div>
      </header>

      {/* Models Section */}
      <main className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-white">Modelos Compatibles</h2>
            <p className="text-zinc-500 text-xs mt-1">Elige el molde exacto para tu teléfono.</p>
          </div>
          <span className="text-[11px] bg-brand-medium text-zinc-400 border border-white/5 rounded-lg px-2.5 py-1 mt-3 md:mt-0">
            {filtered.length} Dispositivos Listos
          </span>
        </div>

        {/* Brand Filtering Tabs */}
        {marcas.length > 0 && (
          <div className="flex items-center gap-2 mb-8 flex-wrap overflow-x-auto pb-2">
            <button onClick={() => setFiltroMarca('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                filtroMarca === 'todos' 
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                  : 'bg-brand-medium text-zinc-400 border border-white/5 hover:text-white hover:bg-brand-light'
              }`}>
              Todos ({modelos.length})
            </button>
            {marcas.map(m => (
              <button key={m} onClick={() => setFiltroMarca(m)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  filtroMarca === m 
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' 
                    : 'bg-brand-medium text-zinc-400 border border-white/5 hover:text-white hover:bg-brand-light'
                }`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Grid or States */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 border-2 border-zinc-800 rounded-full" />
              <div className="absolute inset-0 border-2 border-t-brand-red rounded-full animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-brand-dark rounded-3xl border border-white/5">
            <Smartphone className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No hay modelos de cobertor disponibles por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(modelo => (
              <button key={modelo.id}
                onClick={() => navigate(`/editor/${modelo.id}`, { state: { modelo } })}
                className="group glass-card p-5 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-brand-medium border border-white/5 hover:border-brand-red/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-red/5 cursor-pointer">
                
                {/* Image / Preview Box */}
                <div className="relative w-28 h-28 rounded-xl bg-brand-black border border-white/5 flex items-center justify-center overflow-hidden group-hover:border-brand-red/10 transition-all duration-300 p-2">
                  {modelo.imagen_real_url ? (
                    <img src={getImageUrl(modelo.imagen_real_url)} alt={modelo.nombre}
                      className="w-full h-full object-contain opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                  ) : modelo.molde_preview_url ? (
                    <img src={getImageUrl(modelo.molde_preview_url)} alt={modelo.nombre}
                      className="w-20 h-20 object-contain opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                  ) : (
                    <Smartphone className="w-10 h-10 text-zinc-600 group-hover:text-brand-red transition-colors" />
                  )}
                </div>

                {/* Details */}
                <div className="text-center w-full">
                  {modelo.marca && (
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                      {modelo.marca}
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-zinc-200 group-hover:text-white transition-colors mt-0.5 truncate px-2">
                    {modelo.nombre}
                  </h3>
                  
                  {/* Stock tag */}
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-semibold mt-2 ${
                    modelo.stock <= 5 
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' 
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                  }`}>
                    {modelo.stock <= 5 ? `¡Solo ${modelo.stock} quedan!` : 'En Stock'}
                  </span>
                </div>

                {/* Button micro-interaction */}
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 group-hover:text-brand-red font-bold transition-all mt-1">
                  <span>PERSONALIZAR</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Discret Footer */}
      <footer className="border-t border-white/5 py-10 bg-brand-black">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <p className="text-[10px] text-zinc-600 tracking-wider">
            &copy; {new Date().getFullYear()} SAFA DIGITAL · TODOS LOS DERECHOS RESERVADOS
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase text-zinc-600 tracking-widest">Lo que te imaginas te lo creamos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
