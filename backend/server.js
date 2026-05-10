const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
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
app.use('/api/uploads', express.static(uploadsDir));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ==========================================
// MOLD IMAGE PROCESSING (Auto-Align, Straighten & Clean Background)
// ==========================================
async function processMoldImage(inputPath) {
  console.log(`[PROCESS] Iniciando procesamiento de: ${path.basename(inputPath)}`);
  
  let { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let width = info.width, height = info.height;
  
  const getMoldPixels = (buf, w, h, threshold = 160) => {
    const total = w * h;
    const isBg = new Uint8Array(total);
    const q = [];
    const idx = (x, y) => y * w + x;
    for (let x = 0; x < w; x++) { q.push(idx(x, 0)); q.push(idx(x, h - 1)); }
    for (let y = 0; y < h; y++) { q.push(idx(0, y)); q.push(idx(w - 1, y)); }
    for (const p of q) isBg[p] = 1;
    let head = 0;
    while (head < q.length) {
      const p = q[head++];
      const px = p % w, py = Math.floor(p / w);
      const neighbors = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
      for (const n of neighbors) {
        if (n < 0 || isBg[n]) continue;
        const s = n * 4;
        if (buf[s+3] < 30 || !(buf[s] > threshold && buf[s+1] > threshold && buf[s+2] > threshold)) {
          isBg[n] = 1; q.push(n);
        }
      }
    }
    const mold = [];
    for (let i = 0; i < total; i++) {
      const s = i * 4;
      if (buf[s] > threshold && buf[s+1] > threshold && buf[s+2] > threshold && buf[s+3] > 30 && !isBg[i]) {
        mold.push({ x: i % w, y: Math.floor(i / w) });
      }
    }
    return mold;
  };

  let moldPixels = getMoldPixels(data, width, height, 160);
  if (moldPixels.length < 100) return { error: 'No se detectó el cobertor blanco' };

  // BRUTE FORCE STRAIGHTENING (Find angle that minimizes bounding box width)
  let bestAngle = 0;
  let minBBoxWidth = Infinity;

  // Calculate moments first for a good starting point
  let m10 = 0, m01 = 0, m00 = moldPixels.length;
  for (const p of moldPixels) { m10 += p.x; m01 += p.y; }
  const cx = m10 / m00, cy = m01 / m00;
  let mu20 = 0, mu02 = 0, mu11 = 0;
  for (const p of moldPixels) {
    const dx = p.x - cx, dy = p.y - cy;
    mu20 += dx * dx; mu02 += dy * dy; mu11 += dx * dy;
  }
  let initialAngleDeg = 0.5 * Math.atan2(2 * mu11, mu20 - mu02) * (180 / Math.PI);
  let initialRotation = 90 + initialAngleDeg;
  if (initialRotation > 90) initialRotation -= 180;
  if (initialRotation < -90) initialRotation += 180;

  // Fine-tune by searching +/- 10 degrees around initial guess
  for (let r = initialRotation - 10; r <= initialRotation + 10; r += 0.2) {
    const rad = -r * (Math.PI / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    let minX = Infinity, maxX = -Infinity;
    for (const p of moldPixels) {
      const rx = (p.x - cx) * cos - (p.y - cy) * sin;
      if (rx < minX) minX = rx; if (rx > maxX) maxX = rx;
    }
    const w = maxX - minX;
    if (w < minBBoxWidth) { minBBoxWidth = w; bestAngle = r; }
  }

  const rotationNeeded = bestAngle;
  console.log(`[PASS 1] Inclinación detectada. Aplicando rotación final de: ${(-rotationNeeded).toFixed(2)}°`);

  const rotatedBuffer = await sharp(inputPath)
    .rotate(-rotationNeeded, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  let rotated = await sharp(rotatedBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let rW = rotated.info.width, rH = rotated.info.height;
  let rPixels = getMoldPixels(rotated.data, rW, rH, 160);

  let minX = rW, maxX = 0, minY = rH, maxY = 0;
  for (const p of rPixels) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }

  // MINIMAL PADDING for physical scaling accuracy (PDF uses these dimensions)
  const PADDING = 2; 
  const cropL = Math.max(0, minX - PADDING);
  const cropT = Math.max(0, minY - PADDING);
  const cropW = Math.min(rW - cropL, (maxX - minX) + PADDING * 2);
  const cropH = Math.min(rH - cropT, (maxY - minY) + PADDING * 2);

  // Final Background Removal with noise cleanup
  const finalImage = await sharp(rotatedBuffer)
    .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
    .median(3) // Remove salt-and-pepper noise (spots)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const fW = finalImage.info.width, fH = finalImage.info.height;
  const fTotal = fW * fH;
  const fIdx = (x, y) => y * fW + x;

  const fIsBg = new Uint8Array(fTotal);
  const fQ = [];
  for (let x = 0; x < fW; x++) { fQ.push(fIdx(x, 0)); fQ.push(fIdx(x, fH - 1)); }
  for (let y = 0; y < fH; y++) { fQ.push(fIdx(0, y)); fQ.push(fIdx(fW - 1, y)); }
  for (const p of fQ) fIsBg[p] = 1;
  let head = 0;
  while (head < fQ.length) {
    const p = fQ[head++];
    const px = p % fW, py = Math.floor(p / fW);
    const neighbors = [px > 0 ? p - 1 : -1, px < fW - 1 ? p + 1 : -1, py > 0 ? p - fW : -1, py < fH - 1 ? p + fW : -1];
    for (const n of neighbors) {
      if (n < 0 || fIsBg[n]) continue;
      const s = n * 4;
      // Stricter background detection: anything NOT very white or NOT opaque is background
      if (finalImage.data[s+3] < 50 || !(finalImage.data[s] > 180 && finalImage.data[s+1] > 180 && finalImage.data[s+2] > 180)) {
        fIsBg[n] = 1; fQ.push(n);
      }
    }
  }

  // --- PASS 4: Vector-like Smoothing ---
  // 1. Create a raw 1-channel mask of the mold
  const moldMaskRaw = Buffer.alloc(fTotal);
  for (let i = 0; i < fTotal; i++) {
    const d = i * 4;
    if ((finalImage.data[d] > 160 && finalImage.data[d+3] > 50) && !fIsBg[i]) {
      moldMaskRaw[i] = 255;
    }
  }

  // 2. Smooth the mask using blur + threshold
  const smoothedMaskBuf = await sharp(moldMaskRaw, { raw: { width: fW, height: fH, channels: 1 } })
    .blur(2.5) // This smooths the jagged edges
    .threshold(140) // This brings back the sharp but smooth edge
    .raw()
    .toBuffer();

  // 3. Create Final Output Buffers based on smoothed mask
  const maskBuf = Buffer.alloc(fTotal * 4);
  const prevBuf = Buffer.alloc(fTotal * 4);
  const OUTLINE = 4;

  for (let i = 0; i < fTotal; i++) {
    const d = i * 4;
    const isMold = smoothedMaskBuf[i] > 128;

    if (isMold) {
      let nearEdge = false;
      const x = i % fW, y = Math.floor(i / fW);
      for (let dy = -OUTLINE; dy <= OUTLINE && !nearEdge; dy++) {
        for (let dx = -OUTLINE; dx <= OUTLINE && !nearEdge; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= fW || ny < 0 || ny >= fH || smoothedMaskBuf[fIdx(nx, ny)] < 128) {
            if (Math.sqrt(dx*dx + dy*dy) <= OUTLINE) nearEdge = true;
          }
        }
      }
      if (nearEdge) {
        // Smooth Red Outline
        maskBuf[d] = 225; maskBuf[d+1] = 29; maskBuf[d+2] = 46; maskBuf[d+3] = 255;
        prevBuf[d] = 225; prevBuf[d+1] = 29; prevBuf[d+2] = 46; prevBuf[d+3] = 255;
      } else {
        maskBuf[d] = 0; maskBuf[d+1] = 0; maskBuf[d+2] = 0; maskBuf[d+3] = 0;
        prevBuf[d] = 255; prevBuf[d+1] = 255; prevBuf[d+2] = 255; prevBuf[d+3] = 255;
      }
    } else {
      maskBuf[d] = 255; maskBuf[d+1] = 255; maskBuf[d+2] = 255; maskBuf[d+3] = 255;
      prevBuf[d] = 255; prevBuf[d+1] = 255; prevBuf[d+2] = 255; prevBuf[d+3] = 255;
    }
  }

  const ts = Date.now();
  const maskFile = `mask_${ts}.png`;
  const prevFile = `preview_${ts}.png`;

  await sharp(maskBuf, { raw: { width: fW, height: fH, channels: 4 } }).png().toFile(path.join(uploadsDir, maskFile));
  await sharp(prevBuf, { raw: { width: fW, height: fH, channels: 4 } }).png().toFile(path.join(uploadsDir, prevFile));

  console.log(`[DONE] Procesamiento finalizado: ${maskFile}, ${prevFile}`);
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

app.get('/api/modelos/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM modelos WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Modelo no encontrado' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const uploadFields = upload.fields([
  { name: 'molde', maxCount: 1 },
  { name: 'imagen_real', maxCount: 1 },
  { name: 'svg_molde', maxCount: 1 }
]);

app.post('/api/modelos', uploadFields, async (req, res) => {
  try {
    const { nombre, marca, ancho_impresion, alto_impresion, stock, imagen_real_url: req_imagen_real_url } = req.body;
    
    const moldeFile = req.files['molde']?.[0];
    const realImgFile = req.files['imagen_real']?.[0];
    const svgFile = req.files['svg_molde']?.[0];

    if (!moldeFile && !svgFile) return res.status(400).json({ error: 'Sube al menos un molde (PNG o SVG)' });

    let molde_url = '';
    let maskUrl = '';
    let previewUrl = '';

    if (moldeFile) {
      molde_url = `/uploads/${moldeFile.filename}`;
      const inputPath = path.join(uploadsDir, moldeFile.filename);
      // Process background removal for white mold
      const processed = await processMoldImage(inputPath);
      maskUrl = processed.maskUrl;
      previewUrl = processed.previewUrl;
    }

    let imagen_real_url = req_imagen_real_url || '';
    if (realImgFile) {
      imagen_real_url = `/uploads/${realImgFile.filename}`;
    }

    const molde_svg_path = svgFile ? `/uploads/${svgFile.filename}` : '';

    const result = db.prepare(
      `INSERT INTO modelos (nombre, marca, molde_url, molde_mask_url, molde_preview_url, imagen_real_url, ancho_impresion, alto_impresion, stock, molde_svg_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      nombre, 
      marca || '', 
      molde_url, 
      maskUrl, 
      previewUrl, 
      imagen_real_url, 
      parseFloat(ancho_impresion) || 0, 
      parseFloat(alto_impresion) || 0, 
      parseInt(stock) || 0,
      molde_svg_path
    );

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
// ROUTES: Maintenance Reset Database
// ==========================================
app.post('/api/admin/reset-db', (req, res) => {
  try {
    // 1. Fetch and delete order files
    const orders = db.prepare('SELECT diseno_url, pdf_url, qr_url FROM ordenes').all();
    for (const ord of orders) {
      try {
        if (ord.diseno_url) {
          const p = path.join(uploadsDir, path.basename(ord.diseno_url));
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        if (ord.pdf_url) {
          const p = path.join(uploadsDir, path.basename(ord.pdf_url));
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        if (ord.qr_url) {
          const p = path.join(uploadsDir, path.basename(ord.qr_url));
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      } catch (err) {
        console.warn('Could not delete test file:', err.message);
      }
    }

    // 2. Wipe orders
    db.prepare('DELETE FROM ordenes').run();

    // 3. Reset model stock to 100 for continuous testing
    db.prepare('UPDATE modelos SET stock = 100').run();

    res.json({ success: true, message: 'Database reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    // GENERATE PDF — Optimized Compact Layout
    // ==========================================
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 portrait
    const cmToPts = 28.346;

    // 1. HEADER INFO (TOP LEFT)
    page.drawText('SAFA CASE STUDIO - ORDEN DE PRODUCCIÓN', { x: 40, y: 810, size: 10, color: rgb(0, 0, 0) });
    page.drawText(`CÓDIGO: ${codigo}`, { x: 40, y: 795, size: 12, color: rgb(0.88, 0.11, 0.18) });
    page.drawText(`MODELO: ${modelo.nombre}`, { x: 40, y: 780, size: 10, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`CLIENTE: ${cliente_nombre} | TEL: ${cliente_telefono}`, { x: 40, y: 765, size: 8, color: rgb(0.4, 0.4, 0.4) });

    // 2. QR CODE (TOP RIGHT - NEXT TO TEXT)
    const qrBytes = fs.readFileSync(path.join(uploadsDir, qrFile));
    const qrImg = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImg, { x: 480, y: 750, width: 75, height: 75 });
    page.drawText('ESCANEAR PARA ESTADO', { x: 478, y: 742, size: 6, color: rgb(0.5, 0.5, 0.5) });

    // 3. DESIGN IMAGE (PROPORTIONAL RENDER)
    const imageBytes = fs.readFileSync(path.join(uploadsDir, imgFile));
    const pngImage = await pdfDoc.embedPng(imageBytes);

    // Target dimensions in points (physical specs)
    const targetWidth = modelo.ancho_impresion * cmToPts;
    const targetHeight = modelo.alto_impresion * cmToPts;

    // Force EXACT physical dimensions as specified by the model (7.5 x 14.5 cm, etc.)
    // We trust the frontend canvas proportions to avoid distortion.
    let drawWidth = targetWidth;
    let drawHeight = targetHeight;

    // Center the design horizontally (visual width is drawHeight) and place below header (visual top is y)
    const x = (595 - drawHeight) / 2;
    const y = 730;

    // Draw with 100% proportional accuracy, rotated 90 degrees clockwise
    page.drawImage(pngImage, { 
      x, 
      y, 
      width: drawWidth, 
      height: drawHeight,
      rotate: degrees(-90)
    });

    // Dotted line for separation
    page.drawLine({
      start: { x: 40, y: 740 },
      end: { x: 555, y: 740 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
      dashArray: [2, 2]
    });

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
  app.get('/*any', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}


// ============================================================
// ADMIN / MAINTENANCE
// ============================================================
app.post('/api/admin/reset-db', async (req, res) => {
  try {
    // 1. Delete all orders
    db.prepare('DELETE FROM ordenes').run();
    
    // 2. Reset stock for all models
    db.prepare('UPDATE modelos SET stock = 100').run();

    // 3. Delete generated files (designs, PDFs, QRs)
    // We only keep the original "molde" and "preview" files if possible, 
    // or just clear the uploads folder if we assume a full clean.
    // For safety, let's just clear the database tables related to transactions.
    
    res.json({ message: 'Sistema reiniciado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
