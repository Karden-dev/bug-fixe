// src/models/remittance.model.js
const moment = require('moment');

let dbConnection;

const init = (connection) => {
    dbConnection = connection;
};

const findForRemittance = async (filters = {}) => {
    const { search, startDate, endDate, status } = filters;
    
    if (!startDate || !endDate) {
        return [];
    }
    
    let params = [
        startDate, endDate, // Pour le filtrage des boutiques actives sur la période
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
            COALESCE(payouts.total_orders_payout, 0) AS orders_payout_amount,
            COALESCE(debts.total_debt, 0) AS total_debt_amount,
            COALESCE(remittances_info.has_partial_payment, 0) AS has_partial_payment
        FROM shops s
        LEFT JOIN (
            -- Calcule le gain net total de TOUTES les commandes du marchand
            SELECT 
                shop_id, 
                SUM(
                    CASE
                        WHEN status = 'delivered' AND payment_status = 'cash' THEN article_amount - delivery_fee
                        WHEN status = 'delivered' AND payment_status = 'paid_to_supplier' THEN -delivery_fee
                        WHEN status = 'failed_delivery' THEN amount_received - delivery_fee
                        ELSE 0
                    END
                ) AS total_orders_payout
            FROM orders
            GROUP BY shop_id
        ) AS payouts ON s.id = payouts.shop_id
        LEFT JOIN (
            -- Calcule la somme de TOUTES les dettes (positives et négatives/crédits)
            SELECT shop_id, SUM(amount) AS total_debt
            FROM debts
            GROUP BY shop_id
        ) AS debts ON s.id = debts.shop_id
        LEFT JOIN (
            -- Vérifie si un paiement partiel a déjà été effectué
            SELECT shop_id, 1 AS has_partial_payment FROM remittances WHERE status = 'partially_paid' GROUP BY shop_id
        ) AS remittances_info ON s.id = remittances_info.shop_id
        WHERE s.status = 'actif'
        AND s.id IN (
            -- On affiche seulement les marchands ayant eu une activité de commande sur la période
            SELECT DISTINCT shop_id FROM orders WHERE DATE(created_at) BETWEEN ? AND ?
        )
        ${searchQuery}
        ORDER BY s.name ASC
    `;

    const [shops] = await dbConnection.execute(query, params);

    let remittances = shops.map(shop => {
        const totalOrdersPayout = parseFloat(shop.orders_payout_amount);
        const totalDebt = parseFloat(shop.total_debt_amount);
        const amountToRemit = totalOrdersPayout - totalDebt;

        let shopStatus;
        if (amountToRemit < 1) { // Si le solde est 0 ou négatif, c'est réglé
            shopStatus = 'paid';
        } else if (shop.has_partial_payment) {
            shopStatus = 'partially_paid';
        } else {
            shopStatus = 'pending';
        }

        return {
            ...shop,
            total_payout_amount: amountToRemit,
            status: shopStatus
        };
    }).filter(shop => shop.total_payout_amount > 0); // On affiche que les soldes positifs à verser
    
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
