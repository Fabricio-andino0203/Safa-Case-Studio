import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Package, Clock, Truck, CheckCircle2, XCircle, ArrowLeft, Smartphone, Calendar, MapPin, Zap, Star } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const ESTADOS = {
  pendiente: { label: 'Recibido', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', step: 0 },
  en_produccion: { label: 'En Producción', icon: Package, color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/20', step: 1 },
  lista_para_recoger: { label: 'Listo en Tienda', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', step: 2 },
  entregado: { label: 'Entregado', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', step: 3 },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', step: -1 },
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
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-zinc-900 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-brand-red rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand-red/5 rounded-full blur-[100px]" />
        
        <div className="glass p-10 rounded-[2rem] max-w-sm text-center border border-white/5 relative z-10 shadow-2xl shadow-black animate-fade-in-up">
          <XCircle className="w-14 h-14 text-brand-red mx-auto mb-5" />
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Pedido no encontrado</h2>
          <p className="text-zinc-500 text-xs mb-6">No encontramos ninguna orden bajo el código <span className="font-mono text-white font-semibold">{codigo}</span>.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-red hover:text-brand-red-hover transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al Inicio
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
    <div className="min-h-screen bg-[#080808] p-6 flex flex-col items-center justify-center relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-red/5 rounded-full blur-[100px]" />

      {/* Brand Back-navigation */}
      <div className="text-center mb-8 relative z-10 animate-fade-in">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5 text-brand-red" /> Safa Case Studio
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">Estado de Producción</h1>
        <p className="text-zinc-500 text-xs mt-1">Seguimiento en tiempo real para el código: <span className="font-mono text-brand-red text-glow-red font-extrabold">{orden.codigo}</span></p>
      </div>

      <div className="w-full max-w-xl glass rounded-[2.5rem] overflow-hidden border border-white/5 relative z-10 shadow-2xl shadow-black animate-fade-in-up">
        
        {/* Status Indicator Bar */}
        <div className={`p-6 flex items-center gap-4 border-b border-white/5 bg-brand-black/40`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${estadoInfo.bg} border ${estadoInfo.border} animate-pulse-glow`}>
            <EstadoIcon className={`w-6 h-6 ${estadoInfo.color}`} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Estado Actual</p>
            <p className={`text-lg font-bold uppercase tracking-tight ${estadoInfo.color}`}>{estadoInfo.label}</p>
          </div>
          <div className="ml-auto bg-brand-medium border border-white/5 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 font-bold uppercase">
            Estación: {orden.estado}
          </div>
        </div>

        {/* Dynamic Process Stepper Timeline (Only if not cancelled) */}
        {!isCancelled && (
          <div className="p-8 border-b border-white/5 bg-brand-dark/20">
            <div className="flex items-center justify-between relative">
              
              {/* Stepper background line */}
              <div className="absolute top-4 left-[10%] right-[10%] h-[3px] bg-brand-medium rounded-full" />
              
              {/* Stepper glowing active line */}
              <div className="absolute top-4 left-[10%] h-[3px] bg-brand-red transition-all duration-1000 rounded-full"
                style={{ width: `${Math.max(0, currentStep) * 26.66}%` }} />

              {TIMELINE_STEPS.map((step, i) => {
                const info = ESTADOS[step];
                const Icon = info.icon;
                const isCompleted = currentStep >= i;
                const isCurrent = currentStep === i;
                return (
                  <div key={step} className="relative flex flex-col items-center z-10">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 border ${
                      isCompleted
                        ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/30 scale-105'
                        : 'bg-brand-medium border-white/5 text-zinc-600'
                    } ${isCurrent ? 'ring-4 ring-brand-red/20' : ''}`}>
                      <Icon className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-zinc-500'}`} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider mt-2.5 text-center max-w-[85px] ${
                      isCurrent 
                        ? 'text-brand-red' 
                        : isCompleted 
                        ? 'text-zinc-300' 
                        : 'text-zinc-600'
                    }`}>
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ticket Details Body */}
        <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Molde de Cobertor</p>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">{orden.modelo_nombre}</p>
              </div>
            </div>

            {orden.tienda_nombre && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Sucursal de Retiro</p>
                  <p className="text-sm font-bold text-zinc-200 mt-0.5">{orden.tienda_nombre}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Ingreso al Taller</p>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">
                  {new Date(orden.created_at).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Design Thumbnail + Interactive QR */}
          <div className="flex flex-col items-center justify-center gap-4 bg-brand-medium/30 p-4 rounded-3xl border border-white/5">
            {/* Interactive Design thumbnail with glow */}
            <div className="relative w-24 rounded-xl overflow-hidden shadow-xl border border-white/5 hover:scale-105 transition-transform duration-300">
              <img src={`http://localhost:5000${orden.diseno_url}`} alt="Tu diseño" className="w-full h-auto" />
            </div>
            
            {/* White card for barcode/QR scanner integration */}
            <div className="bg-white rounded-2xl p-2.5 shadow-lg shadow-black/20">
              <QRCodeSVG value={window.location.href} size={90} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
