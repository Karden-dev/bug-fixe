// src/controllers/performance.controller.js
const performanceModel = require('../models/performance.model');
const moment = require('moment');

// --- Fonctions de Calcul de Rémunération ---

/**
 * Calcule la rémunération pour un livreur à pied.
 * @param {object} stats - L'objet stats retourné par performanceModel.getPerformanceData.
 * @returns {object} - Détails de la rémunération (CA, dépenses, taux, paie finale).
 */
const calculatePiedRemuneration = (stats) => {
    const ca = stats.ca_delivery_fees || 0;
    const expenses = stats.total_expenses || 0;
    const netBalance = ca - expenses;
    // Ratio des dépenses par rapport au CA
    const expenseRatio = ca > 0 ? (expenses / ca) : 0;

    let rate = 0.45; // Taux de base 45%
    let bonusApplied = false;
    // Appliquer le bonus si les dépenses sont inférieures ou égales à 35% du CA
    if (ca > 0 && expenseRatio <= 0.35) {
        rate = 0.50; // Taux majoré à 50%
        bonusApplied = true;
    }

    const finalPay = netBalance * rate;

    return {
        ca: ca,
        expenses: expenses,
        netBalance: netBalance,
        expenseRatio: expenseRatio, // Pour information
        rate: rate, // Taux effectivement appliqué
        bonusApplied: bonusApplied, // Indique si le bonus a été appliqué
        finalPay: finalPay > 0 ? finalPay : 0 // La rémunération ne peut être négative
    };
};

/**
 * Calcule la rémunération pour un livreur à moto.
 * @param {object} livreurDetails - Détails du livreur (contient base_salary).
 * @param {object} stats - Statistiques de performance (contient delivered).
 * @param {object|null} objectivesAdmin - Objectifs définis par l'admin (si implémenté).
 * @returns {object} - Détails de la rémunération (salaire base, prime, prime par course).
 */
const calculateMotoRemuneration = (livreurDetails, stats, objectivesAdmin = null) => {
    const baseSalary = livreurDetails.base_salary || 0;
    const deliveredCount = stats.delivered || 0;
    let performanceBonus = 0;
    let bonusPerDelivery = 0;
    let percentageAchieved = 0; // Pourcentage de l'objectif atteint

    // Logique de prime basée sur les règles fournies
    const target = objectivesAdmin?.target || 370; // Objectif par défaut si non défini
    // TODO: Ajuster 'target' en fonction des jours ouvrables, absences, fériés si ces données sont disponibles
    const eligibilityThreshold = target * 0.65; // Seuil d'éligibilité (65%)

    if (target > 0 && deliveredCount >= eligibilityThreshold) {
        percentageAchieved = deliveredCount / target; // Calcul du % atteint

        // Détermination de la prime par course selon les paliers
        if (percentageAchieved >= 0.95) { // >= 95%
            bonusPerDelivery = 175;
        } else if (percentageAchieved >= 0.85) { // >= 85%
            bonusPerDelivery = 150;
        } else if (percentageAchieved >= 0.75) { // >= 75%
            bonusPerDelivery = 125;
        } else { // >= 65% (seuil d'éligibilité)
            bonusPerDelivery = 100;
        }

        performanceBonus = deliveredCount * bonusPerDelivery;
    }

    return {
        baseSalary: baseSalary,
        performanceBonus: performanceBonus,
        // Informations supplémentaires pour l'affichage
        targetDeliveries: target, // L'objectif utilisé pour le calcul
        achievedDeliveries: deliveredCount,
        achievedPercentage: percentageAchieved,
        bonusThreshold: eligibilityThreshold, // Seuil pour obtenir une prime
        bonusPerDelivery: bonusPerDelivery // La prime par course appliquée
        // La paie totale (base + bonus) sera calculée dans la fonction principale
    };
};

// --- Contrôleurs ---

/**
 * Contrôleur principal pour récupérer les données de performance d'un livreur.
 * Gère la requête GET /api/performance.
 */
