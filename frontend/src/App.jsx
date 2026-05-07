import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Checkout from './pages/Checkout';
import TrackOrder from './pages/TrackOrder';
import AdminLayout from './pages/admin/AdminLayout';
import Modelos from './pages/admin/Modelos';
import Inventario from './pages/admin/Inventario';
import Ordenes from './pages/admin/Ordenes';
import Fondos from './pages/admin/Fondos';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Routes>
          {/* Client Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/editor/:modeloId" element={<Editor />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:codigo" element={<TrackOrder />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Ordenes />} />
            <Route path="modelos" element={<Modelos />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="fondos" element={<Fondos />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
