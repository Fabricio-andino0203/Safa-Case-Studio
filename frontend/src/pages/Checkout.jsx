import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Loader2, ArrowLeft, Download, Copy, Store } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

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

  // Success screen with QR
  if (orderResult) {
    const trackingUrl = `${window.location.origin}/pedido/${orderResult.codigo}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-10 rounded-3xl max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>

          <h2 className="text-3xl font-bold mb-2">¡Orden Recibida!</h2>
          <p className="text-zinc-400 mb-8">
            Tu diseño para el <span className="text-white font-medium">{modelo.nombre}</span> ha sido enviado a producción.
          </p>

          {/* Order Code */}
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Tu código de seguimiento</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-bold text-violet-400">{orderResult.codigo}</span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                title="Copiar código"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-400 mt-2">¡Copiado!</p>}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-6 mb-6 inline-block">
            <QRCodeSVG
              value={trackingUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
          <p className="text-xs text-zinc-500 mb-6">Escanea el QR para consultar el estado de tu pedido</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/pedido/${orderResult.codigo}`)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Ver Estado del Pedido
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl glass rounded-3xl overflow-hidden border border-zinc-800 animate-fade-in-up">
        <div className="grid md:grid-cols-2">
          {/* Preview Side */}
          <div className="p-8 bg-zinc-900/50 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800">
            <h3 className="text-lg font-bold mb-6 text-zinc-300">Tu Diseño — {modelo.nombre}</h3>
            <div className="relative w-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <img src={diseno_base64} alt="Diseño final" className="w-full h-auto" />
              <img
                src={`http://localhost:5000${modelo.molde_url}`}
                alt="Molde"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-70"
              />
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mt-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Editar diseño
            </button>
          </div>

          {/* Form Side */}
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-1">Finalizar Pedido</h2>
            <p className="text-zinc-400 text-sm mb-6">Ingresa tus datos para confirmar la orden.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={formData.cliente_nombre}
                  onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono</label>
                <input
                  required
                  type="tel"
                  value={formData.cliente_telefono}
                  onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="+504 9999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Dirección de Entrega</label>
                <textarea
                  required
                  value={formData.cliente_direccion}
                  onChange={e => setFormData({ ...formData, cliente_direccion: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors h-24 resize-none"
                  placeholder="Calle 123, Ciudad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  <Store className="w-4 h-4 inline mr-1" />
                  Tienda de Recogida
                </label>
                <select
                  required
                  value={formData.tienda_id}
                  onChange={e => setFormData({ ...formData, tienda_id: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none"
                >
                  <option value="">Seleccionar tienda...</option>
                  {tiendas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-white text-black py-4 rounded-xl font-bold hover:bg-zinc-100 transition-all mt-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>Confirmar Orden</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
