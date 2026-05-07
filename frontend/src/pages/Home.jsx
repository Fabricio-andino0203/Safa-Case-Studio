import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-zinc-950 to-fuchsia-950/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" /><span>Diseña tu cobertor único</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 animate-fade-in-up">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Safa Case</span><br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Studio</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Personaliza tu cobertor en segundos. Sube tu imagen, ajusta el diseño y recibe tu funda única.
          </p>
        </div>
      </header>

      {/* Models */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Elige tu modelo</h2>
            <p className="text-zinc-500 text-sm mt-1">{filtered.length} modelos disponibles</p>
          </div>
        </div>

        {/* Brand Filter */}
        {marcas.length > 0 && (
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <button onClick={() => setFiltroMarca('todos')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtroMarca === 'todos' ? 'bg-white text-black' : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
              Todas
            </button>
            {marcas.map(m => (
              <button key={m} onClick={() => setFiltroMarca(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtroMarca === m ? 'bg-white text-black' : 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                {m}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Smartphone className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">No hay modelos disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 stagger-children">
            {filtered.map(modelo => (
              <button key={modelo.id}
                onClick={() => navigate(`/editor/${modelo.id}`, { state: { modelo } })}
                className="group glass p-5 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-zinc-800/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/5 active:scale-[0.98] cursor-pointer">
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden group-hover:from-violet-900/30 group-hover:to-fuchsia-900/20 transition-all duration-300">
                  {modelo.molde_preview_url ? (
                    <img src={`http://localhost:5000${modelo.molde_preview_url}`} alt={modelo.nombre}
                      className="w-14 h-14 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Smartphone className="w-8 h-8 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                  )}
                </div>
                <div className="text-center">
                  {modelo.marca && <span className="text-[10px] text-violet-400/60 uppercase tracking-wider">{modelo.marca}</span>}
                  <h3 className="font-semibold text-base group-hover:text-white transition-colors">{modelo.nombre}</h3>
                  <span className="text-xs text-zinc-500">{modelo.stock} disponible{modelo.stock !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-600 group-hover:text-violet-400 transition-colors">
                  <span>Personalizar</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
