// src/controllers/remittances.controller.js
const remittanceModel = require('../models/remittance.model');
const remittancesService = require('../services/remittances.service');
const PDFDocument = require('pdfkit');
const moment = require('moment');

const getRemittances = async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            status: req.query.status || 'pending' // Par défaut, on affiche les versements en attente
        };
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
            const amount = parseFloat(rem.total_payout_amount);
            if (rem.payment_operator === 'Orange Money') {
                stats.orangeMoneyTotal += amount;
                stats.orangeMoneyTransactions++;
            } else if (rem.payment_operator === 'MTN Mobile Money') {
                stats.mtnMoneyTotal += amount;
                stats.mtnMoneyTransactions++;
            }
            stats.totalRemittanceAmount += amount;
        });

        res.json({ remittances, stats });
    } catch (error) {
        console.error("Erreur lors de la récupération des versements:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des versements' });
    }
};

const payRemittance = async (req, res) => {
    try {
        const { remittanceId } = req.params;
        const { userId } = req.body;
        if (!remittanceId || !userId) {
            return res.status(400).json({ message: "ID du versement et de l'utilisateur requis." });
        }
        await remittancesService.payRemittance(remittanceId, userId);
        res.status(200).json({ message: "Versement marqué comme payé avec succès." });
    } catch (error) {
        console.error("Erreur lors du paiement du versement:", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
};

const getRemittanceDetails = async (req, res) => {
    try {
        const { shopId } = req.params;
        const details = await remittanceModel.getShopDetails(shopId);
        res.json(details);
    } catch (error) {
        console.error("Erreur lors de la récupération des détails du versement:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des détails' });
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
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des détails' });
    }
};

const exportPdf = async (req, res) => {
    try {
        const pendingRemittances = await remittanceModel.findForRemittance({ status: 'pending' });

        if (pendingRemittances.length === 0) {
            return res.status(404).json({ message: "Aucun versement en attente à exporter." });
        }
        
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment;filename=rapport_versements_en_attente.pdf',
                'Content-Length': pdfData.length
            }).end(pdfData);
        });

        doc.fontSize(20).text('Rapport de Versements en Attente', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Date du rapport : ${moment().format('DD/MM/YYYY')}`, { align: 'center' });
        doc.moveDown(2);

        const tableHeaders = ['Marchand', 'Téléphone', 'Opérateur', 'Montant à verser'];
        const tableData = pendingRemittances.map(rem => [
            rem.shop_name,
            rem.phone_number_for_payment || 'N/A',
            rem.payment_operator || 'N/A',
            `${rem.total_payout_amount.toLocaleString('fr-FR')} FCFA`
        ]);
        
        // La logique pour dessiner la table dans le PDF...
        
        doc.end();

    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF' });
    }
};

module.exports = {
    getRemittances,
    payRemittance,
    getRemittanceDetails,
    updateShopPaymentDetails,
    exportPdf
};