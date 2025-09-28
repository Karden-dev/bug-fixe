// src/controllers/remittances.controller.js
const remittanceModel = require('../models/remittance.model');
const remittancesService = require('../services/remittances.service');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');

const getRemittances = async (req, res) => {
    try {
        const filters = req.query;
        const allRemittances = await remittanceModel.findForRemittance(filters);

        const stats = {
            orangeMoneyTotal: 0,
            orangeMoneyTransactions: 0,
            mtnMoneyTotal: 0,
            mtnMoneyTransactions: 0,
            totalAmount: 0,
            totalTransactions: allRemittances.length
        };

        allRemittances.forEach(rem => {
            // On ne somme que les versements en attente pour les stats "à verser"
            if (rem.status === 'pending') {
                 if (rem.payment_operator === 'Orange Money') {
                    stats.orangeMoneyTotal += parseFloat(rem.amount);
                    stats.orangeMoneyTransactions++;
                } else if (rem.payment_operator === 'MTN Mobile Money') {
                    stats.mtnMoneyTotal += parseFloat(rem.amount);
                    stats.mtnMoneyTransactions++;
                }
                stats.totalAmount += parseFloat(rem.amount);
            }
        });

        res.json({ remittances: allRemittances, stats });
    } catch (error) {
        console.error("Erreur lors de la récupération des versements:", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

const getRemittanceDetails = async (req, res) => {
    try {
        const { shopId } = req.params;
        const details = await remittanceModel.getShopDetails(shopId);
        res.json(details);
    } catch (error) {
        console.error("Erreur lors de la récupération des détails du versement:", error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

const recordRemittance = async (req, res) => {
    try {
        const { shopId, amount, paymentOperator, status, transactionId, comment, userId } = req.body;
        if (!shopId || !amount || !status || !userId) {
            return res.status(400).json({ message: "Les champs shopId, amount, status et userId sont requis." });
        }
        await remittanceModel.recordRemittance(shopId, amount, paymentOperator, status, transactionId, comment, userId);
        res.status(201).json({ message: "Versement enregistré avec succès." });
    } catch (error) {
        console.error("Erreur lors de l'enregistrement du versement:", error);
        res.status(500).json({ message: 'Erreur serveur.' });
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
        res.status(500).json({ message: 'Erreur serveur.' });
    }
};

const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "L'ID de l'utilisateur est requis." });
        }
        const result = await remittanceModel.markAsPaid(id, userId);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Versement non trouvé ou déjà payé." });
        }
        res.status(200).json({ message: "Versement marqué comme payé avec succès." });
    } catch (error) {
        console.error("Erreur lors du paiement du versement:", error);
        res.status(500).json({ message: 'Erreur serveur.' });
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

        doc.fontSize(20).text('Rapport des Versements en Attente', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Date du rapport : ${moment().format('DD/MM/YYYY')}`, { align: 'center' });
        doc.moveDown(2);

        const tableTop = doc.y;
        const startX = 50;
        const columnWidths = [150, 100, 100, 150];
        const tableHeaders = ['Marchand', 'Téléphone', 'Opérateur', 'Montant à verser'];

        doc.font('Helvetica-Bold');
        let currentX = startX;
        tableHeaders.forEach((header, i) => {
            doc.text(header, currentX, tableTop, { width: columnWidths[i] });
            currentX += columnWidths[i];
        });
        doc.moveDown();
        
        doc.font('Helvetica');
        pendingRemittances.forEach(rem => {
            let currentX = startX;
            let rowY = doc.y;
            const rowData = [
                rem.shop_name,
                rem.phone_number_for_payment || 'N/A',
                rem.payment_operator || 'N/A',
                `${parseFloat(rem.amount).toLocaleString('fr-FR')} FCFA`
            ];
            rowData.forEach((cell, i) => {
                doc.text(cell.toString(), currentX, rowY, { width: columnWidths[i] });
                currentX += columnWidths[i];
            });
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF', error: error.message });
    }
};

module.exports = {
    getRemittances,
    getRemittanceDetails,
    recordRemittance,
    updateShopPaymentDetails,
    exportPdf,
    markAsPaid
};