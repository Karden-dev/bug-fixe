// src/controllers/remittances.controller.js
const remittanceModel = require('../models/remittance.model');
const remittancesService = require('../services/remittances.service');

const getRemittances = async (req, res) => {
    try {
        const filters = req.query;
        const remittances = await remittanceModel.findForRemittance(filters);

        const stats = {
            orangeMoneyTotal: 0,
            orangeMoneyTransactions: 0,
            mtnMoneyTotal: 0,
            mtnMoneyTransactions: 0,
            totalRemittanceAmount: 0,
            totalTransactions: remittances.length
        };

        remittances.forEach(rem => {
            if (rem.payment_operator === 'Orange Money') {
                stats.orangeMoneyTotal += rem.total_payout_amount;
                stats.orangeMoneyTransactions++;
            } else if (rem.payment_operator === 'MTN Mobile Money') {
                stats.mtnMoneyTotal += rem.total_payout_amount;
                stats.mtnMoneyTransactions++;
            }
            stats.totalRemittanceAmount += rem.total_payout_amount;
        });

        res.json({ remittances, stats });
    } catch (error) {
        console.error("Erreur lors de la récupération des versements:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des versements', error: error.message });
    }
};

// ... Les autres fonctions (recordRemittance, etc.) restent identiques ...

const recordRemittance = async (req, res) => {
    try {
        const { shopId, amount, paymentOperator, status, transactionId, comment, userId } = req.body;
        if (!shopId || !amount || !status || !userId) {
            return res.status(400).json({ message: "Les champs shopId, amount, status et userId sont requis." });
        }
        await remittancesService.recordRemittance(shopId, amount, paymentOperator, status, transactionId, comment, userId);
        res.status(201).json({ message: "Versement enregistré avec succès." });
    } catch (error) {
        console.error("Erreur lors de l'enregistrement du versement:", error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement du versement', error: error.message });
    }
};

// ... etc
module.exports = {
    getRemittances,
    getRemittanceDetails: remittanceModel.getShopDetails, // On peut simplifier comme ça
    recordRemittance,
    updateShopPaymentDetails: remittanceModel.updateShopPaymentDetails,
};
