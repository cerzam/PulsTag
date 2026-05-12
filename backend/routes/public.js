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

function parseContact(str) {
  if (!str) return { name: '', phone: '' };
  const parts = str.split(/\s*(?:—|–|--)\s*/);
  if (parts.length >= 2) return { name: parts[0].trim(), phone: parts[parts.length - 1].trim() };
  const m = str.match(/(\+?[\d][\d\s\-\.\(\)]{7,})/);
  if (m) return { name: str.replace(m[0], '').replace(/[-–—,]\s*$/, '').trim(), phone: m[0].trim() };
  return { name: str, phone: '' };
}

function renderPatient(p) {
  const btColor = bloodTypeColor(p.tipo_sangre);
  const contact = parseContact(p.contacto_emergencia);
  const callBtn = contact.phone
    ? `<a href="tel:${esc(contact.phone.replace(/\s/g, ''))}" class="call-btn">📞 LLAMAR AL CUIDADOR</a>`
    : '';

  const photoEl = p.foto_url
    ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nombre)}" class="avatar">`
    : `<div class="avatar avatar-initial">${esc(p.nombre || '?').charAt(0).toUpperCase()}</div>`;

  const bloodBadge = p.tipo_sangre
    ? `<span class="blood-badge" style="background:${btColor}">${esc(p.tipo_sangre)}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="#1565c0">
  <title>PulsTag — ${esc(p.nombre)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6fb; min-height: 100vh; }

    .top-bar { background: #1565c0; color: white; padding: 16px 20px 14px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .top-bar .brand { font-size: 1.15rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .top-bar .subtitle { font-size: 0.72rem; color: #bbdefb; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

    .profile-card { background: white; max-width: 480px; margin: 0 auto; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid #e3eaf4; }
    .avatar { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid #1565c0; margin: 0 auto 18px; display: block; }
    .avatar-initial { width: 110px; height: 110px; border-radius: 50%; background: linear-gradient(135deg, #1565c0, #42a5f5); display: flex; align-items: center; justify-content: center; font-size: 2.6rem; font-weight: 800; color: white; border: 4px solid #1565c0; margin: 0 auto 18px; }
    .patient-name { font-size: 1.5rem; font-weight: 800; color: #0d2137; line-height: 1.2; }
    .patient-age { font-size: 1rem; color: #607d8b; margin-top: 6px; }
    .meta-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .blood-badge { border-radius: 20px; padding: 4px 14px; font-size: 0.9rem; font-weight: 800; color: white; letter-spacing: 0.5px; }

    .body { max-width: 480px; margin: 0 auto; padding: 0 16px 32px; }

    .section-title { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #1565c0; margin: 20px 0 10px; }

    .info-list { list-style: none; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
    .info-list li { padding: 14px 18px; border-bottom: 1px solid #f0f4f8; font-size: 0.93rem; color: #37474f; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
    .info-list li:last-child { border-bottom: none; }
    .info-list li .ico { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
    .info-list li.allergy-item { background: #fff8f8; }
    .info-list li.allergy-item .lbl { color: #c62828; font-weight: 700; }
    .lbl { font-weight: 700; color: #37474f; }
    .val { color: #546e7a; }
    em { color: #b0bec5; font-style: italic; }

    .contact-card { background: white; border-radius: 14px; padding: 18px; margin-top: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
    .contact-row { display: flex; align-items: flex-start; gap: 12px; }
    .contact-row .ico { font-size: 1.3rem; flex-shrink: 0; margin-top: 2px; }
    .contact-name { font-weight: 700; font-size: 1rem; color: #0d2137; }
    .contact-phone { font-size: 0.9rem; color: #546e7a; margin-top: 2px; }
    .call-btn { display: block; width: 100%; background: #1565c0; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 0.95rem; letter-spacing: 1px; text-transform: uppercase; margin-top: 14px; transition: background 0.15s; }
    .call-btn:active { background: #0d47a1; }

    .thanks { text-align: center; margin-top: 28px; color: #78909c; font-size: 0.85rem; font-style: italic; line-height: 1.6; padding: 0 8px; }
    .footer { text-align: center; margin-top: 20px; color: #b0bec5; font-size: 0.7rem; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="brand">PulsTag</div>
    <div class="subtitle">Datos del Paciente</div>
  </div>

  <div class="profile-card">
    ${photoEl}
    <div class="patient-name">${esc(p.nombre)}</div>
    ${p.edad != null ? `<div class="patient-age">Edad: ${esc(String(p.edad))} años</div>` : ''}
    ${bloodBadge ? `<div class="meta-row">${bloodBadge}</div>` : ''}
  </div>

  <div class="body">
    <div class="section-title">Información Médica</div>
    <ul class="info-list">
      <li class="${p.alergias ? 'allergy-item' : ''}">
        <span class="ico">${p.alergias ? '💊' : '✅'}</span>
        <span><span class="lbl">Alergias: </span><span class="val">${p.alergias ? esc(p.alergias) : 'Ninguna conocida'}</span></span>
      </li>
      <li>
        <span class="ico">🏥</span>
        <span><span class="lbl">Diagnóstico: </span><span class="val">${p.diagnostico ? esc(p.diagnostico) : '<em>No registrado</em>'}</span></span>
      </li>
      <li>
        <span class="ico">💉</span>
        <span><span class="lbl">Medicamentos: </span><span class="val">${p.medicamentos ? esc(p.medicamentos) : '<em>No registrado</em>'}</span></span>
      </li>
    </ul>

    ${p.contacto_emergencia ? `
    <div class="section-title">Contactos de Emergencia</div>
    <div class="contact-card">
      <div class="contact-row">
        <span class="ico">👤</span>
        <div>
          <div class="contact-name">${esc(contact.name || p.contacto_emergencia)}</div>
          ${contact.phone ? `<div class="contact-phone">Tel: ${esc(contact.phone)}</div>` : ''}
        </div>
      </div>
      ${callBtn}
    </div>
    ${p.contacto_emergencia_2 ? (() => {
      const c2 = parseContact(p.contacto_emergencia_2);
      const callBtn2 = c2.phone
        ? `<a href="tel:${esc(c2.phone.replace(/\s/g, ''))}" class="call-btn" style="background:#37474f">📞 LLAMAR AL 2° CONTACTO</a>`
        : '';
      return `<div class="contact-card" style="margin-top:10px">
        <div class="contact-row">
          <span class="ico">👥</span>
          <div>
            <div class="contact-name">${esc(c2.name || p.contacto_emergencia_2)}</div>
            ${c2.phone ? `<div class="contact-phone">Tel: ${esc(c2.phone)}</div>` : ''}
          </div>
        </div>
        ${callBtn2}
      </div>`;
    })() : ''}` : ''}

    <p class="thanks">"Gracias por ayudar.<br>Su apoyo es importante para este paciente."</p>
    <div class="footer">PulsTag &mdash; Sistema de Identificación de Pacientes</div>
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
