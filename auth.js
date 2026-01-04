const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const router = express.Router();


router.get('/login', (req, res) => {
    res.render('login', { error: null });
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.render('login', { error: 'Email o contraseña incorrectos' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'Email o contraseña incorrectos' });
        }

        req.session.userId = user.id;
        req.session.nombre = user.nombre;
        res.redirect('/temas/dashboard'); 
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Error en el servidor' });
    }
});


router.get('/register', (req, res) => {
    res.render('register', { error: null });
});


router.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Error al registrar usuario' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;