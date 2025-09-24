// src/controllers/remittances.controller.js
const remittanceModel = require('../models/remittance.model');
const remittancesService = require('../services/remittances.service');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');

const getRemittances = async (req, res) => {
    try {
        const filters = req.query;
        // On ne force plus le statut 'pending', on utilise le filtre de l'utilisateur
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
    try {
        const { startDate, endDate } = req.query;
        const remittances = await remittanceModel.findForRemittance({ startDate, endDate, status: 'pending' });

        if (remittances.length === 0) {
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

        const headerPath = 'public/header.png';
        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;

        const addHeaderAndFooter = () => {
            if (fs.existsSync(headerPath)) {
                doc.image(headerPath, 0, 0, { width: pageWidth, height: pageHeight });
            }
        };

        const drawTable = (data, headers, title) => {
            const tableTop = doc.y;
            const itemHeight = 25;
            const headerHeight = 25;
            const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const columns = [
                { key: 'shop_name', width: 120, label: 'Marchand' },
                { key: 'total_payout_amount', width: 90, label: 'Montant à verser' },
                { key: 'contact', width: 140, label: 'Contact versement' },
                { key: 'observation', width: 100, label: 'Observation' }
            ];
            
            const tableHeight = headerHeight + (data.length * itemHeight);
            if (doc.y + tableHeight > doc.page.height - 70) { // 70px de marge en bas
                doc.addPage();
            }

            // Titre du tableau
            doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text(title, doc.x, doc.y);
            doc.moveDown(0.5);

            // En-tête du tableau stylisé
            doc.fillColor('#2C3E50').rect(doc.x, doc.y, tableWidth, headerHeight).fill();
            doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
            
            let currentX = doc.x;
            columns.forEach(col => {
                doc.text(col.label, currentX, doc.y + 8, { width: col.width, align: 'center' });
                currentX += col.width + 5;
            });
            doc.y += headerHeight;
            
            // Lignes du tableau stylisées
            doc.font('Helvetica').fontSize(9);
            data.forEach((item, i) => {
                const isOdd = i % 2 !== 0;
                doc.fillColor(isOdd ? '#F8F9FA' : 'white').rect(doc.x, doc.y, tableWidth, itemHeight).fill();
                doc.fillColor('black');

                currentX = doc.x;
                doc.text(item.shop_name, currentX, doc.y + 8, { width: columns[0].width, align: 'left' });
                currentX += columns[0].width + 5;
                doc.text(item.total_payout_amount, currentX, doc.y + 8, { width: columns[1].width, align: 'right' });
                currentX += columns[1].width + 5;
                doc.text(item.contact, currentX, doc.y + 8, { width: columns[2].width, align: 'left' });
                currentX += columns[2].width + 5;
                doc.text(item.observation, currentX, doc.y + 8, { width: columns[3].width, align: 'left' });
                doc.y += itemHeight;
            });
        };

        // Gérer les pages et ajouter l'en-tête
        doc.on('pageAdded', () => {
            addHeaderAndFooter();
            doc.y = 160; // Position Y de départ pour le contenu sur les nouvelles pages
        });
        addHeaderAndFooter(); // Ajout du header sur la première page

        // Contenu du document
        doc.y = 160; // Position Y de départ pour le contenu
        doc.fillColor('black').fontSize(18).text('Etat des versements', { align: 'center', continued: false, y: 120 });
        doc.fontSize(12).text('Récapitulatif de la période', { align: 'center' });
        const periodText = (startDate && endDate) ? `Du ${moment(startDate).format('DD/MM/YYYY')} au ${moment(endDate).format('DD/MM/YYYY')}` : `Date du rapport : ${moment().format('DD/MM/YYYY')}`;
        doc.fontSize(10).text(periodText, { align: 'center' });
        doc.moveDown(2);

        const tableData = remittances.map(rem => ({
            shop_name: rem.shop_name,
            total_payout_amount: rem.total_payout_amount ? rem.total_payout_amount.toLocaleString('fr-FR') + ' FCFA' : '0 FCFA',
            contact: `${rem.payment_name || 'N/A'} (${rem.phone_number_for_payment || 'N/A'}) - ${rem.payment_operator || 'N/A'}`,
            observation: 'En attente'
        }));

        drawTable(tableData, [], '');

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
    exportPdf
};
