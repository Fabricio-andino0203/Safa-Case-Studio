import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, Image } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const MARCAS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Realme', 'Honor', 'Google', 'OnePlus', 'Otra'];

export default function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '', marca: '', ancho_impresion: '', alto_impresion: '', stock: ''
  });
  const [molde, setMolde] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtroMarca, setFiltroMarca] = useState('todos');

  useEffect(() => { fetchModelos(); }, []);

  const fetchModelos = async () => {
    try { setModelos((await axios.get(`${API_URL}/modelos`)).data); }
    catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!molde) { alert('Sube un molde PNG (fondo verde + cobertor blanco)'); return; }
    setLoading(true);
    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('marca', formData.marca);
    data.append('ancho_impresion', formData.ancho_impresion);
    data.append('alto_impresion', formData.alto_impresion);
    data.append('stock', formData.stock);
    data.append('molde', molde);
    try {
      await axios.post(`${API_URL}/modelos`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData({ nombre: '', marca: '', ancho_impresion: '', alto_impresion: '', stock: '' });
      setMolde(null);
      setShowForm(false);
      fetchModelos();
    } catch (err) { console.error(err); alert('Error al crear modelo'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (id) => {
    try { await axios.put(`${API_URL}/modelos/${id}/toggle`); fetchModelos(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try { await axios.delete(`${API_URL}/modelos/${id}`); fetchModelos(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  // Get unique brands from data
  const marcas = [...new Set(modelos.map(m => m.marca).filter(Boolean))];
  const filtered = filtroMarca === 'todos' ? modelos : modelos.filter(m => m.marca === filtroMarca);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Modelos de Cobertores</h2>
          <p className="text-zinc-400 text-sm">Administra el catálogo. Sube la lámina con fondo verde y el sistema procesará la máscara automáticamente.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-zinc-200 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Nuevo Modelo
        </button>
      </header>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl border border-zinc-800 mb-8 animate-fade-in-up">
          <h3 className="font-semibold text-lg mb-4">Agregar Modelo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Marca</label>
              <select required value={formData.marca}
                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none">
                <option value="">Seleccionar marca...</option>
                {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Modelo</label>
              <input required type="text" value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ej: iPhone 15 Pro Max" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Ancho Impresión (cm)</label>
              <input required type="number" step="0.1" value={formData.ancho_impresion}
                onChange={e => setFormData({ ...formData, ancho_impresion: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ej: 7.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Alto Impresión (cm)</label>
              <input required type="number" step="0.1" value={formData.alto_impresion}
                onChange={e => setFormData({ ...formData, alto_impresion: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ej: 15.2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Stock Inicial</label>
              <input required type="number" value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ej: 100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Molde (Fondo Verde + Cobertor Blanco)</label>
              <label className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-violet-500 transition-colors">
                <Upload className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-zinc-400 truncate">{molde ? molde.name : 'Seleccionar imagen...'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setMolde(e.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button disabled={loading} type="submit"
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">Cancelar</button>
          </div>
        </form>
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

      {/* Models Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="p-4 font-medium">Preview</th>
              <th className="p-4 font-medium">Marca</th>
              <th className="p-4 font-medium">Nombre</th>
              <th className="p-4 font-medium">Dimensiones</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Estado</th>
              <th className="p-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map(m => (
              <tr key={m.id} className={`hover:bg-zinc-800/20 transition-colors ${!m.activo ? 'opacity-40' : ''}`}>
                <td className="p-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                    {m.molde_preview_url ? (
                      <img src={`http://localhost:5000${m.molde_preview_url}`} alt={m.nombre} className="w-10 h-10 object-contain" />
                    ) : m.molde_url ? (
                      <img src={`http://localhost:5000${m.molde_url}`} alt={m.nombre} className="w-10 h-10 object-contain" />
                    ) : (
                      <Image className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-300 font-medium">{m.marca || '—'}</span>
                </td>
                <td className="p-4 font-semibold">{m.nombre}</td>
                <td className="p-4 text-zinc-400">{m.ancho_impresion} × {m.alto_impresion} cm</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    m.stock > 10 ? 'bg-emerald-500/10 text-emerald-400' :
                    m.stock > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                  }`}>{m.stock}</span>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${m.activo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleToggle(m.id)}
                      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                      title={m.activo ? 'Desactivar' : 'Activar'}>
                      {m.activo ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDelete(m.id, m.nombre)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-zinc-500 hover:text-red-400" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="7" className="p-8 text-center text-zinc-500">
                {filtroMarca !== 'todos' ? `No hay modelos de ${filtroMarca}.` : 'No hay modelos. Haz clic en "Nuevo Modelo".'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
