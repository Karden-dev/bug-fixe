// src/models/report.model.js
let dbConnection;

module.exports = {
    init: (connection) => { dbConnection = connection; },

    findReportsByDate: async (date) => {
        const query = `
            SELECT 
                s.id as shop_id,
                s.name as shop_name,
                dsb.*
            FROM daily_shop_balances dsb
            JOIN shops s ON dsb.shop_id = s.id
            WHERE dsb.report_date = ?
            ORDER BY dsb.remittance_amount ASC;
        `;
        const [rows] = await dbConnection.execute(query, [date]);
        
        // Renommer la colonne pour la cohérence avec le frontend
        return rows.map(row => ({
            ...row,
            amount_to_remit: row.remittance_amount
        }));
    },
    
    findDetailedReport: async (date, shopId) => {
        const [reportRows] = await dbConnection.execute(
            `SELECT * FROM daily_shop_balances WHERE report_date = ? AND shop_id = ?`,
            [date, shopId]
        );
        
        if (reportRows.length === 0) return null;

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
        const [orders] = await dbConnection.execute(ordersQuery, [shopId, date]);

        return { ...summary, orders: orders };
    }
};