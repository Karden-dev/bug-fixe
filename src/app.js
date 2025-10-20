// src/app.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

// --- Import des Routes ---
const userRoutes = require('./routes/users.routes');
const shopRoutes = require('./routes/shops.routes');
const orderRoutes = require('./routes/orders.routes');
const deliverymenRoutes = require('./routes/deliverymen.routes');
const reportsRoutes = require('./routes/reports.routes');
const authRoutes = require('./routes/auth.routes');
const remittanceRoutes = require('./routes/remittances.routes');
const debtRoutes = require('./routes/debt.routes');
const cashRoutes = require('./routes/cash.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const riderRoutes = require('./routes/rider.routes.js');
const performanceRoutes = require('./routes/performance.routes'); // <-- NOUVEL IMPORT (Routes Performance)
const scheduleRoutes = require('./routes/schedule.routes'); // <-- NOUVEL IMPORT (Routes Schedule/Planning)

// --- Import des Modèles et Services ---
const userModel = require('./models/user.model');
const shopModel = require('./models/shop.model');
const orderModel = require('./models/order.model');
const reportModel = require('./models/report.model');
const remittanceModel = require('./models/remittance.model');
const debtModel = require('./models/debt.model');
const cashModel = require('./models/cash.model');
const dashboardModel = require('./models/dashboard.model');
const riderModel = require('./models/rider.model');
const ridersCashModel = require('./models/riderscash.model');
const performanceModel = require('./models/performance.model'); // <-- NOUVEL IMPORT (Modèle Performance)
const scheduleModel = require('./models/schedule.model'); // <-- NOUVEL IMPORT (Modèle Schedule/Planning)

const cashStatModel = require('./models/cash.stat.model');
const cashClosingService = require('./services/cash.closing.service');

// Services
const remittanceService = require('./services/remittances.service.js');
const debtService = require('./services/debt.service.js');
const cashService = require('./services/cash.service.js');
const balanceService = require('./services/balance.service.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10, // Limite du nombre de connexions dans le pool
    queueLimit: 0 // Nombre illimité de requêtes en attente
};

let dbPool; // Variable pour stocker le pool de connexions

// Fonction pour établir la connexion à la base de données
async function connectToDatabase() {
    try {
        dbPool = mysql.createPool(dbConfig);
        console.log('Pool de connexions à la base de données créé avec succès !');
        // Attribuer la connexion globale pour les modèles qui l'utilisent directement (si nécessaire)
        performanceModel.dbConnection = dbPool; // Exemple si le modèle a besoin d'un accès direct
    } catch (error) {
        console.error('Erreur de création du pool de connexions :', error);
        process.exit(1); // Arrêter l'application en cas d'échec de connexion
    }
}

// Fonction pour démarrer le serveur après la connexion à la BDD
async function startServer() {
    await connectToDatabase();

    // --- Initialisation des Services et Modèles ---
    // Injecter le pool de connexions dans chaque module qui en a besoin via la fonction init
    cashStatModel.init(dbPool);
    cashClosingService.init(dbPool);

    cashService.init(dbPool);
    remittanceService.init(dbPool);
    debtService.init(dbPool);
    balanceService.init(dbPool);

    userModel.init(dbPool);
    shopModel.init(dbPool);
    remittanceModel.init(dbPool);
    cashModel.init(dbPool);
    dashboardModel.init(dbPool);
    reportModel.init(dbPool);
    debtModel.init(dbPool);
    orderModel.init(dbPool);
    riderModel.init(dbPool);
    ridersCashModel.init(dbPool);
    performanceModel.init(dbPool); // <-- NOUVELLE INITIALISATION (Modèle Performance)
    scheduleModel.init(dbPool); // <-- NOUVELLE INITIALISATION (Modèle Schedule/Planning)


    // --- Déclaration des Routes API ---
    // Chaque fichier de routes gère un préfixe spécifique
    app.use('/api', authRoutes); // Routes pour l'authentification (ex: /api/login)
    app.use('/api/users', userRoutes);
    app.use('/api/shops', shopRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/deliverymen', deliverymenRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/remittances', remittanceRoutes);
    app.use('/api/debts', debtRoutes);
    app.use('/api/cash', cashRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/rider', riderRoutes); // Routes spécifiques pour l'app livreur
    app.use('/api/performance', performanceRoutes); // <-- NOUVELLE ROUTE MONTÉE (Performance livreur)
    app.use('/api/schedule', scheduleRoutes); // <-- NOUVELLE ROUTE MONTÉE (Objectifs & Absences)


    // Démarrer le serveur Express
    app.listen(port, () => {
        console.log(`📡 Le serveur WINK EXPRESS est en cours d'exécution sur le port ${port} 📡`);
    });
}

// Lancer le serveur
startServer();