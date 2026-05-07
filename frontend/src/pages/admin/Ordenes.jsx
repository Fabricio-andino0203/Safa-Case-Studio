import { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Clock, Package, Truck, CheckCircle2, XCircle, ChevronDown, Eye } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const ESTADOS = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-400/10 text-amber-400', next: 'en_produccion' },
  en_produccion: { label: 'En Producción', color: 'bg-blue-400/10 text-blue-400', next: 'lista_para_recoger' },
  lista_para_recoger: { label: 'Lista para Recoger', color: 'bg-violet-400/10 text-violet-400', next: 'entregado' },
  entregado: { label: 'Entregado', color: 'bg-emerald-400/10 text-emerald-400', next: null },
  cancelado: { label: 'Cancelado', color: 'bg-red-400/10 text-red-400', next: null },
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
    <div className="p-8">
      <header className="mb-6">
        <h2 className="text-3xl font-bold">Órdenes</h2>
        <p className="text-zinc-400 text-sm">Gestiona los pedidos de los clientes.</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { key: 'todos', label: 'Todas', color: 'border-zinc-700' },
          { key: 'pendiente', label: 'Pendientes', color: 'border-amber-500/30' },
          { key: 'en_produccion', label: 'Producción', color: 'border-blue-500/30' },
          { key: 'lista_para_recoger', label: 'Listas', color: 'border-violet-500/30' },
          { key: 'entregado', label: 'Entregadas', color: 'border-emerald-500/30' },
          { key: 'cancelado', label: 'Canceladas', color: 'border-red-500/30' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`p-3 rounded-xl border text-center transition-all text-sm ${
              filtroEstado === f.key
                ? `${f.color} bg-zinc-800/60 text-white font-semibold`
                : 'border-zinc-800 text-zinc-500 hover:bg-zinc-900'
            }`}
          >
            <span className="block text-lg font-bold">{counts[f.key]}</span>
            <span className="text-xs">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Modelo</th>
                <th className="p-4 font-medium">Tienda</th>
                <th className="p-4 font-medium">Diseño</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(orden => {
                const estadoInfo = ESTADOS[orden.estado] || ESTADOS.pendiente;
                return (
                  <tr key={orden.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-violet-400 font-semibold text-xs">{orden.codigo}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-sm">{orden.cliente_nombre}</p>
                      <p className="text-xs text-zinc-500">{orden.cliente_telefono}</p>
                    </td>
                    <td className="p-4 text-zinc-300">{orden.modelo_nombre}</td>
                    <td className="p-4 text-zinc-400 text-xs">{orden.tienda_nombre || '—'}</td>
                    <td className="p-4">
                      <button
                        onClick={() => setPreviewImage(`http://localhost:5000${orden.diseno_url}`)}
                        className="relative group"
                      >
                        <img
                          src={`http://localhost:5000${orden.diseno_url}`}
                          alt="Diseño"
                          className="w-10 h-10 object-cover rounded-lg border border-zinc-700 group-hover:border-violet-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoInfo.color}`}>
                        {estadoInfo.label}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 text-xs">
                      {new Date(orden.created_at).toLocaleDateString('es-HN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`http://localhost:5000${orden.pdf_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors inline-flex"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {estadoInfo.next && (
                          <button
                            onClick={() => handleEstado(orden.id, estadoInfo.next)}
                            className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors text-xs font-semibold inline-flex items-center gap-1"
                            title={`Avanzar a ${ESTADOS[estadoInfo.next]?.label}`}
                          >
                            Avanzar
                            <ChevronDown className="w-3 h-3 -rotate-90" />
                          </button>
                        )}
                        {orden.estado !== 'cancelado' && orden.estado !== 'entregado' && (
                          <button
                            onClick={() => {
                              if (confirm('¿Cancelar esta orden?')) {
                                handleEstado(orden.id, 'cancelado');
                              }
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors inline-flex"
                            title="Cancelar"
                          >
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
                  <td colSpan="8" className="p-8 text-center text-zinc-500">
                    No hay órdenes {filtroEstado !== 'todos' ? `con estado "${ESTADOS[filtroEstado]?.label}"` : 'aún'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Diseño preview"
            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-zinc-700 animate-fade-in-up"
          />
        </div>
      )}
    </div>
  );
}
