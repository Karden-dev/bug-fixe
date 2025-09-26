// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, startDate, endDate, status } = filters;
    const connection = await dbConnection.getConnection();
    
    try {
        const startOfDay = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const endOfDay = moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
        const previousDebtsDate = moment(startDate).format('YYYY-MM-DD');

        let query = `
            SELECT
                s.id AS shop_id, s.name AS shop_name, s.payment_name, s.phone_number_for_payment, s.payment_operator,
                COALESCE(period_orders.total_remittance_from_orders, 0) AS total_remittance_from_orders,
                (COALESCE(period_orders.total_orders_processed, 0) * IF(s.bill_packaging, s.packaging_price, 0)) AS total_packaging_fees,
                COALESCE(period_debts.storage_fee_period, 0) AS total_storage_fees,
                COALESCE(previous_debts.total_pending_debts, 0) AS previous_debts,
                COALESCE(remittances_paid.total_remitted, 0) AS total_remitted_amount
            FROM shops s
            LEFT JOIN (
                SELECT 
                    shop_id, 
                    SUM(remittance_amount) as total_remittance_from_orders,
                    SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END) AS total_orders_processed
                FROM orders WHERE created_at BETWEEN ? AND ? 
                GROUP BY shop_id
            ) AS period_orders ON s.id = period_orders.shop_id
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS storage_fee_period
                FROM debts WHERE type = 'storage_fee' AND created_at BETWEEN ? AND ? AND status = 'pending' 
                GROUP BY shop_id
            ) AS period_debts ON s.id = period_debts.shop_id
            LEFT JOIN (
                SELECT shop_id, SUM(amount) AS total_pending_debts
                FROM debts WHERE status = 'pending' AND DATE(created_at) < ? 
                GROUP BY shop_id
            ) AS previous_debts ON s.id = previous_debts.shop_id
            LEFT JOIN (
                SELECT shop_id, COALESCE(SUM(amount), 0) as total_remitted 
                FROM remittances WHERE status IN ('paid', 'partially_paid') 
                GROUP BY shop_id
            ) AS remittances_paid ON s.id = remittances_paid.shop_id
            WHERE s.status = 'actif'
        `;

        const params = [startOfDay, endOfDay, startOfDay, endOfDay, previousDebtsDate];

        if (search) {
            query += ` AND (s.name LIKE ? OR s.payment_name LIKE ? OR s.phone_number_for_payment LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ` GROUP BY s.id ORDER BY s.name ASC`;

        const [shops] = await connection.execute(query, params);

        const remittancesWithStatus = shops.map(shop => {
            const totalRemittanceFromOrders = parseFloat(shop.total_remittance_from_orders);
            const otherDebts = parseFloat(shop.total_packaging_fees) + parseFloat(shop.total_storage_fees) + parseFloat(shop.previous_debts);
            const totalRemitted = parseFloat(shop.total_remitted_amount);

            const currentBalance = (totalRemittanceFromOrders - otherDebts) - totalRemitted;

            let shopStatus;
            if (currentBalance > 0.01) {
                shopStatus = 'pending';
            } else if (currentBalance < -0.01) {
                shopStatus = 'partially_paid';
            } else {
                shopStatus = 'paid';
            }

            return {
                ...shop,
                total_payout_amount: currentBalance,
                status: shopStatus
            };
        });

        if (status) {
            return remittancesWithStatus.filter(shop => shop.status === status);
        }
        
        return remittancesWithStatus;
    } finally {
        connection.release();
    }
};

const getShopDetails = async (shopId) => {
    const connection = await dbConnection.getConnection();
    try {
        const [remittances] = await connection.execute(
            'SELECT * FROM remittances WHERE shop_id = ? ORDER BY payment_date DESC',
            [shopId]
        );

        const [debts] = await connection.execute(
            'SELECT * FROM debts WHERE shop_id = ? AND status = "pending" ORDER BY created_at DESC',
            [shopId]
        );
        
        const [ordersPayout] = await connection.execute(
             `
             SELECT
                COALESCE(SUM(remittance_amount), 0) AS orders_payout_amount
            FROM orders
            WHERE shop_id = ?
             `,
             [shopId]
        );
        const ordersPayoutAmount = ordersPayout[0].orders_payout_amount || 0;

        const totalDebt = debts.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
        const totalRemitted = remittances.reduce((sum, rem) => sum + parseFloat(rem.amount), 0);
        const currentBalance = ordersPayoutAmount - totalDebt - totalRemitted;

        return { remittances, debts, currentBalance };
    } finally {
        connection.release();
    }
};

const updateShopPaymentDetails = async (shopId, paymentData) => {
    const { payment_name, phone_number_for_payment, payment_operator } = paymentData;
    const query = 'UPDATE shops SET payment_name = ?, phone_number_for_payment = ?, payment_operator = ? WHERE id = ?';
    const [result] = await dbConnection.execute(query, [payment_name, phone_number_for_payment, payment_operator, shopId]);
    return result;
};

const recordRemittance = async (shopId, amount, paymentOperator, status, transactionId = null, comment = null, userId) => {
    const query = 'INSERT INTO remittances (shop_id, amount, payment_date, payment_operator, status, transaction_id, comment, user_id) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)';
    const [result] = await dbConnection.execute(query, [shopId, amount, paymentOperator, status, transactionId, comment, userId]);
    
    if (status === 'paid') {
        await dbConnection.execute('UPDATE debts SET status = "paid" WHERE shop_id = ? AND status = "pending"', [shopId]);
    }

    return result;
};

module.exports = {
    init,
    findForRemittance,
    getShopDetails,
    updateShopPaymentDetails,
    recordRemittance,
};