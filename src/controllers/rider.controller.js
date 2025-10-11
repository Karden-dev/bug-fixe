// src/controllers/rider.controller.js
const riderModel = require('../models/rider.model');
const ridersCashModel = require('../models/riderscash.model');
const cashService = require('../services/cash.service');
const CashTransaction = require('../models/cash.model');

const getRiderOrders = async (req, res) => {
    try {
        const riderId = req.user.id;
        const filters = {
            deliverymanId: riderId,
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const orders = await riderModel.findRiderOrders(filters);
        res.status(200).json(orders);
    } catch (error) {
        console.error("Erreur (GET /rider/orders):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des commandes.' });
    }
};

const getRiderOwedAmount = async (req, res) => {
    try {
        const { riderId } = req.params;
        const owedAmount = await cashService.getDeliverymanOwedAmount(riderId);
        res.status(200).json({ owedAmount });
    } catch (error) {
        console.error("Erreur (GET /rider/cash-owed):", error);
        res.status(500).json({ message: 'Erreur lors du calcul du montant dû.' });
    }
};

const getRiderCashTransactions = async (req, res) => {
    try {
        const { riderId } = req.params;
        const transactions = await CashTransaction.findByUserId(riderId);
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Erreur (GET /rider/cash-transactions):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions.' });
    }
};

const submitRemittance = async (req, res) => {
    try {
        const { riderId, amount, comment } = req.body;
        const transaction = await cashService.recordRemittance(riderId, amount, comment);
        res.status(201).json(transaction);
    } catch (error) {
        console.error("Erreur (POST /rider/remittance):", error);
        res.status(500).json({ message: 'Erreur lors de la soumission du versement.' });
    }
};

const getOrdersCounts = async (req, res) => {
    try {
        const riderId = req.user.id;
        const counts = await riderModel.getOrdersCounts(riderId);
        res.status(200).json(counts);
    } catch (error) {
        console.error("Erreur (GET /rider/counts):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des compteurs.' });
    }
};

const getRiderNotifications = async (req, res) => {
    try {
        // La logique de notification est temporairement désactivée comme demandé.
        res.status(200).json([]);
    } catch (error) {
        console.error("Erreur (GET /rider/notifications):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
    }
};

const getRiderCashPageDetails = async (req, res) => {
    try {
        const riderId = req.user.id;
        const date = req.query.date || new Date(); 
        
        const { summary: rawSummary, transactions: rawTransactions } = await ridersCashModel.getRiderCashDetails(riderId, date);
        
        // La logique de calcul complexe est maintenant dans le modèle.
        // Ce contrôleur assemble et trie simplement les résultats.

        const allTransactions = [
            ...rawTransactions.orders, 
            ...rawTransactions.expenses, 
            ...rawTransactions.shortfalls
        ].sort(
            (a, b) => new Date(b.event_date) - new Date(a.event_date) // Tri du plus récent au plus ancien
        );

        // --- Calcul du résumé final ---
        // Le `totalOrdersAmount` inclut maintenant les montants positifs et négatifs (expéditions)
        const amountExpected = parseFloat(rawSummary.totalOrdersAmount) - parseFloat(rawSummary.totalRemittances);
        const amountConfirmed = parseFloat(rawSummary.totalRemittances) - parseFloat(rawSummary.totalPendingShortfalls);

        const finalSummary = {
            amountExpected: amountExpected,
            amountConfirmed: amountConfirmed,
            totalExpenses: rawSummary.totalExpenses
        };

        res.status(200).json({ summary: finalSummary, transactions: allTransactions });

    } catch (error) {
        console.error("Erreur (GET /rider/cash-details):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails de la caisse.' });
    }
};

module.exports = {
    getRiderOrders,
    getRiderOwedAmount,
    getRiderCashTransactions,
    submitRemittance,
    getOrdersCounts,
    getRiderNotifications,
    getRiderCashPageDetails
};