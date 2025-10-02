// src/controllers/deliverymanRemittances.controller.js
const DeliverymanRemittancesService = require('../services/deliverymanRemittances.service');
// const { format } = require('date-fns'); // LIGNE SUPPRIMÉE CAR NON INSTALLÉE

const DeliverymanRemittancesController = {};

/**
 * Fonction utilitaire pour obtenir la date au format YYYY-MM-DD.
 */
const getTodayDateString = () => {
    const today = new Date();
    // Utilise les méthodes Date pour construire le format YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Janvier est 0!
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};


/**
 * [GET] /api/deliveryman-remittances/summary
 * Récupère le résumé journalier des versements des livreurs.
 * Accepte un paramètre de requête 'date' (optionnel).
 */
DeliverymanRemittancesController.getDailySummary = async (req, res) => {
    try {
        // La date par défaut est aujourd'hui (format YYYY-MM-DD)
        // Utilisation de notre fonction utilitaire locale à la place de date-fns
        const date = req.query.date || getTodayDateString(); 

        const summary = await DeliverymanRemittancesService.getDailyRemittanceSummary(date);
        
        res.status(200).json(summary);
    } catch (error) {
        console.error("Erreur Controller (getDailySummary):", error.message);
        res.status(500).json({ error: "Impossible de récupérer le résumé des versements." });
    }
};

/**
 * [GET] /api/deliveryman-remittances/details/:deliverymanId
 * Récupère le détail des commandes pour un livreur donné.
 */
DeliverymanRemittancesController.getDeliverymanDetails = async (req, res) => {
    const deliverymanId = parseInt(req.params.deliverymanId, 10);
    // Utilisation de notre fonction utilitaire locale à la place de date-fns
    const date = req.query.date || getTodayDateString(); 

    if (isNaN(deliverymanId)) {
        return res.status(400).json({ error: "ID du livreur invalide." });
    }

    try {
        const details = await DeliverymanRemittancesService.getDeliverymanDetails(deliverymanId, date);
        res.status(200).json(details);
    } catch (error) {
        console.error("Erreur Controller (getDeliverymanDetails):", error.message);
        res.status(500).json({ error: "Impossible de récupérer les détails des commandes." });
    }
};


module.exports = DeliverymanRemittancesController;