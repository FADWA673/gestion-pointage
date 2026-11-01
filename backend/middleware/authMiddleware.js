const jwt = require('jsonwebtoken');

// Ce middleware vérifie que l'utilisateur est bien connecté
const protect = (req, res, next) => {
  // Récupère le token depuis le header "Authorization"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  const token = authHeader.split(' ')[1]; // récupère juste le token

  try {
    // Vérifie que le token est valide
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ajoute les infos utilisateur à la requête
    next(); // continue vers la route
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Vérifie que c'est bien un admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux admins' });
  }
  next();
};

module.exports = { protect, adminOnly };