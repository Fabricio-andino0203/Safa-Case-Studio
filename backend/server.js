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
app.use('/api/uploads', express.static(uploadsDir));

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ==========================================
// MOLD IMAGE PROCESSING (Flood-Fill Background Detection + Red Outline)
// ==========================================
async function processMoldImage(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;

  // Step 1: Flood-fill from all 4 edges to find the TRUE background
  // This is much more reliable than color thresholds — it finds everything
  // connected to the image border, regardless of color.
  const isBackground = new Uint8Array(total); // 0=mold, 1=background
  const queue = [];

  // Helper to get pixel index
  const idx = (x, y) => y * width + x;

  // Seed the flood fill from all border pixels
  for (let x = 0; x < width; x++) {
    queue.push(idx(x, 0));           // top edge
    queue.push(idx(x, height - 1));  // bottom edge
  }
  for (let y = 0; y < height; y++) {
    queue.push(idx(0, y));           // left edge
    queue.push(idx(width - 1, y));   // right edge
  }

  // Mark border seeds
  for (const p of queue) isBackground[p] = 1;

  // BFS flood fill — spread to neighbors that are NOT white/light
  // The mold body is white (R>200, G>200, B>200), so we stop at white pixels
  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    const px = p % width;
    const py = Math.floor(p / width);

    const neighbors = [
      px > 0 ? p - 1 : -1,
      px < width - 1 ? p + 1 : -1,
      py > 0 ? p - width : -1,
      py < height - 1 ? p + width : -1,
    ];

    for (const n of neighbors) {
      if (n < 0 || isBackground[n]) continue;
      const s = n * 4;
      const r = data[s], g = data[s + 1], b = data[s + 2], a = data[s + 3];

      // If pixel is fully transparent, it's background
      if (a < 30) {
        isBackground[n] = 1;
        queue.push(n);
        continue;
      }

      // If pixel is NOT white/very light, it's background (non-mold)
      // White mold pixels act as walls that stop the flood
      const isWhite = r > 200 && g > 200 && b > 200;
      if (!isWhite) {
        isBackground[n] = 1;
        queue.push(n);
      }
    }
  }

  // Step 2: Create a binary mold map (1=mold body, 0=not mold)
  // Mold body = white pixels that are NOT background
  const isMold = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const s = i * 4;
    const r = data[s], g = data[s + 1], b = data[s + 2], a = data[s + 3];
    const isWhite = r > 180 && g > 180 && b > 180 && a > 30;
    isMold[i] = (isWhite && !isBackground[i]) ? 1 : 0;
  }

  // Step 3: Detect edge pixels of the mold (for red outline)
  // An edge pixel is a mold pixel that has at least one non-mold neighbor
  const OUTLINE_WIDTH = 3; // pixels of red border thickness
  const isEdge = new Uint8Array(total);

  // Use distance-based edge: any mold pixel within OUTLINE_WIDTH of a non-mold pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      if (!isMold[i]) continue;

      let nearEdge = false;
      for (let dy = -OUTLINE_WIDTH; dy <= OUTLINE_WIDTH && !nearEdge; dy++) {
        for (let dx = -OUTLINE_WIDTH; dx <= OUTLINE_WIDTH && !nearEdge; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) { nearEdge = true; continue; }
          if (!isMold[idx(nx, ny)]) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= OUTLINE_WIDTH) nearEdge = true;
          }
        }
      }
      if (nearEdge) isEdge[i] = 1;
    }
  }

  // Step 4: Generate output buffers
  const maskBuf = Buffer.alloc(total * 4);
  const prevBuf = Buffer.alloc(total * 4);

  for (let i = 0; i < total; i++) {
    const d = i * 4;

    if (isEdge[i]) {
      // RED OUTLINE — baked into the mask
      maskBuf[d] = 225; maskBuf[d + 1] = 29; maskBuf[d + 2] = 46; maskBuf[d + 3] = 255;
      // Also show in preview
      prevBuf[d] = 225; prevBuf[d + 1] = 29; prevBuf[d + 2] = 46; prevBuf[d + 3] = 255;
    } else if (isMold[i]) {
      // MOLD BODY → transparent in mask (design shows through)
      maskBuf[d] = 0; maskBuf[d + 1] = 0; maskBuf[d + 2] = 0; maskBuf[d + 3] = 0;
      // PREVIEW: white semi-transparent silhouette for catalog
      prevBuf[d] = 255; prevBuf[d + 1] = 255; prevBuf[d + 2] = 255; prevBuf[d + 3] = 200;
    } else {
      // BACKGROUND → opaque dark in mask (hides design outside mold)
      maskBuf[d] = 9; maskBuf[d + 1] = 9; maskBuf[d + 2] = 11; maskBuf[d + 3] = 255;
      // PREVIEW: transparent
      prevBuf[d] = 0; prevBuf[d + 1] = 0; prevBuf[d + 2] = 0; prevBuf[d + 3] = 0;
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

    if (!moldeFile) return res.status(400).json({ error: 'Sube la plantilla PNG del molde' });

    const molde_url = `/uploads/${moldeFile.filename}`;
    const inputPath = path.join(uploadsDir, moldeFile.filename);

    // Process background removal for white mold
    const { maskUrl, previewUrl } = await processMoldImage(inputPath);

    let imagen_real_url = req_imagen_real_url || '';
    if (realImgFile) {
      imagen_real_url = `/uploads/${realImgFile.filename}`;
    }

    const svgFile = req.files['svg_molde']?.[0];
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
      parseFloat(ancho_impresion), 
      parseFloat(alto_impresion), 
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

    // 3. DESIGN IMAGE (ROTATED 90°)
    const imageBytes = fs.readFileSync(path.join(uploadsDir, imgFile));
    const rotatedBytes = await sharp(imageBytes).rotate(90).png().toBuffer();
    const pngImage = await pdfDoc.embedPng(rotatedBytes);

    // print dimensions in points
    const printWidth = modelo.alto_impresion * cmToPts;
    const printHeight = modelo.ancho_impresion * cmToPts;

    // Place below header
    const x = (595 - printWidth) / 2;
    const y = 730 - printHeight; // Starting immediately after header + QR

    page.drawImage(pngImage, { x, y, width: printWidth, height: printHeight });

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
