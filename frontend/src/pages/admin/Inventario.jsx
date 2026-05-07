import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertTriangle, Trash2, Sparkles, Smartphone, Check } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function Inventario() {
  const [modelos, setModelos] = useState([]);
  const [filtroMarca, setFiltroMarca] = useState('todos');

  useEffect(() => { fetchModelos(); }, []);

  const fetchModelos = async () => {
    try { setModelos((await axios.get(`${API_URL}/modelos`)).data.map(m => ({ ...m, newStock: undefined }))); }
    catch (err) { console.error(err); }
  };

  const handleStockChange = (id, value) => {
    setModelos(modelos.map(m => m.id === id ? { ...m, newStock: value } : m));
  };

  const updateStock = async (id, stock) => {
    try { await axios.put(`${API_URL}/modelos/${id}/stock`, { stock: parseInt(stock) }); fetchModelos(); }
    catch (err) { console.error(err); alert('Error'); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar "${nombre}" del inventario?`)) return;
    try {
      await axios.delete(`${API_URL}/modelos/${id}`);
      fetchModelos();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const marcas = [...new Set(modelos.map(m => m.marca).filter(Boolean))];
  const filtered = filtroMarca === 'todos' ? modelos : modelos.filter(m => m.marca === filtroMarca);
  const lowStock = modelos.filter(m => m.stock <= 5 && m.stock > 0 && m.activo);
  const outOfStock = modelos.filter(m => m.stock === 0 && m.activo);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-red mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Stock de Almacén</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Control de Inventario</h2>
          <p className="text-zinc-500 text-xs mt-1">Monitorea y actualiza la cantidad de protectores físicos disponibles para personalización express.</p>
        </div>
      </header>

      {/* Modern Neon Warnings Banner */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStock.length > 0 && (
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-brand-red/5 border border-brand-red/10 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-brand-red shrink-0 mt-0.5 animate-pulse-glow" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-red">Faltantes Críticos (Sin Stock)</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{outOfStock.map(m => m.nombre).join(', ')}</p>
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-500">Últimas Unidades (Stock Bajo)</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{lowStock.map(m => `${m.nombre} (${m.stock})`).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Filters tabs */}
      {marcas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border-b border-white/5 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-2">Filtrar:</span>
          <button onClick={() => setFiltroMarca('todos')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              filtroMarca === 'todos' 
                ? 'bg-brand-red text-white' 
                : 'bg-brand-medium text-zinc-400 hover:text-white hover:bg-brand-light'
            }`}>
            Todos ({modelos.length})
          </button>
          {marcas.map(m => (
            <button key={m} onClick={() => setFiltroMarca(m)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                filtroMarca === m 
                  ? 'bg-brand-red text-white' 
                  : 'bg-brand-medium text-zinc-400 hover:text-white hover:bg-brand-light'
              }`}>
              {m} ({modelos.filter(x => x.marca === m).length})
            </button>
          ))}
        </div>
      )}

      {/* Inventory Table Frame */}
      <div className="bg-brand-dark/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-brand-dark/85 border-b border-white/5 text-zinc-500">
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Marca</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Modelo</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Tamaño de Molde</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Estatus</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Stock Disponible</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Ajuste de Cantidad / Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(m => {
              const hasChanged = m.newStock !== undefined && parseInt(m.newStock) !== m.stock;
              return (
                <tr key={m.id} className={`hover:bg-brand-medium/20 transition-all duration-300 group ${!m.activo ? 'opacity-30' : ''}`}>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-medium border border-white/5 text-[9px] text-zinc-300 font-bold uppercase tracking-wider">{m.marca || '—'}</span>
                  </td>
                  <td className="p-4 font-bold text-sm text-zinc-200 group-hover:text-white transition-colors">{m.nombre}</td>
                  <td className="p-4 text-zinc-400 font-semibold">{m.ancho_impresion} × {m.alto_impresion} cm</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${m.activo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {m.activo ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                      m.stock > 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                      m.stock > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-brand-red/10 text-brand-red border border-brand-red/15 animate-pulse-glow'
                    }`}>{m.stock} unidades</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input type="number"
                        className={`w-20 bg-brand-black border rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:outline-none transition-colors text-center ${
                          hasChanged ? 'border-brand-red ring-2 ring-brand-red/15' : 'border-white/5 hover:border-white/10'
                        }`}
                        value={m.newStock !== undefined ? m.newStock : m.stock}
                        onChange={e => handleStockChange(m.id, e.target.value)} />
                      
                      <button onClick={() => updateStock(m.id, m.newStock !== undefined ? m.newStock : m.stock)}
                        disabled={!hasChanged}
                        className={`p-2 rounded-xl transition-all border inline-flex cursor-pointer ${
                          hasChanged 
                            ? 'bg-brand-red text-white border-brand-red hover:bg-brand-red-hover shadow-lg shadow-brand-red/15' 
                            : 'bg-brand-medium text-zinc-600 border-white/5 cursor-not-allowed'
                        }`} title="Confirmar Ajuste">
                        <Check className="w-4 h-4" />
                      </button>

                      <button onClick={() => handleDelete(m.id, m.nombre)}
                        className="p-2 border border-transparent hover:border-brand-red/20 rounded-xl text-zinc-600 hover:text-brand-red transition-all cursor-pointer"
                        title="Eliminar del sistema">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="p-10 text-center text-zinc-500 font-bold uppercase tracking-wider">
                  No se encontraron elementos disponibles en este catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
