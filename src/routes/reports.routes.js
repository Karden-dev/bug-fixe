// src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const reportModel = require('../models/report.model');
const debtService = require('../services/debt.service');
const balanceService = require('../services/balance.service');

// Route pour obtenir le rapport journalier agrégé
router.get('/', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'La date est requise.' });
        }
        
        // Etape 1: S'assurer que les frais de stockage sont générés pour la journée
        await debtService.processStorageFees(date);
        
        // Etape 2: Calculer et sauvegarder les soldes pour tous les marchands pour cette date
        await balanceService.calculateAllBalancesForDate(date);
        
        // Etape 3: Lire les résultats depuis la table des soldes
        const reports = await reportModel.findReportsByDate(date);
        res.status(200).json(reports);
    } catch (error) {
        console.error("Erreur (GET /reports):", error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// Route pour obtenir le rapport détaillé d'un marchand
router.get('/detailed', async (req, res) => {
    try {
        const { date, shopId } = req.query;
        if (!date || !shopId) {
            return res.status(400).json({ message: 'La date et l\'ID du marchand sont requis.' });
        }
        
        // Assurer que le rapport est à jour avant de le récupérer
        await debtService.processStorageFees(date);
        await balanceService.calculateAndSaveBalance(shopId, date);
        
        const report = await reportModel.findDetailedReport(date, shopId);
        if (!report) {
            return res.status(404).json({ message: 'Rapport détaillé non trouvé.' });
        }
        res.status(200).json(report);
    } catch (error) {
        console.error("Erreur (GET /reports/detailed):", error);
        res.status(500).json({ message: 'Erreur lors de la récupération du rapport détaillé.' });
    }
});

// Route pour consolider les soldes
router.post('/consolidate-balances', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'La date est requise pour consolider les soldes.' });
        }
        const result = await debtService.consolidateDailyBalances(date);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la consolidation des soldes.' });
    }
});

module.exports = router;