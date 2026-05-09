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
    nombre: 'Carlos Mendoza Ruiz',
    edad: 45,
    diagnostico: 'Diabetes mellitus tipo 2, Hipertensión arterial controlada',
    medicamentos: 'Metformina 500mg (2 veces al día), Losartán 50mg (1 vez al día), Atorvastatina 20mg (noche)',
    alergias: 'Penicilina (reacción anafiláctica), Sulfonamidas',
    tipo_sangre: 'A+',
    contacto_emergencia: 'Rosa Mendoza (esposa) — +52 555-012-3456',
  },
  {
    nombre: 'María Elena López Vega',
    edad: 62,
    diagnostico: 'Insuficiencia cardíaca congestiva, Fibrilación auricular',
    medicamentos: 'Furosemida 40mg, Digoxina 0.25mg, Warfarina 5mg, Bisoprolol 5mg',
    alergias: 'Ibuprofeno y AINEs (riesgo de insuficiencia renal), Contraste yodado',
    tipo_sangre: 'O-',
    contacto_emergencia: 'Roberto López (hijo) — +52 555-987-6543',
  },
  {
    nombre: 'Juan Carlos Rodríguez Torres',
    edad: 28,
    diagnostico: 'Asma bronquial severa, Rinitis alérgica estacional',
    medicamentos: 'Salbutamol inhalador (SOS), Fluticasona/Salmeterol inhalador, Montelukast 10mg',
    alergias: 'Polen de gramíneas, Ácaros del polvo, Latex (hipersensibilidad tipo I)',
    tipo_sangre: 'B+',
    contacto_emergencia: 'Laura Rodríguez (madre) — +52 555-234-5678',
  },
  {
    nombre: 'Ana Patricia Martínez Soto',
    edad: 55,
    diagnostico: 'Artritis reumatoide seropositiva, Osteoporosis severa',
    medicamentos: 'Metotrexato 15mg (semanal), Ácido fólico 5mg, Prednisona 5mg, Calcio + Vitamina D3',
    alergias: 'Sulfasalazina (hepatotoxicidad previa), AINEs (úlcera péptica en historial)',
    tipo_sangre: 'AB+',
    contacto_emergencia: 'Miguel Martínez (esposo) — +52 555-345-6789',
  },
  {
    nombre: 'Pedro Antonio García Flores',
    edad: 71,
    diagnostico: 'EPOC estadio III (GOLD), Insuficiencia renal crónica estadio 3',
    medicamentos: 'Tiotropio 18mcg inhalador, Budesonida/Formoterol, Amlodipino 5mg, Eritropoyetina semanal',
    alergias: 'Latex (anafilaxia), Mariscos (urticaria generalizada), Aspirina (broncoespasmo)',
    tipo_sangre: 'O+',
    contacto_emergencia: 'Carmen García (hija) — +52 555-456-7890',
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
        contacto_emergencia VARCHAR(100),
        foto_url            TEXT,
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
          `INSERT INTO patients (uuid, nombre, edad, diagnostico, medicamentos, alergias, tipo_sangre, contacto_emergencia, foto_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [randomUUID(), p.nombre, p.edad, p.diagnostico, p.medicamentos, p.alergias, p.tipo_sangre, p.contacto_emergencia, null]
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
