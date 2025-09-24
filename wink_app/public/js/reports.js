// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, startDate, endDate, status } = filters;
    
    // Si aucune date n'est fournie, on ne peut pas calculer un solde cohérent avec les rapports.
    if (!startDate || !endDate) {
        return [];
    }
    
    const params = [
        startDate, endDate, // Pour les gains et frais de la période
        startDate, // Pour les créances antérieures
        startDate, endDate // Pour le filtrage des boutiques actives sur la période
    ];

    let searchQuery = '';
    if (search) {
        searchQuery = ` AND (s.name LIKE ? OR s.payment_name LIKE ? OR s.phone_number_for_payment LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
        SELECT
            s.id AS shop_id,
            s.name AS shop_name,
            s.payment_name,
            s.phone_number_for_payment,
            s.payment_operator,
            COALESCE(period_orders.gains, 0) AS orders_payout_amount,
            COALESCE(period_orders.fees, 0) + COALESCE(previous_debts.total_pending_debts, 0) AS total_debt_amount
        FROM shops s
        LEFT JOIN (
            -- Calcul des gains et frais sur la période sélectionnée
            SELECT
                shop_id,
                SUM(CASE WHEN orders.status = 'delivered' AND orders.payment_status = 'cash' THEN orders.article_amount ELSE 0 END + CASE WHEN orders.status = 'failed_delivery' THEN orders.amount_received ELSE 0 END) as gains,
                SUM(CASE WHEN orders.status IN ('delivered', 'failed_delivery') THEN orders.delivery_fee ELSE 0 END) + SUM(IF(s_inner.bill_packaging, s_inner.packaging_price, 0)) as fees
            FROM orders
            JOIN shops s_inner ON orders.shop_id = s_inner.id
            WHERE DATE(orders.created_at) BETWEEN ? AND ?
            GROUP BY shop_id
        ) AS period_orders ON s.id = period_orders.shop_id
        LEFT JOIN (
            -- Calcul des dettes (y compris stockage) accumulées AVANT la période
            SELECT shop_id, SUM(amount) AS total_pending_debts
            FROM debts
            WHERE status = 'pending' AND DATE(created_at) < ?
            GROUP BY shop_id
        ) AS previous_debts ON s.id = previous_debts.shop_id
        WHERE s.status = 'actif'
        AND s.id IN (
            -- On affiche seulement les marchands ayant eu une activité (commande ou dette) sur la période
            SELECT DISTINCT shop_id FROM orders WHERE DATE(orders.created_at) BETWEEN ? AND ?
        )
        ${searchQuery}
        ORDER BY s.name ASC
    `;

    const [shops] = await dbConnection.execute(query, params);

    const remittances = shops.map(shop => {
        const totalGains = parseFloat(shop.orders_payout_amount);
        const totalDebts = parseFloat(shop.total_debt_amount);
        const amountToRemit = totalGains - totalDebts;

        return {
            ...shop,
            total_payout_amount: amountToRemit,
            status: amountToRemit > 0 ? 'pending' : 'paid'
        };
    }).filter(shop => shop.total_payout_amount > 0.01); // On affiche que les soldes positifs
    
    if (status) {
        return remittances.filter(rem => rem.status === status);
    }
    
    return remittances;
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
