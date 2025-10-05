// src/controllers/cash.controller.js
const cashModel = require('../models/cash.model');
const cashService = require('../services/cash.service'); 
// NOUVEL IMPORT
const cashClosingService = require('../services/cash.closing.service'); 
const { Parser } = require('json2csv');
const moment = require('moment');

const formatAmount = (amount) => `${parseInt(amount || 0).toLocaleString('fr-FR')} FCFA`;

const getTransactions = async (req, res) => {
    try {
        const filters = {
            type: req.query.type || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            search: req.query.search || null
        };
        const transactions = await cashModel.findAll(filters);
        res.json(transactions);
    } catch (error) {
        console.error("Erreur getTransactions:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des transactions." });
    }
};

const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, comment } = req.body;
        if (amount === undefined || amount === null) {
            return res.status(400).json({ message: "Le montant est requis." });
        }
        await cashModel.update(id, { amount: -Math.abs(parseFloat(amount)), comment });
        res.json({ message: "Transaction mise à jour avec succès." });
    } catch (error) {
        console.error("Erreur updateTransaction:", error);
        res.status(500).json({ message: "Erreur lors de la mise à jour de la transaction." });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        await cashModel.remove(id);
        res.json({ message: "Transaction supprimée avec succès." });
    } catch (error) {
        console.error("Erreur deleteTransaction:", error);
        res.status(500).json({ message: "Erreur lors de la suppression de la transaction." });
    }
};

const getExpenseCategories = async (req, res) => {
    try {
        const categories = await cashModel.getExpenseCategories();
        res.json(categories);
    } catch (error) {
        console.error("Erreur getExpenseCategories:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des catégories." });
    }
};

const createExpense = async (req, res) => {
    try {
        const { user_id, category_id, amount, comment, created_at } = req.body;
        if (!user_id || !category_id || amount === undefined || amount === null) {
            return res.status(400).json({ message: "Tous les champs (utilisateur, catégorie, montant) sont requis." });
        }
        const transactionData = { user_id, type: 'expense', category_id, amount: -Math.abs(parseFloat(amount)), comment, created_at };
        await cashModel.create(transactionData);
        res.status(201).json({ message: "Dépense enregistrée avec succès." });
    } catch (error) {
        console.error("Erreur createExpense:", error);
        res.status(500).json({ message: "Erreur serveur lors de l'enregistrement de la dépense." });
    }
};

const createManualWithdrawal = async (req, res) => {
    try {
        const { amount, comment, user_id, created_at } = req.body;
        if (amount === undefined || amount === null || !user_id) {
            return res.status(400).json({ message: "Le montant et l'ID de l'utilisateur sont requis." });
        }
        const transactionData = { user_id, type: 'manual_withdrawal', amount: -Math.abs(parseFloat(amount)), comment, created_at, category_id: null };
        await cashModel.create(transactionData);
        res.status(201).json({ message: "Décaissement enregistré avec succès." });
    } catch (error) {
        console.error("Erreur createManualWithdrawal:", error);
        res.status(500).json({ message: "Erreur serveur lors du décaissement." });
    }
};

const getRemittanceSummary = async (req, res) => {
    try {
        const { startDate, endDate, search } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "La période (startDate, endDate) est requise." });
        }
        const summary = await cashModel.findRemittanceSummary(startDate, endDate, search);
        res.json(summary);
    } catch (error) {
        console.error("Erreur getRemittanceSummary:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération du résumé des versements." });
    }
};

const getRemittanceDetails = async (req, res) => {
    try {
        const { deliverymanId } = req.params;
        const { startDate, endDate } = req.query;
        const details = await cashModel.findRemittanceDetails(deliverymanId, startDate, endDate);
        res.json(details);
    } catch (error) {
        console.error("Erreur getRemittanceDetails:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des détails." });
    }
};

const updateRemittance = async (req, res) => {
    try {
        const { id } = req.params;
        let { amount } = req.body;
        if (amount === undefined || amount === null) {
            return res.status(400).json({ message: "Le montant est requis." });
        }
        
        amount = Math.abs(parseFloat(amount)); 
        if (isNaN(amount)) {
            return res.status(400).json({ message: "Le montant doit être un nombre valide." });
        }

        const result = await cashModel.updateRemittanceAmount(id, amount);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Versement non trouvé ou déjà confirmé." });
        }
        res.json({ message: "Montant du versement mis à jour." });
    } catch (error) {
        console.error("Erreur updateRemittance:", error);
        res.status(500).json({ message: "Erreur lors de la mise à jour." });
    }
};

