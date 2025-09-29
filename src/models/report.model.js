// src/models/report.model.js
const moment = require('moment');

let dbConnection;

module.exports = {
    init: (connection) => { dbConnection = connection; },

    findReportsByDate: async (date) => {
        const connection = await dbConnection.getConnection();
        try {
            const query = `
                SELECT
                    dsb.shop_id,
                    s.name as shop_name,
                    dsb.total_orders_sent,
                    dsb.total_orders_delivered,
                    dsb.total_revenue_articles,
                    dsb.total_delivery_fees,
                    dsb.total_expedition_fees,
                    dsb.total_packaging_fees,
                    dsb.total_storage_fees,
                    dsb.remittance_amount
                FROM shops s
                JOIN daily_shop_balances dsb ON s.id = dsb.shop_id
                WHERE dsb.report_date = ?
                  AND dsb.remittance_amount != 0
                ORDER BY s.name ASC;
            `;
            const [rows] = await connection.execute(query, [date]);
            
            return rows.map(row => ({ 
                ...row, 
                amount_to_remit: row.remittance_amount 
            }));
        } finally {
            connection.release();
        }
    },
    
    findDetailedReport: async (date, shopId) => {
        const connection = await dbConnection.getConnection();
        try {
            const [summaries] = await connection.execute(
                `SELECT dsb.*, s.name as shop_name 
                 FROM daily_shop_balances dsb
                 JOIN shops s ON s.id = dsb.shop_id 
                 WHERE dsb.report_date = ? AND dsb.shop_id = ?`, 
                [date, shopId]
            );
            const summary = summaries[0];
            if (!summary) return null;
            
            summary.amount_to_remit = summary.remittance_amount;

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