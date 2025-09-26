// src/services/balance.service.js
const moment = require('moment');
const debtService = require('./debt.service');

let dbConnection;

const init = (connection) => { 
    dbConnection = connection; 
    if (debtService.init) {
        debtService.init(connection);
    }
};

/**
 * Calcule et met à jour le solde d'un marchand pour une date spécifique,
 * et crée/met à jour le versement en attente si nécessaire.
 */
const calculateAndSaveBalance = async (shopId, date) => {
    const connection = await dbConnection.getConnection();
    try {
        const query = `
            SELECT
                s.id AS shop_id, s.payment_operator,
                COALESCE(o.gains_cash, 0) AS total_revenue_articles_cash,
                COALESCE(o.gains_failed, 0) AS total_revenue_articles_failed,
                COALESCE(o.total_delivery_fees, 0) AS total_delivery_fees,
                COALESCE(o.total_expedition_fees, 0) AS total_expedition_fees,
                (COALESCE(o.total_orders_delivered, 0) * IF(s.bill_packaging, s.packaging_price, 0)) AS total_packaging_fees,
                COALESCE(d_today.storage_fee_today, 0) AS total_storage_fees,
                COALESCE(d_prev.total_pending_debts, 0) AS previous_debts,
                COALESCE(o.total_orders_sent, 0) AS total_orders_sent,
                COALESCE(o.total_orders_delivered, 0) AS total_orders_delivered
            FROM shops s
            LEFT JOIN (
                SELECT 
                    shop_id, 
                    COUNT(id) AS total_orders_sent, 
                    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS total_orders_delivered,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END) AS total_orders_processed,
                    SUM(CASE WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount ELSE 0 END) AS gains_cash, 
                    SUM(CASE WHEN status = 'failed_delivery' THEN amount_received ELSE 0 END) AS gains_failed,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN delivery_fee ELSE 0 END) AS total_delivery_fees,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN expedition_fee ELSE 0 END) AS total_expedition_fees
                FROM orders WHERE shop_id = ? AND DATE(created_at) = ?
                GROUP BY shop_id
            ) AS o ON s.id = o.shop_id
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS storage_fee_today FROM debts 
                WHERE shop_id = ? AND type = 'storage' AND DATE(created_at) = ? AND status = 'pending'
                GROUP BY shop_id
            ) AS d_today ON s.id = d_today.shop_id
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS total_pending_debts FROM debts
                WHERE shop_id = ? AND status = 'pending' AND DATE(created_at) < ?
                GROUP BY shop_id
            ) AS d_prev ON s.id = d_prev.shop_id
            WHERE s.id = ?;
        `;
        
        const [rows] = await connection.execute(query, [shopId, date, shopId, date, shopId, date, shopId]);
        if (rows.length === 0) return;

        const data = rows[0];
        const merchantGains = parseFloat(data.total_revenue_articles_cash) + parseFloat(data.total_revenue_articles_failed);
        const merchantDebts = parseFloat(data.total_delivery_fees) + parseFloat(data.total_expedition_fees) + parseFloat(data.total_packaging_fees) + parseFloat(data.total_storage_fees) + parseFloat(data.previous_debts);
        const finalBalance = merchantGains - merchantDebts;
        
        // Logique de sauvegarde dans daily_shop_balances (l'archive des rapports)
        // ...

        // Logique pour remplir la table remittances
        if (finalBalance > 0) {
            const insertRemittanceQuery = `
                INSERT INTO remittances (remittance_date, shop_id, amount, status, payment_operator, comment)
                VALUES (?, ?, ?, 'pending', ?, ?)
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = 'pending', payment_date = NULL, user_id = NULL;
            `;
            await connection.execute(insertRemittanceQuery, [date, shopId, finalBalance, data.payment_operator, `Solde à verser pour le ${date}`]);
        } else {
            // S'il y avait un versement en attente pour ce jour mais que le solde est maintenant nul ou négatif, on le met à jour ou on le supprime
            await connection.execute('DELETE FROM remittances WHERE shop_id = ? AND remittance_date = ? AND status = "pending"', [shopId, date]);
        }

    } finally {
        connection.release();
    }
};

/**
 * Calcule les soldes pour tous les marchands actifs pour une date donnée.
 */
const calculateAllBalancesForDate = async (date) => {
    await debtService.processStorageFees(date);
    
    const connection = await dbConnection.getConnection();
    try {
        const [shops] = await connection.execute('SELECT id FROM shops WHERE status = "actif"');
        for (const shop of shops) {
            await calculateAndSaveBalance(shop.id, date);
        }
    } finally {
        connection.release();
    }
};

module.exports = {
    init,
    calculateAndSaveBalance,
    calculateAllBalancesForDate
};