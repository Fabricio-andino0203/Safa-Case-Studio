import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const CATEGORIAS = ['Diseño', 'Textura', 'Fondo', 'Patrón', 'Degradado'];

export default function Fondos() {
  const [fondos, setFondos] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', categoria: '' });
  const [imagen, setImagen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtroCat, setFiltroCat] = useState('todos');
  const [preview, setPreview] = useState(null);

  useEffect(() => { fetchFondos(); }, []);

  const fetchFondos = async () => {
    try { setFondos((await axios.get(`${API_URL}/fondos`)).data); }
    catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imagen) { alert('Selecciona una imagen'); return; }
    setLoading(true);
    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('categoria', formData.categoria);
    data.append('imagen', imagen);
    try {
      await axios.post(`${API_URL}/fondos`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData({ nombre: '', categoria: '' });
      setImagen(null);
      setShowForm(false);
      fetchFondos();
    } catch (err) { console.error(err); alert('Error al subir'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (id) => {
    try { await axios.put(`${API_URL}/fondos/${id}/toggle`); fetchFondos(); }
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try { await axios.delete(`${API_URL}/fondos/${id}`); fetchFondos(); }
    catch (err) { alert('Error al eliminar'); }
  };

  const cats = [...new Set(fondos.map(f => f.categoria).filter(Boolean))];
  const filtered = filtroCat === 'todos' ? fondos : fondos.filter(f => f.categoria === filtroCat);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Fondos y Diseños</h2>
          <p className="text-zinc-400 text-sm">Sube diseños, texturas y fondos que tus clientes pueden usar en el editor.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-zinc-200 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Subir Fondo
        </button>
      </header>

      {/* Upload Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl border border-zinc-800 mb-8 animate-fade-in-up">
          <h3 className="font-semibold text-lg mb-4">Nuevo Fondo / Diseño</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
              <input required type="text" value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Ej: Galaxia Azul" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Categoría</label>
              <select required value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none">
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Imagen</label>
              <label className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-violet-500 transition-colors">
                <Upload className="w-5 h-5 text-zinc-500" />
                <span className="text-sm text-zinc-400 truncate">{imagen ? imagen.name : 'Seleccionar...'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImagen(e.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button disabled={loading} type="submit"
              className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 text-sm">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {/* Category Filter */}
      {cats.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-zinc-500 mr-1">Filtrar:</span>
          <button onClick={() => setFiltroCat('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroCat === 'todos' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            Todos ({fondos.length})
          </button>
          {cats.map(c => (
            <button key={c} onClick={() => setFiltroCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroCat === c ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {c} ({fondos.filter(f => f.categoria === c).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(f => (
          <div key={f.id} className={`group relative rounded-2xl overflow-hidden border transition-all ${!f.activo ? 'opacity-40 border-zinc-800' : 'border-zinc-800 hover:border-violet-500/30'}`}>
            <div className="aspect-[3/4] bg-zinc-900 cursor-pointer" onClick={() => setPreview(`http://localhost:5000${f.imagen_url}`)}>
              <img src={`http://localhost:5000${f.imagen_url}`} alt={f.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="p-3 bg-zinc-900/90">
              <p className="text-sm font-semibold truncate">{f.nombre}</p>
              <p className="text-[10px] text-violet-400/60 uppercase tracking-wider">{f.categoria}</p>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleToggle(f.id)}
                className="p-1.5 bg-black/70 rounded-lg hover:bg-black text-white" title={f.activo ? 'Desactivar' : 'Activar'}>
                {f.activo ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => handleDelete(f.id, f.nombre)}
                className="p-1.5 bg-black/70 rounded-lg hover:bg-red-600 text-white" title="Eliminar">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-zinc-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay fondos aún. Haz clic en "Subir Fondo".</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in"
          onClick={() => setPreview(null)}>
          <img src={preview} alt="Preview" className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-zinc-700 animate-fade-in-up" />
        </div>
      )}
    </div>
  );
}
