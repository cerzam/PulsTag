const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../db');
const auth = require('../middleware/auth');

// POST /admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /admin/patients
router.get('/patients', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('List patients error:', err);
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

// POST /admin/patients
router.post('/patients', auth, async (req, res) => {
  const { nombre, edad, diagnostico, medicamentos, alergias, tipo_sangre, contacto_emergencia, foto_url } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del paciente es requerido' });
  }
  try {
    const uuid = randomUUID();
    const [result] = await pool.query(
      `INSERT INTO patients (uuid, nombre, edad, diagnostico, medicamentos, alergias, tipo_sangre, contacto_emergencia, foto_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid, nombre, edad || null, diagnostico || null, medicamentos || null, alergias || null, tipo_sangre || null, contacto_emergencia || null, foto_url || null]
    );
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

// PUT /admin/patients/:id
router.put('/patients/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { nombre, edad, diagnostico, medicamentos, alergias, tipo_sangre, contacto_emergencia, foto_url } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del paciente es requerido' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE patients
       SET nombre=?, edad=?, diagnostico=?, medicamentos=?, alergias=?, tipo_sangre=?, contacto_emergencia=?, foto_url=?
       WHERE id=?`,
      [nombre, edad || null, diagnostico || null, medicamentos || null, alergias || null, tipo_sangre || null, contacto_emergencia || null, foto_url || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Error al actualizar paciente' });
  }
});

// DELETE /admin/patients/:id
router.delete('/patients/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM patients WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'Error al eliminar paciente' });
  }
});

module.exports = router;
