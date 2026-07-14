const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

const services = [
    { id: 1, nome: 'Visita Oculistica Completa', prezzo: '€80', durata: '45 min', icona: '👁️', categoria: 'diagnostica' },
    { id: 2, nome: 'Controllo Vista', prezzo: '€40', durata: '20 min', icona: '📋', categoria: 'correzione' },
    { id: 3, nome: 'Adattamento Lenti a Contatto', prezzo: '€60', durata: '30 min', icona: '🔍', categoria: 'correzione' },
    { id: 4, nome: 'Topografia Corneale', prezzo: '€70', durata: '25 min', icona: '🗺️', categoria: 'diagnostica' },
    { id: 5, nome: 'Campo Visivo Computerizzato', prezzo: '€55', durata: '20 min', icona: '📊', categoria: 'diagnostica' },
    { id: 6, nome: 'OCT (Tomografia Coerenza Ottica)', prezzo: '€90', durata: '30 min', icona: '🔬', categoria: 'diagnostica' },
    { id: 7, nome: 'Chirurgia Refrattiva (Consulto)', prezzo: 'Gratuito', durata: '30 min', icona: '⚕️', categoria: 'chirurgia' },
    { id: 8, nome: 'Occhiali da Vista Personalizzati', prezzo: 'Da €120', durata: 'Variabile', icona: '👓', categoria: 'correzione' }
];

const orari = [
    { giorno: 'Lunedì - Venerdì', mattina: '09:00 - 13:00', pomeriggio: '15:00 - 19:00' },
    { giorno: 'Sabato', mattina: '09:00 - 13:00', pomeriggio: 'Chiuso' },
    { giorno: 'Domenica', mattina: 'Chiuso', pomeriggio: 'Chiuso' }
];

const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30'
];

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Troppe richieste, riprova tra 15 minuti' },
    standardHeaders: true,
    legacyHeaders: false
});

const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Limite prenotazioni orario superato, riprova più tardi' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(helmet({
    contentSecurityPolicy: IS_PROD ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["https://www.google.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));

app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(morgan(IS_PROD ? 'combined' : 'dev', {
    skip: (req, res) => req.url === '/health' || req.url.startsWith('/static/')
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/api/', apiLimiter);

const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath, {
    maxAge: IS_PROD ? '1y' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/api/servizi', (req, res) => {
    const { categoria } = req.query;
    let result = services;
    
    if (categoria) {
        result = services.filter(s => s.categoria === categoria);
    }
    
    res.json({ 
        success: true,
        count: result.length,
        servizi: result 
    });
});

app.get('/api/servizi/:id', (req, res) => {
    const service = services.find(s => s.id === parseInt(req.params.id));
    if (!service) {
        return res.status(404).json({ success: false, message: 'Servizio non trovato' });
    }
    res.json({ success: true, servizio: service });
});

app.get('/api/orari', (req, res) => {
    res.json({ 
        success: true,
        orari 
    });
});

app.get('/api/fasce-orarie', (req, res) => {
    const { data } = req.query;
    
    if (!data) {
        return res.json({ 
            success: true,
            fasce: timeSlots 
        });
    }
    
    const date = new Date(data + 'T00:00:00');
    
    if (isNaN(date.getTime())) {
        return res.status(400).json({ 
            success: false, 
            message: 'Formato data non valido (usa YYYY-MM-DD)' 
        });
    }
    
    const day = date.getDay();
    let availableSlots = timeSlots;
    
    if (day === 0) {
        availableSlots = [];
    } else if (day === 6) {
        availableSlots = timeSlots.filter(t => {
            const hour = parseInt(t.split(':')[0]);
            return hour >= 9 && hour < 13;
        });
    }
    
    res.json({ 
        success: true,
        data: data,
        giorno: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][day],
        fasce: availableSlots 
    });
});

const validateBooking = (req, res, next) => {
    const { nome, email, telefono, servizio, data, ora } = req.body;
    const errors = [];
    
    if (!nome || nome.trim().length < 2) {
        errors.push('Nome deve contenere almeno 2 caratteri');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email non valida');
    }
    if (!telefono || !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(telefono)) {
        errors.push('Numero di telefono non valido');
    }
    if (!servizio || !services.find(s => s.id === parseInt(servizio))) {
        errors.push('Servizio non valido');
    }
    if (!data) {
        errors.push('Data richiesta');
    } else {
        const selectedDate = new Date(data + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            errors.push('La data deve essere oggi o futura');
        }
        if (selectedDate.getDay() === 0) {
            errors.push('La domenica siamo chiusi');
        }
    }
    if (!ora) {
        errors.push('Ora richiesta');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Dati non validi',
            errors 
        });
    }
    
    next();
};

app.post('/api/prenotazione', bookingLimiter, validateBooking, (req, res) => {
    const { nome, email, telefono, servizio, data, ora, note } = req.body;
    
    const service = services.find(s => s.id === parseInt(servizio));
    
    const booking = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        servizio: service ? service.nome : 'Sconosciuto',
        servizioId: parseInt(servizio),
        data,
        ora,
        note: note ? note.trim() : '',
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    
    console.log('📅 Nuova prenotazione:', JSON.stringify(booking, null, 2));
    
    res.status(201).json({ 
        success: true, 
        message: 'Prenotazione ricevuta! Ti contatteremo entro 24h per confermare.',
        prenotazione: {
            id: booking.id,
            servizio: booking.servizio,
            data: booking.data,
            ora: booking.ora
        }
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
            console.error('Errore invio index.html:', err);
            res.status(500).send('Errore interno del server');
        }
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Errore server:', err);
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'JSON non valido' });
    }
    
    res.status(500).json({ 
        success: false, 
        message: IS_PROD ? 'Errore interno del server' : err.message 
    });
});

const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Ottica Visione Chiara - Server avviato                   ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(43)}║
║  Port:        ${PORT.toString().padEnd(43)}║
║  Health:      http://localhost:${PORT}/health${' '.repeat(28)}║
║  API:         http://localhost:${PORT}/api/servizi${' '.repeat(27)}║
╚═══════════════════════════════════════════════════════════╝
    `);
});

const gracefulShutdown = (signal) => {
    console.log(`\n📴 Ricevuto ${signal}, chiusura graceful...`);
    server.close(() => {
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
    });
    
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;