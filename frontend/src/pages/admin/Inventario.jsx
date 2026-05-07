import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';

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
    if (!confirm(`¿Seguro que deseas eliminar "${nombre}"?`)) return;
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
    <div className="p-8">
      <header className="mb-6">
        <h2 className="text-3xl font-bold">Inventario</h2>
        <p className="text-zinc-400 text-sm">Controla la disponibilidad de tus modelos.</p>
      </header>

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {outOfStock.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Sin Stock</p>
                <p className="text-xs text-zinc-500">{outOfStock.map(m => m.nombre).join(', ')}</p>
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">Stock Bajo</p>
                <p className="text-xs text-zinc-500">{lowStock.map(m => `${m.nombre} (${m.stock})`).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Filter */}
      {marcas.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-zinc-500 mr-1">Filtrar:</span>
          <button onClick={() => setFiltroMarca('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroMarca === 'todos' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            Todas ({modelos.length})
          </button>
          {marcas.map(m => (
            <button key={m} onClick={() => setFiltroMarca(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroMarca === m ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {m} ({modelos.filter(x => x.marca === m).length})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Marca</th>
              <th className="p-4 font-medium">Modelo</th>
              <th className="p-4 font-medium">Dimensiones</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium">Stock Actual</th>
              <th className="p-4 font-medium text-right">Actualizar / Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map(m => {
              const hasChanged = m.newStock !== undefined && parseInt(m.newStock) !== m.stock;
              return (
                <tr key={m.id} className={`hover:bg-zinc-800/20 transition-colors ${!m.activo ? 'opacity-40' : ''}`}>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-300 font-medium">{m.marca || '—'}</span>
                  </td>
                  <td className="p-4 font-semibold">{m.nombre}</td>
                  <td className="p-4 text-zinc-400">{m.ancho_impresion} × {m.alto_impresion} cm</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium ${m.activo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      m.stock > 10 ? 'bg-emerald-500/10 text-emerald-400' :
                      m.stock > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>{m.stock} unds</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input type="number"
                        className={`w-20 bg-zinc-950 border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors ${
                          hasChanged ? 'border-violet-500' : 'border-zinc-700'
                        }`}
                        value={m.newStock !== undefined ? m.newStock : m.stock}
                        onChange={e => handleStockChange(m.id, e.target.value)} />
                      <button
                        onClick={() => updateStock(m.id, m.newStock !== undefined ? m.newStock : m.stock)}
                        disabled={!hasChanged}
                        className={`p-2 rounded-lg transition-colors inline-flex ${
                          hasChanged ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        }`} title="Guardar">
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.nombre)}
                        className="p-2 rounded-lg transition-colors inline-flex bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-zinc-500">No hay modelos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
