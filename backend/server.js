const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors({ origin: '*', credentials: false }));

// Bypass ngrok browser warning
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté !'))
  .catch((err) => console.log('❌ Erreur MongoDB :', err));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pointage', require('./routes/pointage'));
app.use('/api/conge', require('./routes/conge'));
app.use('/api/employes', require('./routes/employes'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/rapports', require('./routes/rapports'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/departements', require('./routes/departements'));
app.use('/api/calendrier', require('./routes/calendrier'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Servir le frontend React (build)
const buildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(buildPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur + Frontend sur http://localhost:${PORT}`);
});