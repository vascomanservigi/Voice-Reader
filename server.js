const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const services = [
    { id: 1, nome: 'Visita Oculistica Completa', prezzo: '€80', durata: '45 min', icona: '👁️' },
    { id: 2, nome: 'Controllo Vista', prezzo: '€40', durata: '20 min', icona: '📋' },
    { id: 3, nome: 'Adattamento Lenti a Contatto', prezzo: '€60', durata: '30 min', icona: '🔍' },
    { id: 4, nome: 'Topografia Corneale', prezzo: '€70', durata: '25 min', icona: '🗺️' },
    { id: 5, nome: 'Campo Visivo Computerizzato', prezzo: '€55', durata: '20 min', icona: '📊' },
    { id: 6, nome: 'OCT (Tomografia Coerenza Ottica)', prezzo: '€90', durata: '30 min', icona: '🔬' },
    { id: 7, nome: 'Chirurgia Refrattiva (Consulto)', prezzo: 'Gratuito', durata: '30 min', icona: '⚕️' },
    { id: 8, nome: 'Occhiali da Vista Personalizzati', prezzo: 'Da €120', durata: 'Variabile', icona: '👓' }
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

app.get('/api/servizi', (req, res) => {
    res.json({ servizi: services });
});

app.get('/api/orari', (req, res) => {
    res.json({ orari });
});

app.get('/api/fasce-orarie', (req, res) => {
    const { data } = req.query;
    if (!data) {
        return res.json({ fasce: timeSlots });
    }
    
    const date = new Date(data);
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
    
    res.json({ fasce: availableSlots });
});

app.post('/api/prenotazione', (req, res) => {
    const { nome, email, telefono, servizio, data, ora, note } = req.body;
    
    if (!nome || !email || !telefono || !servizio || !data || !ora) {
        return res.status(400).json({ 
            success: false, 
            message: 'Tutti i campi obbligatori devono essere compilati' 
        });
    }
    
    console.log('Nuova prenotazione:', { nome, email, telefono, servizio, data, ora, note });
    
    res.json({ 
        success: true, 
        message: 'Prenotazione ricevuta! Ti contatteremo a breve per confermare.',
        id: Date.now()
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});