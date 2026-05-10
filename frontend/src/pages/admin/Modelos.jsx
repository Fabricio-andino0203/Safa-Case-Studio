import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, Image, Sparkles, Smartphone, ArrowRight, X } from 'lucide-react';

import { API_URL, getImageUrl } from '../../config';

const MARCAS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Vivo', 'Realme', 'Honor', 'Google', 'OnePlus', 'Otra'];

export default function Modelos() {
  const [modelos, setModelos] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '', marca: '', ancho_impresion: '', alto_impresion: '', stock: '', imagen_real_url: ''
  });
  const [molde, setMolde] = useState(null);
  const [svgMolde, setSvgMolde] = useState(null);
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
    if (!molde && !svgMolde) { alert('Sube al menos un molde (PNG o SVG)'); return; }
    setLoading(true);
    const data = new FormData();
    data.append('nombre', formData.nombre);
    data.append('marca', formData.marca);
    data.append('ancho_impresion', formData.ancho_impresion);
    data.append('alto_impresion', formData.alto_impresion);
    data.append('stock', formData.stock);
    data.append('imagen_real_url', formData.imagen_real_url);
    data.append('molde', molde);
    if (svgMolde) data.append('svg_molde', svgMolde);
    try {
      await axios.post(`${API_URL}/modelos`, data);
      setFormData({ nombre: '', marca: '', ancho_impresion: '', alto_impresion: '', stock: '', imagen_real_url: '' });
      setMolde(null);
      setShowForm(false);
      fetchModelos();
    } catch (err) { 
      console.error(err); 
      alert(err.response?.data?.error || 'Error al crear modelo'); 
    }
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

  const marcas = [...new Set(modelos.map(m => m.marca).filter(Boolean))];
  const filtered = filtroMarca === 'todos' ? modelos : modelos.filter(m => m.marca === filtroMarca);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-red mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Configuración de Moldes</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Modelos de Cobertores</h2>
          <p className="text-zinc-500 text-xs mt-1">Sube la lámina verde y blanca, el motor gráfico la convertirá en una máscara de diseño interactiva.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary py-2.5 text-xs uppercase tracking-wider font-bold">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showForm ? 'Cerrar Panel' : 'Nuevo Modelo'}</span>
        </button>
      </header>

      {/* Creation Modal / Form Panel */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 relative shadow-2xl animate-fade-in-up">
          <h3 className="font-extrabold text-white text-base uppercase tracking-tight mb-5 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-red" /> Añadir Nuevo Molde al Catálogo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Marca del Dispositivo</label>
              <select required value={formData.marca}
                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white appearance-none cursor-pointer">
                <option value="" className="bg-[#121212]">Seleccionar marca...</option>
                {MARCAS.map(m => <option key={m} value={m} className="bg-[#121212]">{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Nombre comercial</label>
              <input required type="text" value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: iPhone 15 Pro Max" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Ancho de Impresión (cm)</label>
              <input required type="number" step="0.1" value={formData.ancho_impresion}
                onChange={e => setFormData({ ...formData, ancho_impresion: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: 7.5" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Alto de Impresión (cm)</label>
              <input required type="number" step="0.1" value={formData.alto_impresion}
                onChange={e => setFormData({ ...formData, alto_impresion: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: 15.2" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Stock Inicial</label>
              <input required type="number" value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: 100" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Lámina / Molde original (PNG)</label>
              <label className="flex items-center gap-2 bg-brand-black/50 border border-white/5 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-brand-red/40 transition-colors">
                <Upload className="w-4 h-4 text-brand-red shrink-0" />
                <span className="text-xs text-zinc-400 truncate">{molde ? molde.name : 'Subir molde blanco...'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setMolde(e.target.files[0])} />
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Vector del Molde (SVG - Opcional)</label>
              <label className="flex items-center gap-2 bg-brand-black/50 border border-white/5 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-brand-red/40 transition-colors">
                <Sparkles className="w-4 h-4 text-brand-red shrink-0" />
                <span className="text-xs text-zinc-400 truncate">{svgMolde ? svgMolde.name : 'Subir SVG...'}</span>
                <input type="file" accept=".svg" className="hidden" onChange={e => setSvgMolde(e.target.files[0])} />
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">URL de la Imagen Real (Opcional)</label>
              <input type="text" value={formData.imagen_real_url}
                onChange={e => setFormData({ ...formData, imagen_real_url: e.target.value })}
                className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                placeholder="Ej: https://example.com/imagen.png" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button disabled={loading} type="submit"
              className="btn-primary px-6 py-3 text-xs uppercase tracking-wider font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Crear Modelo</span>
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="btn-secondary px-6 py-3 text-xs uppercase tracking-wider font-bold">Cancelar</button>
          </div>
        </form>
      )}

      {/* Brand Tabs Filters */}
      {marcas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap border-b border-white/5 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-2">Marcas:</span>
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

      {/* Model Grid/Table */}
      <div className="bg-brand-dark/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-brand-dark/85 border-b border-white/5 text-zinc-500">
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Preview Máscara</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Marca</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Modelo</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Tamaño de Impresión</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Inventario</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Estado</th>
              <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(m => (
              <tr key={m.id} className={`hover:bg-brand-medium/20 transition-all duration-300 group ${!m.activo ? 'opacity-30' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {/* Silhouette */}
                    <div className="w-10 h-10 rounded-xl bg-brand-black flex items-center justify-center overflow-hidden border border-white/5" title="Máscara de corte">
                      {m.molde_preview_url ? (
                        <img src={getImageUrl(m.molde_preview_url)} alt={m.nombre} className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Image className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    {/* Real render */}
                    <div className="w-10 h-10 rounded-xl bg-brand-black flex items-center justify-center overflow-hidden border border-white/5" title="Foto real">
                      {m.imagen_real_url ? (
                        <img src={getImageUrl(m.imagen_real_url)} alt={m.nombre} className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-medium border border-white/5 text-[9px] text-zinc-300 font-bold uppercase tracking-wider">{m.marca || '—'}</span>
                </td>
                <td className="p-4 font-bold text-sm text-zinc-200 group-hover:text-white transition-colors">{m.nombre}</td>
                <td className="p-4 text-zinc-400 font-semibold">{m.ancho_impresion} × {m.alto_impresion} cm</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                    m.stock > 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                    m.stock > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-brand-red/10 text-brand-red border border-brand-red/15 animate-pulse-glow'
                  }`}>{m.stock} unidades</span>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${m.activo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleToggle(m.id)}
                      className="p-2 rounded-xl bg-brand-medium hover:bg-brand-light text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
                      title={m.activo ? 'Desactivar modelo' : 'Activar modelo'}>
                      {m.activo ? <ToggleRight className="w-4 h-4 text-brand-red" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(m.id, m.nombre)}
                      className="p-2 hover:bg-brand-red/10 border border-transparent hover:border-brand-red/20 rounded-xl text-zinc-600 hover:text-brand-red transition-all cursor-pointer" title="Eliminar del sistema">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="p-10 text-center text-zinc-500 font-bold uppercase tracking-wider">
                  {filtroMarca !== 'todos' ? `No se encontraron modelos de ${filtroMarca}.` : 'No hay modelos disponibles.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
