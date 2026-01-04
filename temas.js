const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const db = require('../models/db');
const router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const [temas] = await db.execute('SELECT COUNT(*) AS total FROM temas WHERE usuario_id = ?', [req.session.userId]);
        const hayTemas = temas[0].total > 0;
        res.render('dashboard', { 
            nombre: req.session.nombre,
            hayTemas,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.render('dashboard', { 
            nombre: req.session.nombre,
            hayTemas: false,
            error: 'Error al cargar'
        });
    }
});


router.get('/estudiar', ensureAuthenticated, async (req, res) => {
    try {
        const [temas] = await db.execute('SELECT * FROM temas WHERE usuario_id = ? ORDER BY created_at DESC', [req.session.userId]);
        if (temas.length === 0) {
            return res.redirect('/temas/agregar');
        }
        res.render('estudiar', { temas, nombre: req.session.nombre });
    } catch (err) {
        console.error(err);
        res.redirect('/temas/dashboard');
    }
});


router.get('/agregar', ensureAuthenticated, (req, res) => {
    res.render('agregar_tema', { error: null, nombre: req.session.nombre });
});


router.post('/agregar', ensureAuthenticated, async (req, res) => {
    const { titulo, notas, tiempo_estudio } = req.body;
    let archivo = null;

    try {
        
        if (req.files && req.files.archivo) {
            const file = req.files.archivo;
            const ext = path.extname(file.name).toLowerCase();
            const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
            
            if (!allowed.includes(ext)) {
                return res.render('agregar_tema', { 
                    error: 'Solo se permiten PDF, JPG, PNG o TXT', 
                    nombre: req.session.nombre 
                });
            }

            archivo = `tema_${Date.now()}${ext}`;
            await file.mv(path.join(__dirname, '..', 'uploads', archivo));
        }

        await db.execute(
            'INSERT INTO temas (usuario_id, titulo, notas, tiempo_estudio, archivo) VALUES (?, ?, ?, ?, ?)',
            [req.session.userId, titulo, notas || '', parseInt(tiempo_estudio) || 0, archivo]
        );
        res.redirect('/temas/dashboard');
    } catch (err) {
        console.error(err);
        // Limpiar archivo si falla
        if (archivo) {
            try { await fs.unlink(path.join(__dirname, '..', 'uploads', archivo)); } catch (e) {}
        }
        res.render('agregar_tema', { 
            error: 'Error al guardar el tema', 
            nombre: req.session.nombre 
        });
    }
});


router.get('/ver/:id', ensureAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM temas WHERE id = ? AND usuario_id = ?', [req.params.id, req.session.userId]);
        if (rows.length === 0) {
            return res.redirect('/temas/estudiar');
        }
        res.render('ver_tema', { tema: rows[0], nombre: req.session.nombre });
    } catch (err) {
        console.error(err);
        res.redirect('/temas/estudiar');
    }
});

router.post('/guardar/:id', ensureAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { tiempoMinutos, notas } = req.body;

    try {
      
        const [rows] = await db.execute('SELECT * FROM temas WHERE id = ? AND usuario_id = ?', [id, req.session.userId]);
        if (rows.length === 0) {
            return res.status(403).json({ error: 'No autorizado' });
        }

        
        await db.execute(
            'UPDATE temas SET tiempo_estudio = tiempo_estudio + ?, notas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [tiempoMinutos || 0, notas || '', id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar' });
    }
});
module.exports = router;