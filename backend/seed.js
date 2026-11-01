const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connecté');

  // Supprimer les comptes existants (optionnel)
  await User.deleteMany({ email: { $in: ['admin@test.com', 'employe@test.com'] } });

  const salt = await bcrypt.genSalt(10);

  await User.create([
    {
      nom: 'Admin',
      prenom: 'Super',
      email: 'admin@test.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      actif: true
    },
    {
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'employe@test.com',
      password: await bcrypt.hash('employe123', salt),
      role: 'employe',
      actif: true
    }
  ]);

  console.log('✅ Comptes créés :');
  console.log('   Admin    → admin@test.com     / admin123');
  console.log('   Employé  → employe@test.com   / employe123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
