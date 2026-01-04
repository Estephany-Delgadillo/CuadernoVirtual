// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload'); // Para subir archivos
const db = require('./models/db');

dotenv.config();

const app = express();

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(fileUpload()); // Permite subir archivos

// Carpeta de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_lila',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Rutas
app.use('/auth', require('./routes/auth'));
app.use('/temas', require('./routes/temas'));

// Ruta raíz
app.get('/', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/temas/dashboard');
    }
    res.redirect('/auth/login');
});

app.use((req, res) => {
    res.status(404).send('Página no encontrada');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌸 Cuaderno Virtual corriendo en http://localhost:${PORT}`);
});