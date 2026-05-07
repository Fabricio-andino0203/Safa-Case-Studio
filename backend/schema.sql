CREATE TABLE IF NOT EXISTS tiendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS modelos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    marca TEXT NOT NULL DEFAULT '',
    molde_url TEXT NOT NULL,
    molde_mask_url TEXT DEFAULT '',
    molde_preview_url TEXT DEFAULT '',
    ancho_impresion REAL NOT NULL,
    alto_impresion REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    modelo_id INTEGER REFERENCES modelos(id),
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_direccion TEXT NOT NULL,
    tienda_id INTEGER REFERENCES tiendas(id),
    diseno_url TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    qr_url TEXT DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS fondos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'fondo',
    imagen_url TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
