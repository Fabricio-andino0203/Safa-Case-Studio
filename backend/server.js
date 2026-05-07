const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const uploadsDir = path.join(mountPath, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ==========================================
// MOLD IMAGE PROCESSING (Green Screen → Mask)
// ==========================================
async function processMoldImage(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const maskBuf = Buffer.alloc(width * height * 4);
  const prevBuf = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const s = i * 4; // source offset (ensureAlpha = 4 channels)
    const d = i * 4; // dest offset
    const r = data[s], g = data[s + 1], b = data[s + 2], a = data[s + 3];

    // Detect green background pixels
    const isGreen = g > 80 && g > r * 1.2 && g > b * 1.2 && a > 128;

    if (isGreen) {
      // MASK: green area → dark opaque (hides design behind)
      maskBuf[d] = 9; maskBuf[d + 1] = 9; maskBuf[d + 2] = 11; maskBuf[d + 3] = 255;
      // PREVIEW: green area → transparent
      prevBuf[d] = 0; prevBuf[d + 1] = 0; prevBuf[d + 2] = 0; prevBuf[d + 3] = 0;
    } else {
      // MASK: case area → transparent (shows design through)
      maskBuf[d] = 0; maskBuf[d + 1] = 0; maskBuf[d + 2] = 0; maskBuf[d + 3] = 0;
      // PREVIEW: case area → white semi-transparent (for catalog display)
      prevBuf[d] = 255; prevBuf[d + 1] = 255; prevBuf[d + 2] = 255; prevBuf[d + 3] = 220;
    }
  }

  const ts = Date.now();
  const maskFile = `mask_${ts}.png`;
  const prevFile = `preview_${ts}.png`;

  await sharp(maskBuf, { raw: { width, height, channels: 4 } }).png().toFile(path.join(uploadsDir, maskFile));
  await sharp(prevBuf, { raw: { width, height, channels: 4 } }).png().toFile(path.join(uploadsDir, prevFile));

  return { maskUrl: `/uploads/${maskFile}`, previewUrl: `/uploads/${prevFile}` };
}

