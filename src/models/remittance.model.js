// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, startDate, endDate, status } = filters;
    const params = [];

    let query = `
        SELECT
            r.id,
            s.id AS shop_id,
            s.name AS shop_name,
            s.payment_name,
            s.phone_number_for_payment,
            s.payment_operator, /* CORRECTION: On prend l'opérateur de la table shops */
            r.amount,
            r.status,
            r.payment_date,
            r.transaction_id,
            r.comment,
            u.name as user_name
        FROM remittances r
        JOIN shops s ON r.shop_id = s.id
        LEFT JOIN users u ON r.user_id = u.id
    `;

    let whereClause = ` WHERE 1=1 `;

    if (search) {
        whereClause += ` AND (s.name LIKE ? OR s.payment_name LIKE ? OR s.phone_number_for_payment LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (startDate) {
        whereClause += ` AND r.payment_date >= ?`;
        params.push(moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
    
    if (endDate) {
        whereClause += ` AND r.payment_date <= ?`;
        params.push(moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss'));
    }
    
    if (status) {
        whereClause += ` AND r.status = ?`;
        params.push(status);
    }

    query += whereClause + ` ORDER BY r.payment_date DESC`;
    const [rows] = await dbConnection.execute(query, params);
    return rows;
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
             `SELECT COALESCE(SUM(CASE WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount - delivery_fee WHEN status = 'delivered' AND payment_status = 'paid_to_supplier' THEN -delivery_fee WHEN status = 'failed_delivery' THEN amount_received - delivery_fee ELSE 0 END), 0) AS orders_payout_amount FROM orders WHERE shop_id = ? AND (status IN ('delivered', 'failed_delivery'))`,
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
    return result;
};

const markAsPaid = async (remittanceId, userId) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT shop_id FROM remittances WHERE id = ?', [remittanceId]);
        if (rows.length === 0) {
            throw new Error('Versement non trouvé.');
        }
        const shopId = rows[0].shop_id;
        const [updateResult] = await connection.execute(
            'UPDATE remittances SET status = ?, updated_at = NOW(), user_id = ? WHERE id = ? AND status = ?',
            ['paid', userId, remittanceId, 'pending']
        );
        if (updateResult.affectedRows > 0) {
            await connection.execute('UPDATE debts SET status = "paid", settled_at = NOW(), updated_by = ? WHERE shop_id = ? AND status = "pending"', [userId, shopId]);
        }
        await connection.commit();
        return updateResult;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    init,
    findForRemittance,
    getShopDetails,
    updateShopPaymentDetails,
    recordRemittance,
    markAsPaid
};