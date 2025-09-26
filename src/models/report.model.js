// src/models/report.model.js
let dbConnection;

module.exports = {
    init: (connection) => { dbConnection = connection; },

    findReportsByDate: async (date) => {
        const query = `
            SELECT 
                s.id as shop_id,
                s.name as shop_name,
                dsb.total_orders_sent,
                dsb.total_orders_delivered,
                dsb.total_revenue_articles,
                (dsb.total_delivery_fees + dsb.total_expedition_fees) as total_delivery_fees,
                dsb.previous_debts,
                dsb.remittance_amount as amount_to_remit
            FROM daily_shop_balances dsb
            JOIN shops s ON dsb.shop_id = s.id
            WHERE dsb.report_date = ?
            ORDER BY dsb.remittance_amount ASC;
        `;
        const [rows] = await dbConnection.execute(query, [date]);
        return rows;
    },
    
    findDetailedReport: async (date, shopId) => {
        const connection = await dbConnection.getConnection();
        try {
            // REQUÊTE CORRIGÉE : On liste explicitement chaque champ pour éviter les conflits
            const reportQuery = `
                SELECT
                    s.name AS shop_name,
                    dsb.total_orders_sent,
                    dsb.total_orders_delivered,
                    dsb.total_revenue_articles,
                    dsb.total_delivery_fees,
                    dsb.total_expedition_fees,
                    dsb.total_packaging_fees,
                    dsb.total_storage_fees,
                    dsb.previous_debts,
                    dsb.remittance_amount
                FROM daily_shop_balances dsb
                JOIN shops s ON dsb.shop_id = s.id
                WHERE dsb.report_date = ? AND dsb.shop_id = ?
            `;
            const [reportRows] = await connection.execute(reportQuery, [date, shopId]);
            
            if (reportRows.length === 0) return null;

            // On s'assure que le nom 'amount_to_remit' est bien présent pour la cohérence
            const summary = { ...reportRows[0], amount_to_remit: reportRows[0].remittance_amount };

            const ordersQuery = `
                SELECT
                    o.id, o.delivery_location, o.customer_phone, o.article_amount,
                    o.delivery_fee, o.status, o.amount_received,
                    GROUP_CONCAT(CONCAT(oi.item_name, ' (', oi.quantity, ')') SEPARATOR ', ') as products_list
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.shop_id = ? AND DATE(o.created_at) = ?
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