// ==========================================
// ROUTES: Tiendas
// ==========================================
app.get('/api/tiendas', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM tiendas ORDER BY id ASC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROUTES: Modelos
// ==========================================
app.get('/api/modelos', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM modelos ORDER BY marca ASC, nombre ASC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/modelos', upload.single('molde'), async (req, res) => {
  try {
    const { nombre, marca, ancho_impresion, alto_impresion, stock } = req.body;
    const molde_url = `/uploads/${req.file.filename}`;
    const inputPath = path.join(uploadsDir, req.file.filename);

    // Process: remove green bg → create mask + preview
    const { maskUrl, previewUrl } = await processMoldImage(inputPath);

    const result = db.prepare(
      'INSERT INTO modelos (nombre, marca, molde_url, molde_mask_url, molde_preview_url, ancho_impresion, alto_impresion, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(nombre, marca || '', molde_url, maskUrl, previewUrl, parseFloat(ancho_impresion), parseFloat(alto_impresion), parseInt(stock) || 0);

    const modelo = db.prepare('SELECT * FROM modelos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(modelo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/modelos/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    db.prepare('UPDATE modelos SET stock = ? WHERE id = ?').run(parseInt(stock), id);
    res.json(db.prepare('SELECT * FROM modelos WHERE id = ?').get(id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/modelos/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const m = db.prepare('SELECT * FROM modelos WHERE id = ?').get(id);
    if (!m) return res.status(404).json({ error: 'Modelo no encontrado' });
    db.prepare('UPDATE modelos SET activo = ? WHERE id = ?').run(m.activo ? 0 : 1, id);
    res.json(db.prepare('SELECT * FROM modelos WHERE id = ?').get(id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/modelos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const c = db.prepare('SELECT COUNT(*) as c FROM ordenes WHERE modelo_id = ?').get(id);
    if (c.c > 0) return res.status(400).json({ error: 'Modelo tiene órdenes. Desactívalo en su lugar.' });
    db.prepare('DELETE FROM modelos WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROUTES: Ordenes
// ==========================================
app.get('/api/ordenes', (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT o.*, m.nombre as modelo_nombre, t.nombre as tienda_nombre
      FROM ordenes o JOIN modelos m ON o.modelo_id = m.id
      LEFT JOIN tiendas t ON o.tienda_id = t.id
      ORDER BY o.created_at DESC
    `).all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/ordenes/:id/estado', (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const valid = ['pendiente', 'en_produccion', 'lista_para_recoger', 'entregado', 'cancelado'];
    if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    db.prepare('UPDATE ordenes SET estado = ? WHERE id = ?').run(estado, id);
    res.json(db.prepare(`
      SELECT o.*, m.nombre as modelo_nombre, t.nombre as tienda_nombre
      FROM ordenes o JOIN modelos m ON o.modelo_id = m.id
      LEFT JOIN tiendas t ON o.tienda_id = t.id WHERE o.id = ?
    `).get(id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pedido/:codigo', (req, res) => {
  try {
    const orden = db.prepare(`
      SELECT o.codigo, o.estado, o.diseno_url, o.qr_url, o.created_at,
             m.nombre as modelo_nombre, t.nombre as tienda_nombre
      FROM ordenes o JOIN modelos m ON o.modelo_id = m.id
      LEFT JOIN tiendas t ON o.tienda_id = t.id WHERE o.codigo = ?
    `).get(req.params.codigo);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(orden);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper to write base64 to file
const saveBase64Image = (base64String, filename) => {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) throw new Error('Invalid base64');
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(matches[2], 'base64'));
  return `/uploads/${filename}`;
};

// Generate sequential code
const generateCodigo = () => {
  const last = db.prepare('SELECT codigo FROM ordenes ORDER BY id DESC LIMIT 1').get();
  let n = 1;
  if (last) { const m = last.codigo.match(/SAFA-(\d+)/); if (m) n = parseInt(m[1]) + 1; }
  return `SAFA-${String(n).padStart(6, '0')}`;
};

app.post('/api/ordenes', async (req, res) => {
  try {
    const { modelo_id, cliente_nombre, cliente_telefono, cliente_direccion, tienda_id, diseno_base64 } = req.body;

    // Save design image
    const imgFile = `design_${Date.now()}.png`;
    const diseno_url = saveBase64Image(diseno_base64, imgFile);

    const modelo = db.prepare('SELECT * FROM modelos WHERE id = ?').get(modelo_id);
    if (!modelo) return res.status(404).json({ error: 'Modelo no encontrado' });

    const codigo = generateCodigo();

    // Generate QR
    const qrFile = `qr_${codigo}.png`;
    await QRCode.toFile(path.join(uploadsDir, qrFile), `${BASE_URL}/pedido/${codigo}`, { width: 300, margin: 2 });
    const qr_url = `/uploads/${qrFile}`;

    // ==========================================
    // GENERATE PDF — Design horizontal at top of A4
    // ==========================================
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 portrait

    // Load design image
    const imageBytes = fs.readFileSync(path.join(uploadsDir, imgFile));

    // Rotate the design 90° (portrait → landscape) using sharp
    const rotatedBytes = await sharp(imageBytes).rotate(90).png().toBuffer();
    const pngImage = await pdfDoc.embedPng(rotatedBytes);

    // Calculate print dimensions in points (1 cm = 28.346 pts)
    const cmToPts = 28.346;
    // After 90° rotation: width=alto, height=ancho
    const printWidth = modelo.alto_impresion * cmToPts;
    const printHeight = modelo.ancho_impresion * cmToPts;

    // Place at top center of A4
    const x = (595 - printWidth) / 2;
    const y = 842 - printHeight - 40; // 40pts margin from top

    page.drawImage(pngImage, { x, y, width: printWidth, height: printHeight });

    // Add text info below the design
    const textY = y - 25;
    page.drawText(`${codigo}  |  ${modelo.nombre}  |  ${cliente_nombre}  |  Tel: ${cliente_telefono}`, {
      x: 50, y: textY, size: 9, color: rgb(0.3, 0.3, 0.3)
    });

    // QR in bottom right
    const qrBytes = fs.readFileSync(path.join(uploadsDir, qrFile));
    const qrImg = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImg, { x: 495, y: 20, width: 70, height: 70 });

    const pdfFile = `print_${Date.now()}.pdf`;
    fs.writeFileSync(path.join(uploadsDir, pdfFile), await pdfDoc.save());
    const pdf_url = `/uploads/${pdfFile}`;

    // Save order
    const result = db.prepare(
      `INSERT INTO ordenes (codigo, modelo_id, cliente_nombre, cliente_telefono, cliente_direccion, tienda_id, diseno_url, pdf_url, qr_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(codigo, modelo_id, cliente_nombre, cliente_telefono, cliente_direccion, tienda_id || null, diseno_url, pdf_url, qr_url);

    db.prepare('UPDATE modelos SET stock = stock - 1 WHERE id = ?').run(modelo_id);

    res.status(201).json(db.prepare('SELECT * FROM ordenes WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ROUTES: Fondos (Pre-loaded designs/backgrounds)
// ==========================================
app.get('/api/fondos', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM fondos ORDER BY categoria ASC, nombre ASC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Client-facing: only active fondos
app.get('/api/fondos/activos', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM fondos WHERE activo = 1 ORDER BY categoria ASC, nombre ASC').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/fondos', upload.single('imagen'), (req, res) => {
  try {
    const { nombre, categoria } = req.body;
    const imagen_url = `/uploads/${req.file.filename}`;
    const result = db.prepare(
      'INSERT INTO fondos (nombre, categoria, imagen_url) VALUES (?, ?, ?)'
    ).run(nombre, categoria || 'fondo', imagen_url);
    res.status(201).json(db.prepare('SELECT * FROM fondos WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/fondos/:id/toggle', (req, res) => {
  try {
    const f = db.prepare('SELECT * FROM fondos WHERE id = ?').get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Fondo no encontrado' });
    db.prepare('UPDATE fondos SET activo = ? WHERE id = ?').run(f.activo ? 0 : 1, req.params.id);
    res.json(db.prepare('SELECT * FROM fondos WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/fondos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM fondos WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// SERVE FRONTEND IN PRODUCTION
// ==========================================
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
