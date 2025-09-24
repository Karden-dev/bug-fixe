// src/controllers/remittances.controller.js
const remittanceModel = require('../models/remittance.model');
const reportModel = require('../models/report.model'); // <-- NOUVEAU: On importe le modèle des rapports
const remittancesService = require('../services/remittances.service');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');

const getRemittances = async (req, res) => {
    try {
        const { startDate, endDate, search, status } = req.query;

        // Puisque chaque jour est indépendant, nous utilisons la date de fin pour le rapport.
        // Si l'utilisateur choisit une plage, nous prenons le dernier jour de la plage.
        const reportDate = endDate || moment().format('YYYY-MM-DD');

        // *** LA CORRECTION PRINCIPALE EST ICI ***
        // On appelle la même fonction que la page des rapports pour obtenir les données.
        let reports = await reportModel.findReportsByDate(reportDate);

        // On filtre les résultats pour ne garder que ceux qui ont un montant à verser positif.
        let remittances = reports.filter(r => r.amount_to_remit > 0).map(r => ({
            shop_id: r.shop_id,
            shop_name: r.shop_name,
            total_payout_amount: r.amount_to_remit,
            // On ajoute les infos de paiement nécessaires pour l'affichage
            payment_name: r.payment_name,
            phone_number_for_payment: r.phone_number_for_payment,
            payment_operator: r.payment_operator,
            status: 'pending' // Par défaut, si un montant est dû, le statut est en attente
        }));
        
        // On applique les filtres de recherche si nécessaire
        if (search) {
            remittances = remittances.filter(r => 
                r.shop_name.toLowerCase().includes(search.toLowerCase()) ||
                (r.payment_name && r.payment_name.toLowerCase().includes(search.toLowerCase()))
            );
        }
        
        // On applique le filtre de statut (même si ici ce sera toujours 'pending')
        if (status) {
            remittances = remittances.filter(r => r.status === status);
        }


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

// ... Le reste des fonctions du contrôleur reste identique ...

const getRemittanceDetails = async (req, res) => {
    try {
        const { shopId } = req.params;
        const details = await remittanceModel.getShopDetails(shopId);
        res.json(details);
    } catch (error) {
        console.error("Erreur lors de la récupération des détails du versement:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails', error: error.message });
    }
};

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

const updateShopPaymentDetails = async (req, res) => {
    try {
        const { shopId } = req.params;
        const paymentData = req.body;
        await remittanceModel.updateShopPaymentDetails(shopId, paymentData);
        res.status(200).json({ message: 'Détails de paiement mis à jour avec succès.' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour des détails de paiement:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des détails', error: error.message });
    }
};

const exportPdf = async (req, res) => {
    // ... cette fonction reste inchangée
};


module.exports = {
    getRemittances,
    getRemittanceDetails,
    recordRemittance,
    updateShopPaymentDetails,
    exportPdf
};
