require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const pool = require('./db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Admin panel SPA (exact GET match — must come before the /admin API router)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

// API routes
app.use('/p', publicRoutes);
app.use('/admin', adminRoutes);

// ── Database initialization ──────────────────────────────────────────────────

const SEED_PATIENTS = [
  {
    nombre: 'Marco Antonio Lazo Bandala',
    edad: 71,
    diagnostico: 'Discapacidad cognitiva: Alzheimer',
    medicamentos: 'Donepezil, Rivastigmine, Sertraline',
    alergias: 'Cacahuates y maní',
    tipo_sangre: null,
    contacto_emergencia:   'Maria Fernanda Cruz Elotlan — 2727238126',
    contacto_emergencia_2: 'Marco Antonio Lazo Mexicano — 2712140653',
  },
  {
    nombre: 'Angelica Rivera Hidalgo',
    edad: 45,
    diagnostico: 'Discapacidad cognitiva: Autismo y depresión',
    medicamentos: 'Risperidone, Aripiprazole, Clonazepam, Clonidine',
    alergias: 'Fresas, mariscos',
    tipo_sangre: null,
    contacto_emergencia:   'Antonia Hidalgo de la Cruz — 9535404649',
    contacto_emergencia_2: 'Idelfonso Martínez Martínez — 9531112671',
  },
  {
    nombre: 'Javier Valdivia Leyva',
    edad: 23,
    diagnostico: 'Discapacidad: ceguera total',
    medicamentos: 'Timolol',
    alergias: null,
    tipo_sangre: null,
    contacto_emergencia:   'Angelica Rivera Hidalgo — 9514205424',
    contacto_emergencia_2: 'Irene Leyva Flores — 2382372001',
  },
  {
    nombre: 'Alfonso Navarro Bolaños',
    edad: 20,
    diagnostico: 'Discapacidad: bipolaridad',
    medicamentos: 'Lithium, Valproate, Lamotrigine',
    alergias: 'Penicilina',
    tipo_sangre: null,
    contacto_emergencia:   'Carol Santos — 2382491234',
    contacto_emergencia_2: 'Lola Martínez — 2381784578',
  },
  {
    nombre: 'Zurisadai Cruz Ramos',
    edad: 95,
    diagnostico: 'Adulto mayor',
    medicamentos: null,
    alergias: 'Polvo, humo, perfumes',
    tipo_sangre: null,
    contacto_emergencia:   'Laura Rosalba Ramos Gálvez — 2381012409',
    contacto_emergencia_2: 'Juan Luis Cruz Chávez — 2381037794',
  },
];

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        uuid                VARCHAR(36) NOT NULL UNIQUE,
        nombre              VARCHAR(100),
        edad                INT,
        diagnostico         TEXT,
        medicamentos        TEXT,
        alergias            TEXT,
        tipo_sangre         VARCHAR(5),
        contacto_emergencia   TEXT,
        contacto_emergencia_2 TEXT,
        foto_url              TEXT,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        username      VARCHAR(50) NOT NULL UNIQUE,
        password_hash TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed admin (username: admin / password: admin123)
    const [[{ count: adminCount }]] = await conn.query('SELECT COUNT(*) as count FROM admins');
    if (adminCount === 0) {
      const hash = await bcrypt.hash('admin123', 12);
      await conn.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
      console.log('Admin creado  →  usuario: admin  |  contraseña: admin123');
    }

    // Seed patients
    const [[{ count: patientCount }]] = await conn.query('SELECT COUNT(*) as count FROM patients');
    if (patientCount === 0) {
      for (const p of SEED_PATIENTS) {
        await conn.query(
          `INSERT INTO patients (uuid, nombre, edad, diagnostico, medicamentos, alergias, tipo_sangre, contacto_emergencia, contacto_emergencia_2, foto_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), p.nombre, p.edad, p.diagnostico, p.medicamentos, p.alergias, p.tipo_sangre, p.contacto_emergencia, p.contacto_emergencia_2 || null, null]
        );
      }
      console.log(`${SEED_PATIENTS.length} pacientes de ejemplo insertados.`);
    }
  } finally {
    conn.release();
  }
}

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PulsTag corriendo en http://localhost:${PORT}`);
      console.log(`  Panel admin → http://localhost:${PORT}/admin`);
    });
  })
  .catch((err) => {
    console.error('Error al inicializar la base de datos:', err.message);
    process.exit(1);
  });
