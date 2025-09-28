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
                FROM orders 
                WHERE shop_id = ? AND DATE(created_at) = ? 
                GROUP BY shop_id
            ) AS o ON s.id = o.shop_id
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS total_pending_debts FROM debts
                WHERE shop_id = ? AND status = 'pending'
                GROUP BY shop_id
            ) AS d_prev ON s.id = d_prev.shop_id /* CORRIGÉ: Renommé d_prev pour obtenir TOUTES les dettes en attente */
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS storage_fee_today FROM debts 
                WHERE shop_id = ? AND type = 'storage' AND DATE(created_at) = ? AND status = 'pending'
                GROUP BY shop_id
            ) AS d_today ON s.id = d_today.shop_id
            WHERE s.id = ?;
        `;
        
        const [rows] = await connection.execute(query, [shopId, date, shopId, shopId, date, shopId]);
        if (rows.length === 0) return;

        const data = rows[0];
        const merchantGains = parseFloat(data.total_revenue_articles_cash) + parseFloat(data.total_revenue_articles_failed);
        
        // CORRECTION DE LOGIQUE: Requête simplifiée pour la somme de toutes les dettes en attente
        const [allPendingDebts] = await connection.execute(
            `
            SELECT COALESCE(SUM(amount), 0) AS total_debt_amount FROM debts
            WHERE shop_id = ? AND status = 'pending'
            `,
            [shopId]
        );
        const totalPendingDebt = parseFloat(allPendingDebts[0].total_debt_amount || 0);

        // Frais du jour = Frais de livraison + Frais d'expédition + Frais d'emballage
        const todayFees = parseFloat(data.total_delivery_fees) + parseFloat(data.total_expedition_fees) + parseFloat(data.total_packaging_fees);

        // Solde final = Encaissements du jour - Frais du jour - Toutes les créances en attente (anciennes et d'aujourd'hui)
        // Les dettes en attente incluent les frais de stockage d'aujourd'hui (générés par processStorageFees)
        const finalBalance = merchantGains - todayFees - totalPendingDebt;
        
        // --- Récupération des données pour le rapport (similaire au modèle de rapport original) ---
        const rpt = { ...data };
        const reportMerchantGains = parseFloat(rpt.total_revenue_articles_cash) + parseFloat(rpt.total_revenue_articles_failed);
        const reportMerchantDebts = parseFloat(rpt.total_delivery_fees) + parseFloat(rpt.total_expedition_fees) + parseFloat(rpt.total_packaging_fees) + parseFloat(rpt.total_storage_fees) + parseFloat(rpt.previous_debts);
        const reportAmountToRemit = reportMerchantGains - reportMerchantDebts;

        // Insertion/Mise à jour dans daily_shop_balances
        const insertBalanceQuery = `
            INSERT INTO daily_shop_balances 
                (report_date, shop_id, total_orders_sent, total_orders_delivered, total_revenue_articles, total_delivery_fees, total_expedition_fees, total_packaging_fees, total_storage_fees, previous_debts, remittance_amount, status) 
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                total_orders_sent = VALUES(total_orders_sent), 
                total_orders_delivered = VALUES(total_orders_delivered), 
                total_revenue_articles = VALUES(total_revenue_articles), 
                total_delivery_fees = VALUES(total_delivery_fees), 
                total_expedition_fees = VALUES(total_expedition_fees), 
                total_packaging_fees = VALUES(total_packaging_fees), 
                total_storage_fees = VALUES(total_storage_fees), 
                previous_debts = VALUES(previous_debts), 
                remittance_amount = VALUES(remittance_amount), 
                status = VALUES(status);
        `;
        const balanceStatus = reportAmountToRemit >= 0 ? 'pending' : 'pending';
        
        await connection.execute(insertBalanceQuery, [
            date, shopId, rpt.total_orders_sent || 0, rpt.total_orders_delivered || 0, reportMerchantGains, parseFloat(rpt.total_delivery_fees || 0), parseFloat(rpt.total_expedition_fees || 0), parseFloat(rpt.total_packaging_fees || 0), parseFloat(rpt.total_storage_fees || 0), parseFloat(rpt.previous_debts || 0), reportAmountToRemit, balanceStatus
        ]); 

        // Logique pour mettre à jour la table remittances (seulement si le solde est positif)
        if (reportAmountToRemit > 0) { // Si le solde est positif, c'est un versement à faire
            const insertRemittanceQuery = `
                INSERT INTO remittances (remittance_date, shop_id, amount, status, payment_operator, comment)
                VALUES (?, ?, ?, 'pending', ?, ?)
                ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = 'pending', payment_date = NULL, user_id = NULL;
            `;
            await connection.execute(insertRemittanceQuery, [date, shopId, reportAmountToRemit, data.payment_operator, `Solde à verser pour le ${date}`]);
        } else {
            // Si le solde est nul ou négatif, on supprime tout versement en attente pour cette date
            await connection.execute('DELETE FROM remittances WHERE shop_id = ? AND remittance_date = ? AND status IN ("pending", "partially_paid", "failed")', [shopId, date]);
        }
        
    } finally {
        connection.release();
    }
};

/**
 * Calcule les soldes pour tous les marchands actifs pour une date donnée.
 */
const calculateAllBalancesForDate = async (date) => {
    // 1. D'abord, s'assurer que les frais de stockage sont à jour
    await debtService.processStorageFees(date);
    
    const connection = await dbConnection.getConnection();
    try {
        const [shops] = await connection.execute('SELECT id FROM shops WHERE status = "actif"');
        for (const shop of shops) {
            // 2. Calculer et enregistrer le solde pour chaque marchand
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