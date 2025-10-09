// src/controllers/rider.controller.js
const riderModel = require('../models/rider.model'); // NOUVEAU: Import du modèle spécifique aux livreurs
const cashModel = require('../models/cash.model');
const cashService = require('../services/cash.service');

const getRiderOrders = async (req, res) => {
    try {
        // LOG DE DÉBOGAGE: Vérifie si req.user existe
        console.log("LOG: Tentative de récupération des commandes pour l'utilisateur ID:", req.user?.id); 
        
        const riderId = req.user.id;
        const filters = {
            deliverymanId: riderId,
            status: req.query.status,
            search: req.query.search,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        // CORRECTION DE L'APPEL: Utilise riderModel.findRiderOrders
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
        res.status(500).json({ message: 'Erreur serveur lors du calcul du solde.' });
    }
};

const getRiderCashTransactions = async (req, res) => {
    try {
        const { riderId } = req.params;
        // NOTE: L'appel à cashModel reste correct ici
        const transactions = await cashModel.findTransactionsForRider(riderId);
        res.status(200).json(transactions);
    } catch (error) {
        console.error("Erreur (GET /rider/cash-transactions):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des transactions.' });
    }
};

const submitRemittance = async (req, res) => {
    try {
        const riderId = req.user.id;
        const { amount, comment } = req.body;
        if (!riderId || !amount) {
            return res.status(400).json({ message: 'Le livreur et le montant sont requis.' });
        }
        // NOTE: L'appel à cashModel reste correct ici
        await cashModel.create({
            user_id: riderId,
            type: 'remittance',
            amount: amount,
            comment: comment,
            status: 'pending'
        });
        res.status(201).json({ message: 'Versement en attente de validation par l\'administrateur.' });
    } catch (error) {
        console.error("Erreur (POST /rider/remittance):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la soumission du versement.' });
    }
};

const getOrdersCounts = async (req, res) => {
    try {
        // LOG DE DÉBOGAGE: Vérifie si req.user existe avant d'accéder à .id
        console.log("LOG: Tentative de récupération des compteurs pour l'utilisateur ID:", req.user?.id);
        
        const riderId = req.user.id;
        // CORRECTION DE L'APPEL: Utilise riderModel.getOrdersCounts
        const counts = await riderModel.getOrdersCounts(riderId);
        res.status(200).json(counts);
    } catch (error) {
        console.error("Erreur (GET /rider/counts):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération des compteurs.' });
    }
};

// NOUVEAU CONTRÔLEUR: Récupère les notifications
const getRiderNotifications = async (req, res) => {
    try {
        console.log("LOG: Tentative de récupération des notifications pour l'utilisateur ID:", req.user?.id);
        const riderId = req.user.id;
        
        const notifications = await riderModel.findRiderNotifications(riderId);
        
        // La logique frontend met à jour le badge et la liste
        // On renvoie un nombre simple (le total) pour le badge
        const unreadCount = notifications.length; 
        
        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        console.error("Erreur (GET /rider/notifications):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
    }
};


module.exports = {
  getRiderOrders,
  getRiderOwedAmount,
  getRiderCashTransactions,
  submitRemittance,
  getOrdersCounts,
  getRiderNotifications, // NOUVEAU: Export du contrôleur de notifications
};