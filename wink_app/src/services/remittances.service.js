// src/services/remittances.service.js
const moment = require('moment');

let dbConnection;

const init = (connection) => { 
    dbConnection = connection;
};

// NOTE: Les fonctions calculateShopPayoutAmount et markDebtsAsPaid ne sont plus nécessaires ici
// car la nouvelle logique de calcul est centralisée dans le modèle.

const recordRemittance = async (shopId, amount, paymentOperator, status, transactionId = null, comment = null, userId) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();

        // On se contente d'insérer l'enregistrement du versement. C'est tout.
        const remittanceQuery = 'INSERT INTO remittances (shop_id, amount, payment_date, payment_operator, status, transaction_id, comment, user_id) VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)';
        const [result] = await connection.execute(remittanceQuery, [shopId, amount, paymentOperator, status, transactionId, comment, userId]);
        
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    init,
    recordRemittance,
};
