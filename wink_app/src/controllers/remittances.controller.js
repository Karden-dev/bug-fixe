const remittanceModel = require('../models/remittance.model');
const remittancesService = require('../services/remittances.service');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

// --- Fonctions utilitaires ---
const formatPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return 'N/A';
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.substring(0,1)} ${cleaned.substring(1,3)} ${cleaned.substring(3,5)} ${cleaned.substring(5,7)} ${cleaned.substring(7,9)}`;
    }
    return phone;
};

const formatAmount = (amount) => {
    return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
};


// --- Contrôleurs ---
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
            if (rem.total_payout_amount <= 0) return;
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
        const filters = { ...req.query, status: 'pending' };
        const allRemittances = await remittanceModel.findForRemittance(filters);
        const pendingRemittances = allRemittances.filter(r => r.total_payout_amount > 0);

        if (pendingRemittances.length === 0) {
            return res.status(404).send("Aucun versement en attente à exporter pour la période sélectionnée.");
        }
        
        const pt_per_cm = 72 / 2.54;
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'portrait',
            margins: {
                top: 3 * pt_per_cm,
                bottom: 2 * pt_per_cm,
                left: 1 * pt_per_cm,
                right: 1 * pt_per_cm
            }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `WinkExpress_Versements_${moment().format('YYYY-MM-DD')}.pdf`;
            res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment;filename=${fileName}` }).end(pdfData);
        });

        const headerPath = path.join(__dirname, '../../public/header.png');
        const addBackground = () => {
            if (fs.existsSync(headerPath)) {
                doc.image(headerPath, 0, 0, { width: doc.page.width, height: doc.page.height });
            }
        };

        addBackground();
        doc.on('pageAdded', addBackground);

        const stats = { orangeMoneyTotal: 0, mtnMoneyTotal: 0, totalRemittanceAmount: 0 };
        pendingRemittances.forEach(rem => {
            if (rem.payment_operator === 'Orange Money') stats.orangeMoneyTotal += rem.total_payout_amount;
            else if (rem.payment_operator === 'MTN Mobile Money') stats.mtnMoneyTotal += rem.total_payout_amount;
            stats.totalRemittanceAmount += rem.total_payout_amount;
        });
        
        doc.fillColor('#333');
        doc.fontSize(12).font('Helvetica-Bold').text('Récapitulatif de la période');
        doc.moveDown(0.5);

        const recapTable = {
            headers: ['DESCRIPTION', 'MONTANT TOTAL'],
            rows: [
                ['Total Orange Money', formatAmount(stats.orangeMoneyTotal)],
                ['Total MTN Money', formatAmount(stats.mtnMoneyTotal)],
                ['Total Général à Verser', formatAmount(stats.totalRemittanceAmount)]
            ],
            colWidths: [250, 150]
        };
        
        let tableTop = doc.y;
        let startX = doc.page.margins.left + 50;
        doc.rect(startX, tableTop, recapTable.colWidths.reduce((a, b) => a + b, 0), 20).fillAndStroke('#2C3E50', '#2C3E50').fillColor('white').stroke();
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(recapTable.headers[0], startX + 5, tableTop + 7, { width: recapTable.colWidths[0] - 10 });
        doc.text(recapTable.headers[1], startX + recapTable.colWidths[0] + 5, tableTop + 7, { width: recapTable.colWidths[1] - 10, align: 'right' });

        let currentY = tableTop + 20;
        recapTable.rows.forEach((row, i) => {
            doc.rect(startX, currentY, recapTable.colWidths.reduce((a, b) => a + b, 0), 20).stroke('#333');
            doc.font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#333');
            doc.text(row[0], startX + 5, currentY + 7, { width: recapTable.colWidths[0] - 10 });
            doc.text(row[1], startX + recapTable.colWidths[0] + 5, currentY + 7, { width: recapTable.colWidths[1] - 10, align: 'right' });
            currentY += 20;
        });
        doc.y = currentY + 30;


        const drawDetailedTable = (tableData) => {
            const tableTop = doc.y;
            const startX = doc.page.margins.left;
            const tableWidth = doc.page.width - startX - doc.page.margins.right;
            const columnWidths = [30, 120, 140, 65, 65, 80];
            const headers = ['N°', 'Marchand', 'Nom du versement', 'Téléphone', 'Opérateur', 'Montant'];
            let currentY = tableTop;

            const drawHeader = () => {
                doc.rect(startX, currentY, tableWidth, 20).fillAndStroke('#2C3E50', '#2C3E50').fillColor('white').stroke();
                doc.font('Helvetica-Bold').fontSize(9);
                let currentX = startX;
                headers.forEach((header, i) => {
                    doc.text(header, currentX + 5, currentY + 7, { width: columnWidths[i] - 10, align: i >= 5 ? 'right' : 'left' });
                    currentX += columnWidths[i];
                });
                currentY += 20;
            };

            drawHeader();
            doc.font('Helvetica').fontSize(8);

            tableData.forEach((row, index) => {
                const rowHeight = 20;
                if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage();
                    currentY = doc.page.margins.top;
                    drawHeader();
                }

                doc.rect(startX, currentY, tableWidth, rowHeight).stroke('#CCCCCC');
                doc.fillColor('#333333');
                
                const cells = [
                    index + 1,
                    row.shop_name,
                    row.payment_name || 'N/A',
                    formatPhoneNumber(row.phone_number_for_payment),
                    row.payment_operator || 'N/A',
                    formatAmount(row.total_payout_amount)
                ];
                
                let currentX = startX;
                cells.forEach((cell, i) => {
                    doc.text(cell.toString(), currentX + 5, currentY + 7, { 
                        width: columnWidths[i] - 10, 
                        align: i >= 5 ? 'right' : 'left',
                        lineBreak: false,
                        ellipsis: true 
                    });
                    currentX += columnWidths[i];
                });
                
                currentY += rowHeight;
            });
            doc.y = currentY;
        };

        drawDetailedTable(pendingRemittances);

        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#333').text(`Page ${i + 1} sur ${range.count}`, 
                doc.page.margins.left, 
                doc.page.height - doc.page.margins.bottom + 10, 
                { align: 'center' }
            );
        }

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