const getRiderPerformance = async (req, res) => {
    try {
        const livreurUserId = req.user.id; // Récupéré depuis le token JWT vérifié par le middleware
        const period = req.query.period || 'current_month'; // Période demandée (ex: 'current_month', 'last_month', 'today'...)

        // --- 1. Déterminer les dates de début et de fin ---
        let startDate, endDate;
        const today = moment(); // Utilise Moment.js pour manipuler les dates

        switch (period) {
            case 'last_month':
                const lastMonth = today.clone().subtract(1, 'month');
                startDate = lastMonth.startOf('month').format('YYYY-MM-DD');
                endDate = lastMonth.endOf('month').format('YYYY-MM-DD');
                break;
            case 'current_week':
                startDate = today.clone().startOf('isoWeek').format('YYYY-MM-DD'); // Commence le Lundi
                endDate = today.clone().endOf('isoWeek').format('YYYY-MM-DD');   // Termine le Dimanche
                break;
            case 'today':
                 startDate = today.format('YYYY-MM-DD');
                 endDate = today.format('YYYY-MM-DD');
                 break;
            case 'current_month':
            default: // Mois courant par défaut
                startDate = today.clone().startOf('month').format('YYYY-MM-DD');
                endDate = today.clone().endOf('month').format('YYYY-MM-DD');
                break;
        }

        // --- 2. Récupérer les données brutes depuis le modèle ---
        const rawData = await performanceModel.getPerformanceData(livreurUserId, startDate, endDate); //

        // --- 3. Calculer la rémunération spécifique ---
        let remunerationDetails = {};
        if (rawData.details.vehicle_type === 'pied') {
            remunerationDetails = calculatePiedRemuneration(rawData.stats); //
             // Rémunération totale pour livreur à pied
            remunerationDetails.totalPay = remunerationDetails.finalPay;
        } else if (rawData.details.vehicle_type === 'moto') {
            // TODO: Récupérer les vrais objectifs admin si implémenté
            const objectivesAdminData = rawData.objectivesAdmin; // Pour l'instant, c'est null dans le modèle
            remunerationDetails = calculateMotoRemuneration(rawData.details, rawData.stats, objectivesAdminData); //
            // Rémunération totale pour livreur à moto
            remunerationDetails.totalPay = remunerationDetails.baseSalary + remunerationDetails.performanceBonus;
        }

        // --- 4. Préparer la réponse JSON structurée pour le frontend ---
        const responseData = {
            queryPeriod: { // Rappel de la période demandée
                code: period,
                startDate: startDate,
                endDate: endDate
            },
            riderType: rawData.details.vehicle_type, // Type de livreur ('pied' ou 'moto')
            details: { // Infos de base
                name: rawData.details.name,
                status: rawData.details.status
            },
            stats: { // Statistiques clés calculées pour la période
                received: rawData.stats.received,
                delivered: rawData.stats.delivered,
                livrabilite_rate: rawData.stats.livrabilite_rate, // Taux calculé dans le modèle
                workedDays: rawData.stats.workedDays // Jours avec au moins une commande
                // Ajouter d'autres stats si besoin (ex: courses annulées, ratées...)
            },
            remuneration: remunerationDetails, // Objet contenant les détails du calcul de paie
            objectivesAdmin: { // Détails sur l'objectif admin (pour motards)
                 target: remunerationDetails.targetDeliveries, // Objectif (peut être ajusté)
                 achieved: remunerationDetails.achievedDeliveries, // Courses livrées comptant pour l'objectif
                 percentage: remunerationDetails.achievedPercentage, // Pourcentage atteint
                 bonusPerDelivery: remunerationDetails.bonusPerDelivery, // Prime par course appliquée
                 bonusThreshold: remunerationDetails.bonusThreshold // Seuil pour obtenir la prime
            },
            personalGoals: rawData.personalGoals, // Objectifs personnels { daily, weekly, monthly }
            chartData: rawData.chartData // Données formatées { labels: [...], data: [...] } pour le graphique
        };

        res.json(responseData); // Envoyer la réponse au frontend

    } catch (error) {
        console.error("Erreur dans getRiderPerformance Controller:", error);
        // Envoyer une réponse d'erreur générique ou spécifique
        res.status(500).json({ message: error.message || "Erreur serveur lors de la récupération des performances." });
    }
};

/**
 * Contrôleur pour mettre à jour les objectifs personnels d'un livreur.
 * Gère la requête PUT /api/performance/personal-goals.
 */
const updatePersonalGoals = async (req, res) => {
     try {
        const livreurUserId = req.user.id; // ID du livreur connecté
        // Récupère les objectifs depuis le corps de la requête JSON
        const { daily, weekly, monthly } = req.body;

        // Validation simple: Vérifier si au moins un objectif est fourni (on pourrait être plus strict)
        if (daily === undefined && weekly === undefined && monthly === undefined) {
             return res.status(400).json({ message: "Au moins un objectif (daily, weekly, ou monthly) doit être fourni." });
        }

        // Préparer l'objet goals à envoyer au modèle
        const goals = {
             // Utilise parseInt pour convertir en nombre, ou null si invalide/absent
             daily: !isNaN(parseInt(daily)) ? parseInt(daily) : null,
             weekly: !isNaN(parseInt(weekly)) ? parseInt(weekly) : null,
             monthly: !isNaN(parseInt(monthly)) ? parseInt(monthly) : null
        };

        // Appeler la fonction du modèle pour mettre à jour la BDD
        const result = await performanceModel.updatePersonalGoals(livreurUserId, goals); //

        if (result.success) {
            // Succès : La mise à jour a affecté au moins une ligne
            res.json({ message: "Objectifs personnels mis à jour avec succès." });
        } else {
            // Échec : L'user_id n'a pas été trouvé dans la table 'livreurs'
            res.status(404).json({ message: "Livreur non trouvé ou aucune modification nécessaire." });
        }
     } catch (error) {
         console.error("Erreur dans updatePersonalGoals Controller:", error);
         res.status(500).json({ message: error.message || "Erreur serveur lors de la mise à jour des objectifs." });
     }
};


module.exports = {
    getRiderPerformance,
    updatePersonalGoals
    // Ajouter ici d'autres contrôleurs si nécessaire (ex: gestion absences/fériés)
};