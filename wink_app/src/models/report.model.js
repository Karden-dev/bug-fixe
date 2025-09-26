// src/models/report.model.js
const moment = require('moment');

let dbConnection;

module.exports = {
    init: (connection) => { dbConnection = connection; },

    findReportsByDate: async (date) => {
        const connection = await dbConnection.getConnection();
        try {
            // Étape 1 : Obtenir la liste de tous les marchands actifs
            const [shops] = await connection.execute("SELECT id, name, packaging_price, bill_packaging FROM shops WHERE status = 'actif'");
            const reportDate = moment(date).format('YYYY-MM-DD');

            // Étape 2 : Préparer des requêtes pour récupérer les données agrégées
            const ordersQuery = `
                SELECT
                    shop_id,
                    COUNT(id) AS total_orders_sent,
                    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS total_orders_delivered,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END) AS total_orders_processed,
                    SUM(CASE WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount ELSE 0 END) AS gains_cash,
                    SUM(CASE WHEN status = 'failed_delivery' THEN amount_received ELSE 0 END) AS gains_failed,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN delivery_fee ELSE 0 END) AS total_delivery_fees
                FROM orders WHERE DATE(created_at) = ? GROUP BY shop_id`;
            const [ordersData] = await connection.execute(ordersQuery, [reportDate]);

            const dailyDebtsQuery = `
                SELECT
                    shop_id,
                    SUM(CASE WHEN type = 'storage_fee' OR (COALESCE(type, '') = '' AND comment LIKE 'Frais de stockage%') THEN amount ELSE 0 END) AS total_storage_fees,
                    SUM(CASE WHEN type = 'expedition' OR comment LIKE '%xpédition%' THEN amount ELSE 0 END) AS total_expedition_fees
                FROM debts WHERE DATE(created_at) = ? AND status = 'pending' GROUP BY shop_id`;
            const [dailyDebtsData] = await connection.execute(dailyDebtsQuery, [reportDate]);

            const previousDebtsQuery = `
                SELECT shop_id, SUM(amount) AS total_pending_debts
                FROM debts WHERE status = 'pending' AND DATE(created_at) < ? GROUP BY shop_id`;
            const [previousDebtsData] = await connection.execute(previousDebtsQuery, [reportDate]);

            // Étape 3 : Transformer les résultats en tables de hachage pour un accès rapide
            const ordersMap = new Map(ordersData.map(item => [item.shop_id, item]));
            const dailyDebtsMap = new Map(dailyDebtsData.map(item => [item.shop_id, item]));
            const previousDebtsMap = new Map(previousDebtsData.map(item => [item.shop_id, item]));

            // Étape 4 : Combiner toutes les données pour chaque marchand
            const reports = shops.map(shop => {
                const orderInfo = ordersMap.get(shop.id) || {};
                const dailyDebtInfo = dailyDebtsMap.get(shop.id) || {};
                const previousDebtInfo = previousDebtsMap.get(shop.id) || {};

                const total_packaging_fees = (parseInt(orderInfo.total_orders_processed, 10) || 0) * (shop.bill_packaging ? parseFloat(shop.packaging_price) : 0);
                
                const total_revenue_articles = (parseFloat(orderInfo.gains_cash) || 0) + (parseFloat(orderInfo.gains_failed) || 0);
                const total_delivery_fees = parseFloat(orderInfo.total_delivery_fees) || 0;
                const total_storage_fees = parseFloat(dailyDebtInfo.total_storage_fees) || 0;
                const total_expedition_fees = parseFloat(dailyDebtInfo.total_expedition_fees) || 0;
                const previous_debts = parseFloat(previousDebtInfo.total_pending_debts) || 0;

                const merchantGains = total_revenue_articles;
                const merchantDebts = total_delivery_fees + total_packaging_fees + total_storage_fees + total_expedition_fees + previous_debts;
                const amountToRemit = merchantGains - merchantDebts;
                
                return {
                    shop_id: shop.id,
                    shop_name: shop.name,
                    total_orders_sent: parseInt(orderInfo.total_orders_sent, 10) || 0,
                    total_orders_delivered: parseInt(orderInfo.total_orders_delivered, 10) || 0,
                    total_revenue_articles: total_revenue_articles,
                    total_delivery_fees: total_delivery_fees,
                    total_packaging_fees: total_packaging_fees,
                    total_storage_fees: total_storage_fees,
                    total_expedition_fees: total_expedition_fees,
                    previous_debts: previous_debts,
                    amount_to_remit: amountToRemit,
                };
            });

            return reports;

        } finally {
            connection.release();
        }
    },
    
    findDetailedReport: async (date, shopId) => {
        const connection = await dbConnection.getConnection();
        try {
            const summaryReports = await module.exports.findReportsByDate(date);
            const summary = summaryReports.find(r => r.shop_id == shopId);
            if (!summary) return null;

            const ordersQuery = `
                SELECT
                    o.id, o.delivery_location, o.customer_phone, o.article_amount,
                    o.delivery_fee, o.status, o.amount_received,
                    GROUP_CONCAT(CONCAT(oi.item_name, ' (', oi.quantity, ')') SEPARATOR ', ') as products_list
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.shop_id = ? AND DATE(o.created_at) = ? AND o.status IN ('delivered', 'failed_delivery')
                GROUP BY o.id
                ORDER BY o.created_at ASC;
            `;
            const [orders] = await connection.execute(ordersQuery, [shopId, date]);

            return { ...summary, orders: orders };
        } finally {
            connection.release();
        }
    }
};