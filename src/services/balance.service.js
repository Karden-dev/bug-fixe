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
                
                -- CORRECTION LOGIQUE: Les frais d'emballage ne se basent que sur les commandes livrées
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
        const status = finalBalance > 0.01 ? 'pending' : 'paid';

        const saveData = {
            report_date: date,
            shop_id: shopId,
            total_orders_sent: data.total_orders_sent,
            total_orders_delivered: data.total_orders_delivered,
            total_revenue_articles: merchantGains,
            total_delivery_fees: data.total_delivery_fees,
            total_expedition_fees: data.total_expedition_fees,
            total_packaging_fees: data.total_packaging_fees,
            total_storage_fees: data.total_storage_fees,
            previous_debts: data.previous_debts,
            remittance_amount: finalBalance,
            status: status
        };

        const saveQuery = `
            INSERT INTO daily_shop_balances (report_date, shop_id, total_orders_sent, total_orders_delivered, total_revenue_articles, total_delivery_fees, total_expedition_fees, total_packaging_fees, total_storage_fees, previous_debts, remittance_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                total_orders_sent = VALUES(total_orders_sent), total_orders_delivered = VALUES(total_orders_delivered), total_revenue_articles = VALUES(total_revenue_articles), 
                total_delivery_fees = VALUES(total_delivery_fees), total_expedition_fees = VALUES(total_expedition_fees), total_packaging_fees = VALUES(total_packaging_fees), 
                total_storage_fees = VALUES(total_storage_fees), previous_debts = VALUES(previous_debts), remittance_amount = VALUES(remittance_amount), status = VALUES(status);
        `;
        
        await connection.execute(saveQuery, Object.values(saveData));

    } finally {
        connection.release();
    }
};

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