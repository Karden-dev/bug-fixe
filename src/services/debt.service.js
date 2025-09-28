// src/services/debt.service.js
const moment = require('moment');
const reportModel = require('../models/report.model');

let dbConnection;

const init = (connection) => { 
    dbConnection = connection; 
    // La ligne conflictuelle ci-dessous est supprimée.
    // reportModel.init(connection); 
};

/**
 * Traite les frais de stockage pour les jours non facturés.
 * Met à jour directement la table `daily_shop_balances`.
 */
const processStorageFees = async (processingDate) => {
    const connection = await dbConnection.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Récupérer tous les marchands qui facturent le stockage
        const [shopsWithStorage] = await connection.execute(
            `SELECT id, storage_price FROM shops WHERE bill_storage = 1 AND status = 'actif'`
        );

        let updatedCount = 0;
        let createdCount = 0;

        for (const shop of shopsWithStorage) {
            // 2. Mettre à jour la ligne dans daily_shop_balances pour ce marchand et cette date
            // On met à jour SEULEMENT si les frais de stockage n'ont pas encore été appliqués (sont à 0)
            const [result] = await connection.execute(
                `UPDATE daily_shop_balances 
                 SET 
                    total_storage_fees = ?,
                    remittance_amount = remittance_amount - ?
                 WHERE 
                    shop_id = ? 
                    AND report_date = ?
                    AND total_storage_fees = 0`,
                [shop.storage_price, shop.storage_price, shop.id, processingDate]
            );

            if (result.affectedRows > 0) {
                updatedCount++;
            }
        }

        await connection.commit();
        return { message: `${updatedCount} bilan(s) mis à jour avec les frais de stockage pour le ${processingDate}.` };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Consolide les soldes négatifs de la veille en créances.
 * FONCTIONNALITÉ DÉSACTIVÉE.
 */
const consolidateDailyBalances = async (dateToConsolidate) => {
    // Cette fonctionnalité est maintenant dépréciée pour simplifier la logique.
    console.log(`[AVERTISSEMENT] La consolidation des soldes pour le ${dateToConsolidate} a été appelée, mais cette fonctionnalité est désactivée.`);
    return { message: `La consolidation automatique des soldes est désactivée.` };
};

module.exports = {
    init,
    processStorageFees,
    consolidateDailyBalances,
};