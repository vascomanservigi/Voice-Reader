# Ottica Visione Chiara

Sito web professionale per negozio oculistico con tema nero, bianco e oro.

## Caratteristiche

- **Design elegante** - Palette nero/bianco/oro (#c9a84c)
- **Responsive** - Mobile-first, funziona su tutti i dispositivi
- **Menu a tendina** - Dropdown per i servizi con sezioni organizzate
- **Prenotazione online** - Form completa con validazione, slot orari dinamici
- **API REST** - Backend Express per servizi, orari, prenotazioni
- **Animazioni fluide** - IntersectionObserver, hover effects, transizioni
- **Accessibilità** - ARIA labels, focus management, semantic HTML
- **Dark mode** - Supporto automatico prefers-color-scheme

## Struttura

```
├── public/
│   ├── index.html      # Sito completo (11 sezioni)
│   ├── style.css       # Styling completo (~1200 righe)
│   └── script.js       # Interattività completa (~450 righe)
├── server.js           # Express API
├── package.json
└── .gitignore
```

## Sezioni del sito

1. **Hero** - Badge "Dal 1995", statistiche, 3 card flottanti animate
2. **Servizi** - 8 card con prezzi/durata (visita €80, OCT €90, chirurgia refrattiva consulto gratis, ecc.)
3. **Chi Siamo** - Storia 28 anni, valori, badge esperienza
4. **Team** - Griglia specialisti (oculisti, optometristi, ottici)
5. **Tecnologia** - 6 macchinari (OCT Spectralis, Topografo Sirius, Campo Visivo Humphrey, Laser Excimer, Retinografo Widefield, Analisi Lacrimale)
6. **CTA** - Prenota visita
7. **Contatti** - Indirizzo Roma, telefono, email, mappa Google, orari dinamici
8. **Prenotazione** - Form validata, select servizi da API, date picker (min domani), slot orari per giorno (chiuso dom, solo mattina sab), toast notifiche

## Installazione e avvio

```bash
cd "Voice Reader"
npm install
npm start
# http://localhost:3000
```

## API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/servizi` | GET | Lista servizi con prezzi/durata |
| `/api/orari` | GET | Orari apertura per giorno |
| `/api/fasce-orarie` | GET | Slot orari disponibili per data |
| `/api/prenotazione` | POST | Invia prenotazione |

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ES6+)
- **Backend**: Node.js + Express
- **Font**: Playfair Display (titoli) + Inter (corpo)
- **Icons**: SVG inline + emoji
- **No dipendenze frontend** - Zero build step

## Deploy

Pronto per: Vercel, Netlify, Railway, Render, Heroku, VPS

```bash
# Build per produzione (solo installa dipendenze)
npm ci --production
npm start
```

## Licenza

MIT