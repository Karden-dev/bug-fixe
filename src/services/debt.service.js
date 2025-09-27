// src/services/debt.service.js
const moment = require('moment');
const reportModel = require('../models/report.model');

let dbConnection;

const init = (connection) => { 
    dbConnection = connection; 
    reportModel.init(connection);
};

// -----------------------------------------------------
// --- FONCTION CORRIGÉE : processStorageFees ---
// -----------------------------------------------------
/**
 * Traite les frais de stockage pour les jours non facturés en utilisant le prix historisé.
 * Applique le patron d'Idempotence (Upsert) pour éviter les doublons.
 */
const processStorageFees = async (processingDate) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();
        
        // On récupère tous les marchands éligibles au stockage
        const [shopsWithStorage] = await connection.execute(
            `SELECT id FROM shops WHERE bill_storage = 1 AND status = 'actif'`
        );

        for (const shop of shopsWithStorage) {
            // NOUVELLE LOGIQUE: On cherche le prix de stockage correct pour la date donnée
            const [priceHistory] = await connection.execute(
                `SELECT price FROM shop_storage_history 
                 WHERE shop_id = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
                 ORDER BY start_date DESC LIMIT 1`,
                [shop.id, processingDate, processingDate]
            );

            // On récupère le prix depuis l'historique. S'il n'y en a pas, on ne facture rien.
            const storagePrice = priceHistory.length > 0 ? priceHistory[0].price : null;

            // On continue uniquement si un prix valide a été trouvé pour cette date
            if (storagePrice) {
                const [existingDebt] = await connection.execute(
                    `SELECT id FROM debts WHERE shop_id = ? AND type = 'storage' AND DATE(created_at) = ?`,
                    [shop.id, processingDate]
                );
                
                const comment = `Frais de stockage pour le ${processingDate}`;

                if (existingDebt.length === 0) {
                    // INSERT : Créer une nouvelle entrée si elle n'existe pas
                    await connection.execute(
                        'INSERT INTO debts (shop_id, amount, type, status, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                        [shop.id, storagePrice, 'storage', 'pending', comment, processingDate]
                    );
                } else {
                    // UPDATE : Mettre à jour l'entrée existante (Idempotence)
                     await connection.execute(
                        'UPDATE debts SET amount = ?, comment = ?, updated_at = NOW() WHERE id = ?',
                        [storagePrice, comment, existingDebt[0].id]
                    );
                }
            }
        }
        
        await connection.commit();
        return { message: `Frais de stockage pour le ${processingDate} traités avec succès.` };
    } catch (error) {
        await connection.rollback();
        console.error("Erreur dans processStorageFees:", error);
        throw error;
    } finally {
        connection.release();
    }
};

// -----------------------------------------------------
// --- FONCTION CORRIGÉE : consolidateDailyBalances ---
// -----------------------------------------------------
/**
 * Consolide les soldes négatifs de la veille en créances.
 * Applique le patron d'Idempotence (Upsert) pour éviter les doublons.
 */
const consolidateDailyBalances = async (dateToConsolidate) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();
        const reports = await reportModel.findReportsByDate(dateToConsolidate);
        for (const report of reports) {
            if (report.amount_to_remit < 0) {
                const debtAmount = Math.abs(report.amount_to_remit);
                const [existingDebt] = await connection.execute(
                    `SELECT id FROM debts WHERE shop_id = ? AND type = 'daily_balance' AND DATE(created_at) = ?`,
                    [report.shop_id, dateToConsolidate]
                );
                
                const comment = `Report du solde négatif du ${dateToConsolidate}`;

                if (existingDebt.length === 0) {
                    // INSERT : Créer une nouvelle entrée si elle n'existe pas
                    await connection.execute(
                        'INSERT INTO debts (shop_id, amount, type, status, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                        [report.shop_id, debtAmount, 'daily_balance', 'pending', comment, dateToConsolidate]
                    );
                } else {
                    // UPDATE : Mettre à jour l'entrée existante (Idempotence)
                    await connection.execute(
                        'UPDATE debts SET amount = ?, comment = ?, updated_at = NOW() WHERE id = ?',
                        [debtAmount, comment, existingDebt[0].id]
                    );
                }
            }
        }
        await connection.commit();
        return { message: `Consolidation des soldes pour le ${dateToConsolidate} terminée avec succès.` };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    init,
    processStorageFees,
    consolidateDailyBalances,
};