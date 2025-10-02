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
// const cashRoutes = require('./routes/cash.routes'); // SUPPRIMÉ: Génère l'erreur
const dashboardRoutes = require('./routes/dashboard.routes');
const deliverymanRemittancesRoutes = require('./routes/deliverymanRemittances.routes'); // Gardé: Nouveau module

// --- Import des Modèles et Services ---
const userModel = require('./models/user.model');
const shopModel = require('./models/shop.model');
const orderModel = require('./models/order.model');
const reportModel = require('./models/report.model');
const remittanceModel = require('./models/remittance.model');
const debtModel = require('./models/debt.model');
// const cashModel = require('./models/cash.model'); // SUPPRIMÉ: Doit être retiré
const dashboardModel = require('./models/dashboard.model');
const deliverymanRemittancesModel = require('./models/deliverymanRemittances.model'); // Gardé: Nouveau module

// Services
const remittanceService = require('./services/remittances.service.js');
const debtService = require('./services/debt.service.js');
// const cashService = require('./services/cash.service.js'); // SUPPRIMÉ: Doit être retiré
const balanceService = require('./services/balance.service.js');
const deliverymanRemittancesService = require('./services/deliverymanRemittances.service'); // Gardé: Nouveau module

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour servir les fichiers statiques (HTML, CSS, JS du frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let dbPool;

async function connectToDatabase() {
    try {
        dbPool = mysql.createPool(dbConfig);
        console.log('Pool de connexions à la base de données créé avec succès !');
    } catch (error) {
        console.error('Erreur de création du pool de connexions :', error);
        process.exit(1);
    }
}

async function startServer() {
    await connectToDatabase();
    
    // --- Initialisation des Services et Modèles ---
    // 1. Initialiser les services qui n'ont pas de dépendances complexes
    // cashService.init(dbPool); // SUPPRIMÉ
    remittanceService.init(dbPool);
    debtService.init(dbPool);
    deliverymanRemittancesService.init(dbPool); // Gardé
    
    // 2. Initialiser le service de bilan central
    balanceService.init(dbPool);
    
    // 3. Initialiser les modèles simples
    userModel.init(dbPool);
    shopModel.init(dbPool);
    remittanceModel.init(dbPool);
    // cashModel.init(dbPool); // SUPPRIMÉ
    dashboardModel.init(dbPool);
    reportModel.init(dbPool);
    deliverymanRemittancesModel.init(dbPool); // Gardé
    
    // 4. Initialiser les modèles complexes en leur passant leurs dépendances
    debtModel.init(dbPool);
    orderModel.init(dbPool);

    // --- Déclaration des Routes API ---
    app.use('/api', authRoutes); 

    app.use('/api/users', userRoutes);
    app.use('/api/shops', shopRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/deliverymen', deliverymenRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/remittances', remittanceRoutes);
    app.use('/api/debts', debtRoutes);
    // app.use('/api/cash', cashRoutes); // SUPPRIMÉ
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/deliveryman-remittances', deliverymanRemittancesRoutes); // Gardé

    app.listen(port, () => {
        console.log(`Le serveur WINK EXPRESS est en cours d'exécution sur le port ${port}`);
    });
}

startServer();