import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon, Sparkles, X } from 'lucide-react';

import { API_URL, getImageUrl } from '../../config';
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
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-red mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Texturas y Fondos</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Galería de Fondos</h2>
          <p className="text-zinc-500 text-xs mt-1">Sube texturas y diseños pre-cargados que estarán disponibles para que los clientes elijan en el editor.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary py-2.5 text-xs uppercase tracking-wider font-bold">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Cerrar Panel' : 'Subir Fondo'}</span>
        </button>
      </header>

      {/* Upload Form Panel */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-2xl animate-fade-in-up">
          <h3 className="font-extrabold text-white text-base uppercase tracking-tight mb-5 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-brand-red" /> Añadir Diseño al Catálogo Colectivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Nombre descriptivo</label>
              <input required type="text" value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: Mármol de Carrara" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Categoría</label>
              <select required value={formData.categoria}
                onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white appearance-none cursor-pointer">
                <option value="" className="bg-[#121212]">Seleccionar...</option>
                {CATEGORIAS.map(c => <option key={c} value={c} className="bg-[#121212]">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Archivo de Imagen</label>
              <label className="flex items-center gap-2 bg-brand-black/50 border border-white/5 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-brand-red/40 transition-colors">
                <Upload className="w-4 h-4 text-brand-red shrink-0" />
                <span className="text-xs text-zinc-400 truncate">{imagen ? imagen.name : 'Subir imagen...'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImagen(e.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button disabled={loading} type="submit"
              className="btn-primary px-6 py-3 text-xs uppercase tracking-wider font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Guardar Fondo</span>
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="btn-secondary px-6 py-3 text-xs uppercase tracking-wider font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {/* Categories Tabs Filter */}
      {cats.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border-b border-white/5 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-2">Filtrar:</span>
          <button onClick={() => setFiltroCat('todos')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              filtroCat === 'todos' 
                ? 'bg-brand-red text-white' 
                : 'bg-brand-medium text-zinc-400 hover:text-white hover:bg-brand-light'
            }`}>
            Todos ({fondos.length})
          </button>
          {cats.map(c => (
            <button key={c} onClick={() => setFiltroCat(c)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                filtroCat === c 
                  ? 'bg-brand-red text-white' 
                  : 'bg-brand-medium text-zinc-400 hover:text-white hover:bg-brand-light'
              }`}>
              {c} ({fondos.filter(f => f.categoria === c).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(f => (
          <div key={f.id} className={`group relative rounded-2xl overflow-hidden border bg-brand-dark/40 transition-all duration-300 ${
            !f.activo ? 'opacity-30 border-white/5' : 'border-white/5 hover:border-brand-red/30 hover:scale-[1.01]'
          }`}>
            <div className="aspect-[3/4] bg-brand-black cursor-pointer" onClick={() => setPreview(getImageUrl(f.imagen_url))}>
              <img src={getImageUrl(f.imagen_url)} alt={f.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-4 border-t border-white/5">
              <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{f.nombre}</p>
              <p className="text-[9px] text-brand-red font-bold uppercase tracking-widest mt-1">{f.categoria}</p>
            </div>
            
            {/* Quick Actions overlay */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleToggle(f.id)}
                className="p-1.5 bg-brand-black/90 rounded-lg hover:bg-brand-medium text-white transition-colors cursor-pointer border border-white/5" 
                title={f.activo ? 'Desactivar fondo' : 'Activar fondo'}>
                {f.activo ? <ToggleRight className="w-4 h-4 text-brand-red" /> : <ToggleLeft className="w-4 h-4 text-zinc-500" />}
              </button>
              <button onClick={() => handleDelete(f.id, f.nombre)}
                className="p-1.5 bg-brand-black/90 hover:bg-brand-red text-white transition-colors cursor-pointer border border-white/5" 
                title="Eliminar del catálogo">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20 bg-brand-dark rounded-3xl border border-white/5">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold">No se encontraron diseños disponibles en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Immersive Image Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fade-in"
          onClick={() => setPreview(null)}>
          <div className="relative max-w-full max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl shadow-black animate-fade-in-up">
            <img src={preview} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
