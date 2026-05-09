const express = require('express');
const router = express.Router();
const pool = require('../db');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  if (!UUID_REGEX.test(uuid)) {
    return res.status(404).send(renderNotFound());
  }
  try {
    const [rows] = await pool.query('SELECT * FROM patients WHERE uuid = ?', [uuid]);
    if (rows.length === 0) {
      return res.status(404).send(renderNotFound());
    }
    res.send(renderPatient(rows[0]));
  } catch (err) {
    console.error('Public view error:', err);
    res.status(500).send(renderError());
  }
});

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bloodTypeColor(tipo) {
  const map = { 'A+': '#1565c0', 'A-': '#0d47a1', 'B+': '#2e7d32', 'B-': '#1b5e20', 'AB+': '#6a1b9a', 'AB-': '#4a148c', 'O+': '#c62828', 'O-': '#b71c1c' };
  return map[tipo] || '#546e7a';
}

function renderPatient(p) {
  const photoSection = p.foto_url
    ? `<img src="${esc(p.foto_url)}" alt="Foto de ${esc(p.nombre)}" class="patient-photo">`
    : `<div class="patient-photo-placeholder"><span>${esc(p.nombre || '?').charAt(0).toUpperCase()}</span></div>`;

  const alergiaSection = p.alergias
    ? `<div class="section allergy-section">
        <div class="section-title"><span class="icon">⚠️</span> ALERGIAS</div>
        <p class="allergy-text">${esc(p.alergias)}</p>
       </div>`
    : `<div class="section allergy-section allergy-none">
        <div class="section-title"><span class="icon">✅</span> ALERGIAS</div>
        <p>Sin alergias conocidas</p>
       </div>`;

  const btColor = bloodTypeColor(p.tipo_sangre);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="#0d2137">
  <title>PulsTag — ${esc(p.nombre)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #eef2f7; min-height: 100vh; padding-bottom: 32px; }
    .top-bar { background: #0d2137; color: white; padding: 14px 20px; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .top-bar .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: 1px; color: #64b5f6; }
    .top-bar .subtitle { font-size: 0.7rem; color: #90a4ae; text-transform: uppercase; letter-spacing: 1px; }
    .card { max-width: 480px; margin: 24px auto 0; padding: 0 16px; }
    .patient-header { background: white; border-radius: 16px; padding: 24px; display: flex; gap: 20px; align-items: center; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 12px; }
    .patient-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #e3f2fd; flex-shrink: 0; }
    .patient-photo-placeholder { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1565c0, #42a5f5); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 3px solid #e3f2fd; }
    .patient-photo-placeholder span { font-size: 2rem; font-weight: 700; color: white; }
    .patient-info { flex: 1; min-width: 0; }
    .patient-name { font-size: 1.2rem; font-weight: 700; color: #0d2137; line-height: 1.2; margin-bottom: 6px; }
    .patient-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .badge-age { background: #e3f2fd; color: #1565c0; border-radius: 20px; padding: 3px 10px; font-size: 0.8rem; font-weight: 600; }
    .badge-blood { border-radius: 20px; padding: 3px 12px; font-size: 0.85rem; font-weight: 800; color: white; letter-spacing: 0.5px; }
    .section { background: white; border-radius: 14px; padding: 18px 20px; margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
    .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #607d8b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .section-title .icon { font-size: 1rem; }
    .section p { font-size: 0.95rem; color: #37474f; line-height: 1.6; }
    .allergy-section { border-left: 4px solid #f44336; background: #fff8f8; }
    .allergy-section .section-title { color: #c62828; }
    .allergy-text { color: #c62828 !important; font-weight: 600 !important; }
    .allergy-none { border-left: 4px solid #4caf50; background: #f8fff8; }
    .allergy-none .section-title { color: #2e7d32; }
    .emergency-section { border-left: 4px solid #ff9800; background: #fffdf8; }
    .emergency-section .section-title { color: #e65100; }
    .emergency-section p { font-weight: 600; font-size: 1rem !important; }
    .footer { text-align: center; margin-top: 24px; color: #90a4ae; font-size: 0.72rem; letter-spacing: 0.5px; }
    .footer strong { color: #607d8b; }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>
      <div class="logo">PulsTag</div>
      <div class="subtitle">Identificación Médica</div>
    </div>
  </div>
  <div class="card">
    <div class="patient-header">
      ${photoSection}
      <div class="patient-info">
        <div class="patient-name">${esc(p.nombre)}</div>
        <div class="patient-meta">
          ${p.edad != null ? `<span class="badge-age">${esc(String(p.edad))} años</span>` : ''}
          ${p.tipo_sangre ? `<span class="badge-blood" style="background:${btColor}">${esc(p.tipo_sangre)}</span>` : ''}
        </div>
      </div>
    </div>
    ${alergiaSection}
    <div class="section">
      <div class="section-title"><span class="icon">💊</span> Medicamentos</div>
      <p>${p.medicamentos ? esc(p.medicamentos) : '<em style="color:#b0bec5">No registrado</em>'}</p>
    </div>
    <div class="section">
      <div class="section-title"><span class="icon">🏥</span> Diagnóstico</div>
      <p>${p.diagnostico ? esc(p.diagnostico) : '<em style="color:#b0bec5">No registrado</em>'}</p>
    </div>
    <div class="section emergency-section">
      <div class="section-title"><span class="icon">📞</span> Contacto de Emergencia</div>
      <p>${p.contacto_emergencia ? esc(p.contacto_emergencia) : '<em style="color:#b0bec5">No registrado</em>'}</p>
    </div>
    <div class="footer">
      <strong>PulsTag</strong> &mdash; Sistema de Identificación de Pacientes<br>
      Esta información es confidencial y de uso médico exclusivo.
    </div>
  </div>
</body>
</html>`;
}

function renderNotFound() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PulsTag — No encontrado</title>
  <style>body{font-family:-apple-system,sans-serif;background:#eef2f7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,.1)}.icon{font-size:3rem;margin-bottom:16px}h1{color:#37474f;font-size:1.3rem;margin-bottom:8px}p{color:#78909c;font-size:.9rem;line-height:1.6}</style>
  </head><body><div class="box"><div class="icon">🔍</div><h1>Paciente no encontrado</h1><p>El código NFC escaneado no corresponde a ningún paciente registrado.</p></div></body></html>`;
}

function renderError() {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PulsTag — Error</title>
  <style>body{font-family:-apple-system,sans-serif;background:#eef2f7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:white;border-radius:16px;padding:40px 32px;text-align:center;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,.1)}.icon{font-size:3rem;margin-bottom:16px}h1{color:#c62828;font-size:1.3rem;margin-bottom:8px}p{color:#78909c;font-size:.9rem}</style>
  </head><body><div class="box"><div class="icon">⚠️</div><h1>Error del servidor</h1><p>No se pudo cargar la información. Intente nuevamente.</p></div></body></html>`;
}

module.exports = router;
