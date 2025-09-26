// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, status } = filters;
    
    let query = `
        SELECT
            r.id,
            r.amount,
            r.status,
            r.remittance_date,
            s.id AS shop_id,
            s.name AS shop_name,
            s.payment_name,
            s.phone_number_for_payment,
            s.payment_operator
        FROM remittances r
        JOIN shops s ON r.shop_id = s.id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND (s.name LIKE ? OR s.payment_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
        query += ` AND r.status = ?`;
        params.push(status);
    }
    
    query += ` ORDER BY r.remittance_date DESC, s.name ASC`;
    const [rows] = await dbConnection.execute(query, params);
    
    // Le mapping est important pour la cohérence avec le nom de champ attendu par le frontend
    return rows.map(row => ({ 
        ...row, 
        total_payout_amount: row.amount 
    }));
};

const updateRemittanceStatus = async (remittanceId, status, userId) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();

        const [remittance] = await connection.execute('SELECT shop_id FROM remittances WHERE id = ?', [remittanceId]);
        if (remittance.length === 0) throw new Error('Versement non trouvé.');
        
        await connection.execute(
            'UPDATE remittances SET status = ?, payment_date = CURDATE(), user_id = ? WHERE id = ?',
            [status, userId, remittanceId]
        );
        
        if (status === 'paid') {
            await connection.execute('UPDATE debts SET status = "paid" WHERE shop_id = ? AND status = "pending"', [remittance[0].shop_id]);
        }
        
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
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
        
        const [balanceResult] = await connection.execute(
             `SELECT SUM(remittance_amount) as total_balance FROM daily_shop_balances WHERE shop_id = ?`,
             [shopId]
        );
        const currentBalance = balanceResult[0]?.total_balance || 0;

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


module.exports = {
    init,
    findForRemittance,
    updateRemittanceStatus,
    getShopDetails,
    updateShopPaymentDetails
};