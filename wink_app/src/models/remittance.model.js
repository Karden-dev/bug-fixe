// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, startDate, endDate, status } = filters;
    
    // On réutilise la même logique de calcul que pour les rapports journaliers
    const dateFilterParams = [
        moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
    ];
    
    const previousDebtsDate = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    
    const params = [...dateFilterParams, ...dateFilterParams, previousDebtsDate];

    let query = `
        SELECT
            s.id AS shop_id,
            s.name AS shop_name,
            s.payment_name AS payment_name,
            s.phone_number_for_payment AS phone_number_for_payment,
            s.payment_operator AS payment_operator,
            COALESCE(todays_orders.gains_cash, 0) AS total_revenue_articles_cash,
            COALESCE(todays_orders.gains_failed, 0) AS total_revenue_articles_failed,
            COALESCE(todays_debts.total_delivery_fees, 0) AS total_delivery_fees,
            COALESCE(todays_debts.packaging_fee_today, 0) AS total_packaging_fees,
            COALESCE(todays_debts.storage_fee_today, 0) AS total_storage_fees,
            COALESCE(todays_debts.expedition_fee_today, 0) AS total_expedition_fees,
            COALESCE(previous_debts.total_pending_debts, 0) AS previous_debts
        FROM shops s
        LEFT JOIN (
            SELECT
                shop_id,
                SUM(CASE WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount ELSE 0 END) AS gains_cash,
                SUM(CASE WHEN status = 'failed_delivery' THEN amount_received ELSE 0 END) AS gains_failed
            FROM orders
            WHERE created_at BETWEEN ? AND ?
            GROUP BY shop_id
        ) AS todays_orders ON s.id = todays_orders.shop_id
        LEFT JOIN (
            SELECT
                shop_id,
                SUM(CASE WHEN type = 'packaging' THEN amount ELSE 0 END) AS packaging_fee_today,
                SUM(CASE WHEN type = 'storage_fee' THEN amount ELSE 0 END) AS storage_fee_today,
                SUM(CASE WHEN type = 'expedition' THEN amount ELSE 0 END) AS expedition_fee_today,
                SUM(CASE WHEN type = 'delivery_fee' THEN amount ELSE 0 END) AS total_delivery_fees
            FROM debts
            WHERE created_at BETWEEN ? AND ? AND status = 'pending'
            GROUP BY shop_id
        ) AS todays_debts ON s.id = todays_debts.shop_id
        LEFT JOIN (
            SELECT shop_id, SUM(amount) AS total_pending_debts
            FROM debts
            WHERE status = 'pending' AND created_at < ?
            GROUP BY shop_id
        ) AS previous_debts ON s.id = previous_debts.shop_id
    `;
    
    let whereClause = ` WHERE 1=1 `;
    
    if (search) {
        whereClause += ` AND (s.name LIKE ? OR s.payment_name LIKE ? OR s.phone_number_for_payment LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += whereClause + ` GROUP BY s.id ORDER BY s.name ASC`;
    const [shops] = await dbConnection.execute(query, params);

    const remittancesWithStatus = shops.map(shop => {
        const merchantGains = parseFloat(shop.total_revenue_articles_cash) + parseFloat(shop.total_revenue_articles_failed);
        const merchantDebts = parseFloat(shop.total_delivery_fees) + parseFloat(shop.total_packaging_fees) + parseFloat(shop.total_storage_fees) + parseFloat(shop.total_expedition_fees) + parseFloat(shop.previous_debts);
        const currentBalance = merchantGains - merchantDebts;

        let shopStatus;
        if (currentBalance > 0) {
            shopStatus = 'pending';
        } else if (currentBalance === 0) {
            shopStatus = 'paid';
        } else if (currentBalance < 0) {
            shopStatus = 'partially_paid';
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
                COALESCE(SUM(
                    CASE
                        WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount - delivery_fee
                        WHEN status = 'delivered' AND payment_status = 'paid_to_supplier' THEN -delivery_fee
                        WHEN status = 'failed_delivery' THEN amount_received - delivery_fee
                        ELSE 0
                    END
                ), 0) AS orders_payout_amount
            FROM orders
            WHERE shop_id = ? AND (status IN ('delivered', 'failed_delivery'))
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