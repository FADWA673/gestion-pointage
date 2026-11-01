# 📋 Gestion de Pointage

Application web complète de gestion de pointage et de congés pour les employés d'une entreprise.

---

## 🚀 Technologies utilisées

### Frontend
- **React.js** — Interface utilisateur
- **React Router** — Navigation entre les pages
- **Axios** — Requêtes HTTP vers l'API

### Backend
- **Node.js / Express.js** — Serveur API REST
- **MongoDB / Mongoose** — Base de données
- **JWT** — Authentification sécurisée
- **bcryptjs** — Hashage des mots de passe

---

## 📁 Structure du projet

```
gestion-pointage/
├── backend/
│   ├── models/          # Modèles Mongoose (User, Pointage, Conge...)
│   ├── routes/          # Routes API REST
│   ├── middleware/      # Middleware d'authentification JWT
│   ├── server.js        # Point d'entrée du serveur
│   └── seed.js          # Script de données initiales
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # Composants réutilisables (Navbar, Layout)
│       ├── pages/       # Pages de l'application
│       └── services/    # Services API (axios)
├── start.bat            # Script de démarrage (Windows)
└── ngrok.yml            # Configuration ngrok (tunnel)
```

---

## ✨ Fonctionnalités

- 🔐 **Authentification** — Connexion sécurisée avec JWT (Admin / Employé)
- 👤 **Gestion des employés** — Ajout, modification, suppression
- 🏢 **Gestion des départements** — Organisation par équipes
- ⏱️ **Pointage** — Enregistrement des entrées/sorties
- 📅 **Calendrier** — Visualisation des présences
- 🌴 **Congés** — Demande et validation des congés
- 📊 **Rapports** — Statistiques et exports
- 🔔 **Notifications** — Alertes en temps réel
- 📱 **QR Code** — Pointage via scan QR
- 📋 **Audit Log** — Historique des actions

---

## ⚙️ Installation et lancement

### Prérequis
- Node.js >= 16
- MongoDB Atlas (ou local)

### 1. Cloner le projet
```bash
git clone https://github.com/FADWA673/gestion-pointage.git
cd gestion-pointage
```

### 2. Backend
```bash
cd backend
npm install
```

Créer un fichier `.env` dans le dossier `backend/` :
```env
PORT=5000
MONGO_URI=votre_uri_mongodb
JWT_SECRET=votre_secret_jwt
FRONTEND_URL=http://localhost:3000
```

Lancer le serveur :
```bash
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

L'application sera disponible sur **http://localhost:3000**

---

## 👥 Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| **Admin** | Tableau de bord complet, gestion employés, rapports, validation congés |
| **Employé** | Pointage, demande de congés, profil, calendrier personnel |

---

## 📄 Licence

Ce projet est développé à des fins académiques.
