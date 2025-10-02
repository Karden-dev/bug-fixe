// src/models/dashboard.model.js

// Configuration DB
let dbPool;

// --- DÉPENDANCES ---
// NOTE: L'importation de cash.model est supprimée pour résoudre l'erreur.
// Si le tableau de bord a besoin d'informations de caisse, une nouvelle logique
// devra être implémentée en utilisant les nouveaux modules (e.g., CashiersClosingsModel).
// const cashModel = require('./cash.model'); // Ligne supprimée

const DashboardModel = {};

/**
 * Initialise le modèle avec le pool de connexion à la base de données.
 * @param {object} pool - Pool de connexions MySQL.
 */
DashboardModel.init = (pool) => {
    dbPool = pool;
};

/**
 * Récupère le résumé des statistiques clés pour le tableau de bord pour la journée en cours.
 * @returns {Promise<object>} Statistiques du tableau de bord.
 */
DashboardModel.getSummaryStats = async () => {
    if (!dbPool) {
        throw new Error("Le pool de base de données n'est pas initialisé dans DashboardModel.");
    }
    
    try {
        // --- 1. Statistiques des Commandes du Jour ---
        const [orderStatsResult] = await dbPool.query(`
            SELECT 
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_orders,
                SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) AS failed_orders
            FROM orders
            WHERE DATE(created_at) = CURDATE()
        `);
        
        const orderStats = orderStatsResult[0] || {};

        // --- 2. Statistiques des Remises Livreur du Jour (Agrégées) ---
        // Utilisé pour montrer la performance des versements
        const [remittanceStatsResult] = await dbPool.query(`
            SELECT 
                COALESCE(SUM(r.amount), 0) AS daily_remittance_total
            FROM remittances r
            WHERE DATE(r.remittance_date) = CURDATE()
        `);
        
        const remittanceStats = remittanceStatsResult[0] || { daily_remittance_total: 0 };


        // --- 3. Solde de Caisse Actuel ---
        // NEUTRALISATION TEMPORAIRE : Remplace l'appel à cash.model
        let current_cash_balance = 0;
        
        // Si vous avez migré le solde de caisse vers une table dédiée, utilisez cette requête :
        /*
        const [balanceResult] = await dbPool.query("SELECT amount FROM cashiers_balances ORDER BY id DESC LIMIT 1");
        current_cash_balance = balanceResult.length ? balanceResult[0].amount : 0;
        */

        // --- 4. Comptes Actifs (Livreurs et Boutiques) ---
        const [activeUsersResult] = await dbPool.query(`
            SELECT 
                SUM(CASE WHEN r.name = 'DELIVERYMAN' THEN 1 ELSE 0 END) AS total_deliverymen,
                (SELECT COUNT(*) FROM shops) AS total_shops
            FROM users u
            JOIN roles r ON u.role_id = r.id
        `);

        const activeUsers = activeUsersResult[0] || {};
        

        return {
            total_orders: parseInt(orderStats.total_orders || 0),
            pending_orders: parseInt(orderStats.pending_orders || 0),
            delivered_orders: parseInt(orderStats.delivered_orders || 0),
            failed_orders: parseInt(orderStats.failed_orders || 0),
            
            daily_remittance_total: parseFloat(remittanceStats.daily_remittance_total),
            current_cash_balance: parseFloat(current_cash_balance), // Temporairement neutralisé
            
            total_deliverymen: parseInt(activeUsers.total_deliverymen || 0),
            total_shops: parseInt(activeUsers.total_shops || 0)
        };

    } catch (error) {
        console.error("Erreur critique dans DashboardModel.getSummaryStats:", error);
        throw new Error("Impossible de calculer les statistiques du tableau de bord.");
    }
};

// --- Fonction de récupération des derniers mouvements de caisse/activité (exemple) ---
DashboardModel.getRecentActivity = async (limit = 10) => {
    if (!dbPool) {
        throw new Error("Le pool de base de données n'est pas initialisé dans DashboardModel.");
    }

    // Requête pour les dernières commandes, pour l'activité générale
    const sql = `
        SELECT 
            o.id, 
            o.ref, 
            o.status, 
            o.total_price, 
            o.created_at, 
            u.full_name AS deliveryman_name
        FROM orders o
        LEFT JOIN users u ON o.deliveryman_id = u.id
        ORDER BY o.created_at DESC
        LIMIT ?
    `;
    
    // Le code utilise `dbPool.query`, mais le modèle de connexion standard est `db.query(sql, values)`
    // Pour éviter une erreur, j'utilise la syntaxe de `dbPool.query` avec les placeholders.
    const [rows] = await dbPool.query(sql, [limit]);
    return rows;
};


module.exports = DashboardModel;