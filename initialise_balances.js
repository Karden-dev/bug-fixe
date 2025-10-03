// initialise_balances.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const moment = require('moment');

const balanceService = require('./src/services/balance.service');
const debtService = require('./src/services/debt.service');

async function main() {
    console.log("Démarrage de l'initialisation des soldes historiques...");
    
    // CORRECTION : Ajout du fuseau horaire dans la configuration du pool
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+01:00' // Force la connexion sur le fuseau horaire WAT
    });

    try {
        balanceService.init(pool);
        debtService.init(pool);

        console.log("Récupération des dates uniques et des marchands actifs...");
        const [dates] = await pool.execute("SELECT DISTINCT DATE(created_at) as report_date FROM orders ORDER BY report_date ASC");
        const [shops] = await pool.execute("SELECT id FROM shops WHERE status = 'actif'");

        if (dates.length === 0 || shops.length === 0) {
            console.log("Aucune commande ou aucun marchand trouvé. L'initialisation n'est pas nécessaire.");
            return;
        }

        for (const dateRow of dates) {
            const date = moment(dateRow.report_date).format('YYYY-MM-DD');
            console.log(`\n--- Traitement de la date : ${date} ---`);
            
            // La fonction calculateAllBalancesForDate s'occupe de tout
            await balanceService.calculateAllBalancesForDate(date);
            console.log(`Soldes pour le ${date} calculés et enregistrés.`);
        }
        
        console.log("\nInitialisation terminée avec succès !");

    } catch (err) {
        console.error("\nUne erreur est survenue lors de l'exécution du script :", err);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

main();