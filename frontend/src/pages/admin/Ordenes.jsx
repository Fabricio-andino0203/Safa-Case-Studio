import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Clock, Package, Truck, CheckCircle2, XCircle, ChevronDown, Eye, Filter, Sparkles, Smartphone, Check } from 'lucide-react';

import { API_URL, getImageUrl } from '../../config';

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/15', next: 'en_produccion' },
  en_produccion: { label: 'En Producción', color: 'bg-brand-red/10 text-brand-red border border-brand-red/15', next: 'lista_para_recoger' },
  lista_para_recoger: { label: 'Listo para Recoger', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/15', next: 'entregado' },
  entregado: { label: 'Entregado', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15', next: null },
  cancelado: { label: 'Cancelado', color: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/15', next: null },
};

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    try {
      const res = await axios.get(`${API_URL}/ordenes`);
      setOrdenes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEstado = async (id, estado) => {
    try {
      await axios.put(`${API_URL}/ordenes/${id}/estado`, { estado });
      fetchOrdenes();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filtroEstado === 'todos'
    ? ordenes
    : ordenes.filter(o => o.estado === filtroEstado);

  const counts = {
    todos: ordenes.length,
    pendiente: ordenes.filter(o => o.estado === 'pendiente').length,
    en_produccion: ordenes.filter(o => o.estado === 'en_produccion').length,
    lista_para_recoger: ordenes.filter(o => o.estado === 'lista_para_recoger').length,
    entregado: ordenes.filter(o => o.estado === 'entregado').length,
    cancelado: ordenes.filter(o => o.estado === 'cancelado').length,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-brand-red mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Cola de Producción</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Gestión de Órdenes</h2>
          <p className="text-zinc-500 text-xs mt-1">Supervisa y procesa el estado de los diseños enviados desde la web.</p>
        </div>
      </header>

      {/* Modern High-contrast Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: 'todos', label: 'Todas', color: 'border-white/5 bg-brand-dark hover:bg-brand-medium/60' },
          { key: 'pendiente', label: 'Pendientes', color: 'border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10' },
          { key: 'en_produccion', label: 'Producción', color: 'border-brand-red/10 bg-brand-red/5 hover:bg-brand-red/10' },
          { key: 'lista_para_recoger', label: 'Listas', color: 'border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10' },
          { key: 'entregado', label: 'Entregadas', color: 'border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10' },
          { key: 'cancelado', label: 'Canceladas', color: 'border-zinc-500/10 bg-zinc-500/5 hover:bg-zinc-500/10' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltroEstado(f.key)}
            className={`p-4 rounded-2xl border text-left transition-all duration-300 relative group cursor-pointer ${f.color} ${
              filtroEstado === f.key
                ? 'border-brand-red/30 bg-brand-red/10 text-white font-bold ring-2 ring-brand-red/10'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            <span className={`block text-2xl font-extrabold tracking-tight mb-1 ${
              filtroEstado === f.key ? 'text-brand-red text-glow-red' : 'text-zinc-400'
            }`}>{counts[f.key]}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Sleek Data Table Frame */}
      <div className="bg-brand-dark/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-brand-dark/80 border-b border-white/5 text-zinc-500">
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Código</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Cliente / Contacto</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Modelo / Molde</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Sucursal de Retiro</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Diseño Final</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Etapa</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Fecha</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(orden => {
                const estadoInfo = ESTADOS[orden.estado] || ESTADOS.pendiente;
                return (
                  <tr key={orden.id} className="hover:bg-brand-medium/20 transition-all duration-300 group">
                    <td className="p-4">
                      <span className="font-mono text-brand-red font-bold text-xs bg-brand-red/5 border border-brand-red/10 px-2.5 py-1 rounded-lg">
                        {orden.codigo}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-sm text-zinc-200 group-hover:text-white transition-colors">{orden.cliente_nombre}</p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{orden.cliente_telefono}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-semibold text-zinc-300">{orden.modelo_nombre}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-400 font-medium">{orden.tienda_nombre || '—'}</span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => setPreviewImage(getImageUrl(orden.diseno_url))}
                        className="relative group/preview shrink-0 border border-white/5 hover:border-brand-red/30 rounded-xl overflow-hidden block">
                        <img src={getImageUrl(orden.diseno_url)} alt="Diseño"
                          className="w-11 h-11 object-cover opacity-80 group-hover/preview:opacity-100 group-hover/preview:scale-105 transition-all duration-300" />
                        <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/preview:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-block ${estadoInfo.color}`}>
                        {estadoInfo.label}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 font-bold uppercase text-[9px]">
                      {new Date(orden.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WHATSAPP NOTIFICATIONS */}
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              const msg = `Hola *${orden.cliente_nombre}*, hemos recibido tu pedido *${orden.codigo}* de un *${orden.modelo_nombre}* en Safa Case Studio. Pronto iniciaremos la producción. %0A%0ASeguimiento: ${window.location.origin}/pedido/${orden.codigo}`;
                              window.open(`https://wa.me/${orden.cliente_telefono.replace(/\D/g, '')}?text=${msg}`, '_blank');
                            }}
                            className="p-2 bg-green-500/10 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl text-green-500 transition-all cursor-pointer"
                            title="Notificar Recibido">
                            <Clock className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const msg = `¡Hola *${orden.cliente_nombre}*! 🚀 Excelentes noticias: Tu cobertor para el *${orden.modelo_nombre}* ya está listo para entrega en la sucursal *${orden.tienda_nombre || 'acordada'}*. %0A%0A¡Te esperamos!`;
                              window.open(`https://wa.me/${orden.cliente_telefono.replace(/\D/g, '')}?text=${msg}`, '_blank');
                            }}
                            className="p-2 bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red hover:text-white rounded-xl text-brand-red transition-all cursor-pointer"
                            title="Notificar Listo">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>

                        <a href={getImageUrl(orden.pdf_url)} target="_blank" rel="noreferrer"
                          className="p-2 bg-brand-medium border border-white/5 hover:bg-brand-light rounded-xl text-zinc-400 hover:text-white transition-all inline-flex cursor-pointer"
                          title="Descargar PDF Listo para Impresión">
                          <Download className="w-4 h-4" />
                        </a>
                        
                        {estadoInfo.next && (
                          <button onClick={() => handleEstado(orden.id, estadoInfo.next)}
                            className="px-3 py-2 bg-white hover:bg-zinc-100 text-black rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            title={`Avanzar a ${ESTADOS[estadoInfo.next]?.label}`}>
                            <span>Avanzar</span>
                            <ChevronDown className="w-3 h-3 -rotate-90 text-brand-red" />
                          </button>
                        )}
                        
                        {orden.estado !== 'cancelado' && orden.estado !== 'entregado' && (
                          <button onClick={() => {
                            if (confirm('¿Deseas cancelar esta orden en el taller?')) {
                              handleEstado(orden.id, 'cancelado');
                            }
                          }}
                          className="p-2 hover:bg-brand-red/10 border border-transparent hover:border-brand-red/20 rounded-xl text-zinc-600 hover:text-brand-red transition-all inline-flex cursor-pointer"
                          title="Cancelar Orden">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-zinc-500 font-bold uppercase tracking-wider">
                    Sin órdenes en esta etapa actualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immersive Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fade-in"
          onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-full max-h-[85vh] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl shadow-black animate-fade-in-up">
            <img src={previewImage} alt="Diseño preview" className="max-w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