const confirmRemittance = async (req, res) => {
    try {
        const { transactionIds, paidAmount, validated_by } = req.body;

        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({ message: "Validation échouée : 'transactionIds' doit être un tableau non vide." });
        }
        if (!validated_by) {
            return res.status(400).json({ message: "Validation échouée : 'validated_by' est manquant." });
        }
        if (paidAmount === undefined || paidAmount === null) {
            return res.status(400).json({ message: "Validation échouée : 'paidAmount' est manquant." });
        }

        const numericTransactionIds = transactionIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
        if (numericTransactionIds.length !== transactionIds.length) {
            return res.status(400).json({ message: "Validation échouée : Un ou plusieurs 'transactionIds' sont invalides." });
        }
        
        const numericPaidAmount = parseFloat(paidAmount);
        if (isNaN(numericPaidAmount) || numericPaidAmount < 0) {
            return res.status(400).json({ message: `Validation échouée : 'paidAmount' (${paidAmount}) n'est pas un nombre valide ou est négatif.` });
        }

        const result = await cashModel.confirmRemittance(numericTransactionIds, numericPaidAmount, validated_by);
        
        const shortfallMessage = result.shortfall > 0 ? ` Un manquant de ${formatAmount(result.shortfall)} a été créé.` : '';
        res.json({ message: `Versement confirmé.${shortfallMessage}` });

    } catch (error) {
        console.error("Erreur dans le contrôleur confirmRemittance:", error);
        res.status(500).json({ message: error.message || "Erreur serveur lors de la confirmation." });
    }
};

const getShortfalls = async (req, res) => {
    try {
        const filters = { status: req.query.status || 'pending', search: req.query.search || null };
        const shortfalls = await cashModel.findShortfalls(filters);
        res.json(shortfalls);
    } catch (error) {
        console.error("Erreur getShortfalls:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des manquants." });
    }
};

const settleShortfall = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, userId } = req.body;
        if (amount === undefined || amount === null || !userId) {
            return res.status(400).json({ message: "Le montant et l'ID de l'utilisateur sont requis." });
        }
        await cashModel.settleShortfall(id, parseFloat(amount), userId);
        res.json({ message: "Manquant réglé avec succès." });
    } catch (error) {
        console.error("Erreur settleShortfall:", error);
        res.status(500).json({ message: error.message || "Erreur serveur lors du règlement du manquant." });
    }
};

// MISE À JOUR : Utilise le nouveau cashClosingService
const closeCash = async (req, res) => {
    try {
        const { closingDate, actualCash, comment, userId } = req.body;
        if (!closingDate || actualCash === undefined || !userId) {
            return res.status(400).json({ message: "La date de clôture, le montant compté et l'ID de l'utilisateur sont requis." });
        }
        // APPEL AU NOUVEAU SERVICE DE CLÔTURE
        const result = await cashClosingService.performCashClosing(closingDate, parseFloat(actualCash), comment, userId);
        res.status(200).json({ message: 'Caisse clôturée avec succès.', data: result });
    } catch (error) {
        console.error("Erreur closeCash:", error);
        res.status(500).json({ message: error.message || "Erreur serveur lors de la clôture de caisse." });
    }
};

// MISE À JOUR : Utilise le nouveau cashClosingService
const getClosingHistory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // APPEL AU NOUVEAU SERVICE DE CLÔTURE
        const history = await cashClosingService.findClosingHistory({ startDate, endDate });
        res.json(history);
    } catch (error) {
        console.error("Erreur getClosingHistory:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération de l'historique." });
    }
};

const getCashMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Le service est déjà mis à jour pour filtrer par date et utiliser la nouvelle logique
        const metrics = await cashService.getCashMetrics(startDate, endDate);
        res.json(metrics);
    } catch (error) {
        console.error("Erreur getCashMetrics:", error);
        res.status(500).json({ message: "Erreur lors de la récupération des métriques." });
    }
};

// MISE À JOUR : Utilise le nouveau cashClosingService
const exportClosingHistory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // APPEL AU NOUVEAU SERVICE DE CLÔTURE
        const historyData = await cashClosingService.findClosingHistory({ startDate, endDate });

        if (historyData.length === 0) {
            return res.status(404).send('Aucun historique à exporter pour cette période.');
        }

        const fields = [
            { label: 'Date', value: row => moment(row.closing_date).format('DD/MM/YYYY') },
            { label: 'Attendu (FCFA)', value: 'expected_cash' },
            { label: 'Compté (FCFA)', value: 'actual_cash_counted' },
            { label: 'Différence (FCFA)', value: 'difference' },
            { label: 'Clôturé par', value: 'closed_by_user_name' },
            { label: 'Commentaire', value: 'comment' }
        ];
        
        const json2csvParser = new Parser({ fields, delimiter: ';' });
        const csv = json2csvParser.parse(historyData);

        res.header('Content-Type', 'text/csv; charset=utf-8');
        const fileName = `historique_cloture_${moment().format('YYYY-MM-DD')}.csv`;
        res.attachment(fileName);
        res.send(Buffer.from(csv, 'latin1'));
    } catch (error) {
        console.error("Erreur exportClosingHistory:", error);
        res.status(500).json({ message: "Erreur serveur lors de l'export de l'historique." });
    }
};

module.exports = {
    getTransactions, updateTransaction, deleteTransaction, getExpenseCategories, createExpense,
    createManualWithdrawal, getRemittanceSummary, getRemittanceDetails, updateRemittance,
    confirmRemittance, getShortfalls, settleShortfall, closeCash, getClosingHistory,
    getCashMetrics, exportClosingHistory
};