import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Package, Clock, Truck, CheckCircle2, XCircle, ArrowLeft, Smartphone } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const ESTADOS = {
  pendiente: { label: 'Pendiente', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', step: 0 },
  en_produccion: { label: 'En Producción', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', step: 1 },
  lista_para_recoger: { label: 'Lista para Recoger', icon: Truck, color: 'text-violet-400', bg: 'bg-violet-400/10', step: 2 },
  entregado: { label: 'Entregado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', step: 3 },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', step: -1 },
};

const TIMELINE_STEPS = ['pendiente', 'en_produccion', 'lista_para_recoger', 'entregado'];

export default function TrackOrder() {
  const { codigo } = useParams();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/pedido/${codigo}`)
      .then(res => {
        setOrden(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Orden no encontrada');
        setLoading(false);
      });
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-12 rounded-3xl max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Orden No Encontrada</h2>
          <p className="text-zinc-400 mb-6">No pudimos encontrar una orden con el código <span className="font-mono text-white">{codigo}</span>.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const estadoInfo = ESTADOS[orden.estado] || ESTADOS.pendiente;
  const EstadoIcon = estadoInfo.icon;
  const currentStep = estadoInfo.step;
  const isCancelled = orden.estado === 'cancelado';

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Safa Case Studio
          </Link>
          <h1 className="text-3xl font-bold mb-2">Seguimiento de Pedido</h1>
          <p className="text-zinc-400">Código: <span className="font-mono text-violet-400 font-bold">{orden.codigo}</span></p>
        </div>

        <div className="glass rounded-3xl overflow-hidden border border-zinc-800 animate-fade-in-up">
          {/* Status Banner */}
          <div className={`p-6 flex items-center gap-4 border-b border-zinc-800 ${estadoInfo.bg}`}>
            <div className={`w-14 h-14 rounded-2xl ${estadoInfo.bg} flex items-center justify-center`}>
              <EstadoIcon className={`w-7 h-7 ${estadoInfo.color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Estado actual</p>
              <p className={`text-xl font-bold ${estadoInfo.color}`}>{estadoInfo.label}</p>
            </div>
          </div>

          {/* Timeline (only if not cancelled) */}
          {!isCancelled && (
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between relative">
                {/* Line behind */}
                <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-zinc-800" />
                <div
                  className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                  style={{ width: `${Math.max(0, currentStep) * 26.66}%` }}
                />

                {TIMELINE_STEPS.map((step, i) => {
                  const info = ESTADOS[step];
                  const Icon = info.icon;
                  const isCompleted = currentStep >= i;
                  const isCurrent = currentStep === i;
                  return (
                    <div key={step} className="relative flex flex-col items-center z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30'
                          : 'bg-zinc-800 border border-zinc-700'
                      } ${isCurrent ? 'ring-4 ring-violet-500/20' : ''}`}>
                        <Icon className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-zinc-500'}`} />
                      </div>
                      <span className={`text-xs mt-2 text-center max-w-[80px] ${isCompleted ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {info.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Modelo</p>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium">{orden.modelo_nombre}</span>
                </div>
              </div>
              {orden.tienda_nombre && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tienda de Recogida</p>
                  <span className="font-medium">{orden.tienda_nombre}</span>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fecha de Orden</p>
                <span className="text-zinc-300">{new Date(orden.created_at).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Design Preview + QR */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 rounded-xl overflow-hidden shadow-xl border border-zinc-800">
                <img src={`http://localhost:5000${orden.diseno_url}`} alt="Tu diseño" className="w-full h-auto" />
              </div>
              <div className="bg-white rounded-xl p-3">
                <QRCodeSVG
                  value={window.location.href}
                  size={100}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
