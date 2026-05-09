import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Loader2, ArrowLeft, Copy, Store, Smartphone, User, Phone, MapPin, Zap } from 'lucide-react';

import { API_URL } from '../config';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const modelo = state?.modelo;
  const diseno_base64 = state?.diseno_base64;

  const [tiendas, setTiendas] = useState([]);
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_direccion: '',
    tienda_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!modelo || !diseno_base64) {
      navigate('/');
      return;
    }
    // Load tiendas
    axios.get(`${API_URL}/tiendas`)
      .then(res => setTiendas(res.data))
      .catch(err => console.error(err));
  }, [modelo, diseno_base64, navigate]);

  if (!modelo || !diseno_base64) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ordenes`, {
        modelo_id: modelo.id,
        diseno_base64,
        ...formData,
        tienda_id: formData.tienda_id ? parseInt(formData.tienda_id) : null
      });
      setOrderResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar tu orden. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (orderResult?.codigo) {
      navigator.clipboard.writeText(orderResult.codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success screen (Aesthetic Digital Receipt)
  if (orderResult) {
    const trackingUrl = `${window.location.origin}/pedido/${orderResult.codigo}`;
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-red/10 rounded-full blur-[100px]" />
        
        <div className="glass p-8 md:p-10 rounded-[2.5rem] max-w-md w-full text-center border border-white/5 relative z-10 shadow-2xl shadow-black animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-5 border border-brand-red/20 animate-pulse-glow">
            <CheckCircle2 className="w-8 h-8 text-brand-red" />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-red bg-brand-red/10 px-3 py-1 rounded-full">
            ORDEN ENVIADA AL TALLER
          </span>

          <h2 className="text-3xl font-bold mt-4 mb-2 text-white uppercase tracking-tight">¡ÉXITO TOTAL!</h2>
          <p className="text-zinc-400 text-xs px-2 mb-8 leading-relaxed">
            Tu diseño personalizado para el <span className="text-white font-semibold">{modelo.nombre}</span> ha ingresado a la cola de producción.
          </p>

          {/* Ticket Information */}
          <div className="bg-brand-dark/60 rounded-2xl p-5 mb-6 border border-white/5 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Código de Pedido</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-brand-red text-glow-red">{orderResult.codigo}</span>
                <button onClick={handleCopyCode} className="p-1.5 rounded-lg bg-brand-medium hover:bg-brand-light text-zinc-400 hover:text-white transition-all cursor-pointer">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {copied && <p className="text-[10px] text-brand-red font-bold text-right mt-1">¡Código copiado al portapapeles!</p>}

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Cliente:</span>
              <span className="font-semibold text-zinc-200">{formData.cliente_nombre}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Recogida:</span>
              <span className="font-semibold text-zinc-200">
                {tiendas.find(t => t.id === parseInt(formData.tienda_id))?.nombre || 'Por confirmar'}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white rounded-[1.8rem] p-5 mb-4 inline-block shadow-lg shadow-black/40">
            <QRCodeSVG value={trackingUrl} size={150} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-8">
            Escanea para consultar estado mediante QR
          </p>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                const msg = `🚀 *NUEVA ORDEN RECIBIDA*%0A%0A*Código:* ${orderResult.codigo}%0A*Modelo:* ${modelo.nombre}%0A*Cliente:* ${formData.cliente_nombre}%0A*Tienda:* ${tiendas.find(t => t.id === parseInt(formData.tienda_id))?.nombre || 'General'}%0A%0A*Ver Diseño:* ${window.location.origin}/pedido/${orderResult.codigo}`;
                window.open(`https://wa.me/50499999999?text=${msg}`, '_blank');
              }}
              className="bg-green-600 hover:bg-green-700 text-white w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
            >
              <Phone className="w-4 h-4" /> Enviar a WhatsApp Taller
            </button>
            <button onClick={() => navigate(`/pedido/${orderResult.codigo}`)}
              className="btn-primary w-full py-3.5 text-xs uppercase tracking-wider">
              Seguimiento Online
            </button>
            <button onClick={() => navigate('/')}
              className="btn-secondary w-full py-3.5 text-xs uppercase tracking-wider">
              Volver al Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] p-6 flex items-center justify-center relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-brand-red/5 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-4xl glass rounded-[2.5rem] overflow-hidden border border-white/5 relative z-10 shadow-2xl shadow-black animate-fade-in-up">
        <div className="grid md:grid-cols-2">
          
          {/* Design Summary (Left Panel) */}
          <div className="p-8 md:p-10 bg-brand-black/30 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
            <div className="mb-6 flex flex-col items-center">
              <span className="text-[10px] bg-brand-red/10 border border-brand-red/15 text-brand-red px-3 py-1 rounded-full font-bold uppercase tracking-widest mb-2 animate-pulse-glow">
                DISEÑO EN ESPERA
              </span>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">{modelo.nombre}</h3>
            </div>

            {/* Simulated Case Preview with Backlight Case Outline */}
            <div className="relative w-48 rounded-[2rem] overflow-hidden shadow-2xl shadow-black border border-white/5">
              <img src={diseno_base64} alt="Diseño final" className="w-full h-auto" />
              <img src={`http://localhost:5000${modelo.molde_url}`} alt="Molde" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-60" />
            </div>

            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors mt-8 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5 text-brand-red" /> Editar Diseño
            </button>
          </div>

          {/* Form Segment (Right Panel) */}
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-white">Finalizar Pedido</h2>
              <p className="text-zinc-500 text-xs mt-1">Completa los datos para enviar a producción express.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  <User className="w-3.5 h-3.5 text-brand-red" /> Nombre Completo
                </label>
                <input required type="text" value={formData.cliente_nombre}
                  onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                  placeholder="Ej: Fabricio Andino" />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-red" /> Teléfono WhatsApp
                </label>
                <input required type="tel" value={formData.cliente_telefono}
                  onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white"
                  placeholder="Ej: +504 9999-9999" />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-red" /> Dirección de Envío
                </label>
                <textarea required value={formData.cliente_direccion}
                  onChange={e => setFormData({ ...formData, cliente_direccion: e.target.value })}
                  className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white h-20 resize-none"
                  placeholder="Dirección exacta para la entrega..." />
              </div>

              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  <Store className="w-3.5 h-3.5 text-brand-red" /> Tienda de Enlace
                </label>
                <div className="relative">
                  <select required value={formData.tienda_id}
                    onChange={e => setFormData({ ...formData, tienda_id: e.target.value })}
                    className="glass-input w-full px-4 py-3 rounded-xl text-xs text-white appearance-none pr-8 cursor-pointer">
                    <option value="" className="bg-[#121212]">Seleccionar sucursal...</option>
                    {tiendas.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#121212]">{t.nombre}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                    <Store className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </div>

              <button disabled={loading} type="submit"
                className="btn-primary w-full py-4 uppercase text-xs tracking-wider font-bold mt-4">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inscribiendo en cola...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Confirmar y Enviar a Taller</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
