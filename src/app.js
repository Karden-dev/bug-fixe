// src/app.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

// Import des routes
const userRoutes = require('./routes/users.routes');
const shopRoutes = require('./routes/shops.routes');
const orderRoutes = require('./routes/orders.routes');
const deliverymenRoutes = require('./routes/deliverymen.routes');
const reportsRoutes = require('./routes/reports.routes');
const authRoutes = require('./routes/auth.routes');
const remittanceRoutes = require('./routes/remittances.routes');
const debtRoutes = require('./routes/debt.routes');
const cashRoutes = require('./routes/cash.routes');

// Import des modèles et services
const userModel = require('./models/user.model');
const shopModel = require('./models/shop.model');
const orderModel = require('./models/order.model');
const reportModel = require('./models/report.model');
const remittanceModel = require('./models/remittance.model');
const debtModel = require('./models/debt.model');
const cashModel = require('./models/cash.model');
const remittanceService = require('./services/remittances.service.js');
const debtService = require('./services/debt.service.js');
const cashService = require('./services/cash.service.js');
const balanceService = require('./services/balance.service.js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    
    // Initialisation des services et des modèles
    balanceService.init(dbPool);
    cashService.init(dbPool);
    remittanceService.init(dbPool);
    
    userModel.init(dbPool);
    shopModel.init(dbPool);
    remittanceModel.init(dbPool);
    cashModel.init(dbPool);
    reportModel.init(dbPool);
    
    // On initialise les modèles qui dépendent du balanceService
    debtModel.init(dbPool, balanceService); 
    orderModel.init(dbPool, balanceService);

    debtService.init(dbPool);

    app.get('/', (req, res) => {
        res.status(200).json({ message: 'WINK EXPRESS API is running!' });
    });

    app.use('/users', userRoutes);
    app.use('/shops', shopRoutes);
    app.use('/orders', orderRoutes);
    app.use('/deliverymen', deliverymenRoutes);
    app.use('/reports', reportsRoutes);
    app.use('/api', authRoutes);
    app.use('/remittances', remittanceRoutes);
    app.use('/debts', debtRoutes);
    app.use('/cash', cashRoutes);

    app.listen(port, () => {
        console.log(`Le serveur WINK EXPRESS est en cours d'exécution sur le port ${port}`);
    });
}

startServer();