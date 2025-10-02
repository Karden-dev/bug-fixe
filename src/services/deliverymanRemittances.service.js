// src/services/deliverymanRemittances.service.js
const DeliverymanRemittancesModel = require('../models/deliverymanRemittances.model');

const DeliverymanRemittancesService = {};

/**
 * Initialise le service en passant le pool DB au modèle.
 * C'est l'étape manquante qui cause le TypeError.
 * @param {object} pool - Pool de connexions MySQL.
 */
DeliverymanRemittancesService.init = (pool) => {
    // Passer le pool au modèle pour qu'il puisse exécuter les requêtes
    DeliverymanRemittancesModel.init(pool);
};


/**
 * Récupère et consolide les données journalières de versement pour l'affichage du tableau.
 * @param {string} date - Date au format YYYY-MM-DD.
 * @returns {Promise<Array>}
 */
DeliverymanRemittancesService.getDailyRemittanceSummary = async (date) => {
    try {
        const summaryData = await DeliverymanRemittancesModel.getDailySummary(date);

        // Traitement pour calculer le 'Manquant' et le 'Montant Attente'
        const consolidatedData = summaryData.map(item => {
            
            // Montant total que le livreur doit effectivement remettre
            // Expected Amount (des commandes) - Dépenses du Livreur
            const net_expected_amount = item.expected_amount - item.daily_expenses_total;

            // Montant Attendu (différence entre net dû et confirmé)
            const due_amount = net_expected_amount - item.confirmed_amount;
            
            // Le manquant est le montant dû s'il est > 0. Sinon, c'est 0.
            const shortfall_amount = (due_amount > 0) ? due_amount : 0;
            
            // Le nombre de commandes en attente
            const pending_orders = item.total_orders - item.confirmed_orders;

            return {
                deliveryman_id: item.deliveryman_id,
                deliveryman_name: item.deliveryman_name,
                deliveryman_phone: item.deliveryman_phone,
                
                // Montant total dû (après déduction des dépenses)
                expected_amount: net_expected_amount, 
                confirmed_amount: item.confirmed_amount,
                
                // Champs pour l'affichage du tableau
                shortfall_amount: shortfall_amount, // Montant manquant (si > 0)
                pending_orders: pending_orders,   // Commandes non confirmées
                confirmed_orders: item.confirmed_orders,
                total_orders: item.total_orders,
                
                // Dépenses à afficher ou à justifier
                daily_expenses_total: item.daily_expenses_total 
            };
        }).filter(item => item.total_orders > 0 || item.confirmed_amount > 0);
        
        return consolidatedData;
    } catch (error) {
        console.error("Erreur dans le service (getDailyRemittanceSummary) :", error);
        throw new Error("Impossible de consolider les données de versement journalier.");
    }
};

/**
 * Récupère le détail des commandes pour un livreur donné.
 * @param {number} deliverymanId - ID du livreur.
 * @param {string} date - Date des commandes.
 * @returns {Promise<Array>}
 */
DeliverymanRemittancesService.getDeliverymanDetails = (deliverymanId, date) => {
    return DeliverymanRemittancesModel.getDeliverymanDetails(deliverymanId, date);
};

// Logique de confirmation de versement (à implémenter après)
// DeliverymanRemittancesService.confirmRemittance = async (...) => {...};

module.exports = DeliverymanRemittancesService;