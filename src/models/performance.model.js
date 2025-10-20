// src/models/performance.model.js
const moment = require('moment');

let dbConnection; // Contient le Pool de connexions

/**
 * Initialise le modèle avec la connexion à la base de données.
 * @param {object} connection - Le pool de connexion à la base de données.
 */
const init = (connection) => {
    dbConnection = connection;
    // Exporter le Pool lui-même pour que d'autres modules (Contrôleurs) puissent obtenir une connexion transactionnelle
    module.exports.dbConnection = connection; 
};

/**
 * Récupère les données brutes nécessaires pour calculer la performance d'un livreur
 * sur une période donnée.
 */
const getPerformanceData = async (livreurUserId, startDate, endDate) => {
    if (!livreurUserId || !startDate || !endDate) {
        throw new Error("Livreur ID, startDate et endDate sont requis.");
    }

    const connection = await dbConnection.getConnection();
    try {
        const startDateTime = `${startDate} 00:00:00`;
        const endDateTime = `${endDate} 23:59:59`;

        // --- 1. Détails du livreur (JOIN users et livreurs) ---
        const [livreurDetailsRows] = await connection.execute(
            `SELECT
                u.id,
                u.name,
                u.status AS user_status,
                l.vehicle_type,
                l.base_salary,
                l.commission_rate, -- Colonne lue après l'étape SQL
                l.personal_goal_daily,
                l.personal_goal_weekly,
                l.personal_goal_monthly
             FROM users u
             LEFT JOIN livreurs l ON u.id = l.user_id
             WHERE u.id = ? AND u.role = 'livreur'`,
            [livreurUserId]
        );

        if (livreurDetailsRows.length === 0) {
            const [userCheck] = await connection.execute('SELECT role FROM users WHERE id = ?', [livreurUserId]);
            if (userCheck.length === 0) throw new Error(`Utilisateur ID ${livreurUserId} non trouvé.`);
            if (userCheck[0].role !== 'livreur') throw new Error(`Utilisateur ID ${livreurUserId} n'est pas un livreur.`);
            throw new Error(`Détails spécifiques (type, salaire...) non trouvés pour le livreur ID ${livreurUserId}. Vérifiez la table 'livreurs'.`);
        }
        const livreurDetails = livreurDetailsRows[0];

        // --- 2. Statistiques des courses (omises pour la concision) ---
        const [courseStatsRows] = await connection.execute(
            `SELECT
                COUNT(id) AS received,
                SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END) AS delivered,
                COUNT(DISTINCT DATE(created_at)) AS workedDays,
                COALESCE(SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN delivery_fee ELSE 0 END), 0) AS ca_delivery_fees
             FROM orders
             WHERE deliveryman_id = ? AND created_at BETWEEN ? AND ?`,
            [livreurUserId, startDateTime, endDateTime]
        );
        const courseStats = courseStatsRows[0] || { received: 0, delivered: 0, workedDays: 0, ca_delivery_fees: 0 };

        // --- 3. Dépenses (omises pour la concision) ---
        const [expenseRows] = await connection.execute(
            `SELECT COALESCE(SUM(amount), 0) AS total_expenses
             FROM cash_transactions
             WHERE user_id = ? AND type = 'expense' AND status = 'confirmed'
             AND created_at BETWEEN ? AND ?`,
            [livreurUserId, startDateTime, endDateTime]
        );
        const totalExpenses = Math.abs(parseFloat(expenseRows[0]?.total_expenses || 0));


        // --- 4. Données pour le graphique (omises pour la concision) ---
        const [chartDataRows] = await connection.execute(
            `SELECT DATE(created_at) as date, COUNT(id) as count
             FROM orders
             WHERE deliveryman_id = ? AND status IN ('delivered', 'failed_delivery')
             AND created_at BETWEEN ? AND ?
             GROUP BY DATE(created_at) ORDER BY date ASC`,
            [livreurUserId, startDateTime, endDateTime]
        );
        const chartData = {
            labels: chartDataRows.map(row => moment(row.date).format('DD/MM')),
            data: chartDataRows.map(row => row.count)
        };

        // --- Assemblage des résultats ---
        return {
            details: {
                id: livreurDetails.id,
                name: livreurDetails.name,
                status: livreurDetails.user_status,
                vehicle_type: livreurDetails.vehicle_type,
                base_salary: livreurDetails.base_salary,
                commission_rate: livreurDetails.commission_rate
            },
            stats: {
                received: parseInt(courseStats.received || 0),
                delivered: parseInt(courseStats.delivered || 0),
                livrabilite_rate: (courseStats.received > 0) ? (parseInt(courseStats.delivered || 0) / parseInt(courseStats.received || 0)) : 0,
                workedDays: parseInt(courseStats.workedDays || 0),
                ca_delivery_fees: parseFloat(courseStats.ca_delivery_fees || 0),
                total_expenses: totalExpenses
            },
            personalGoals: {
                daily: livreurDetails.personal_goal_daily,
                weekly: livreurDetails.personal_goal_weekly,
                monthly: livreurDetails.personal_goal_monthly,
            },
            chartData: chartData
        };

    } catch (error) {
        console.error(`Erreur dans getPerformanceData pour livreur ${livreurUserId}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Met à jour les objectifs personnels d'un livreur dans la table livreurs. (Pas la source de l'erreur actuelle)
 */
const updatePersonalGoals = async (livreurUserId, goals) => {
    const dailyGoal = goals.daily !== null && !isNaN(parseInt(goals.daily)) ? parseInt(goals.daily) : null;
    const weeklyGoal = goals.weekly !== null && !isNaN(parseInt(goals.weekly)) ? parseInt(goals.weekly) : null;
    const monthlyGoal = goals.monthly !== null && !isNaN(parseInt(goals.monthly)) ? parseInt(goals.monthly) : null;

    const connection = await dbConnection.getConnection();
    try {
        const [result] = await connection.execute(
            `UPDATE livreurs
             SET personal_goal_daily = ?,
                 personal_goal_weekly = ?,
                 personal_goal_monthly = ?
             WHERE user_id = ?`,
            [dailyGoal, weeklyGoal, monthlyGoal, livreurUserId]
        );
        return { success: result.affectedRows > 0 };
    } catch (error) {
        console.error(`Erreur dans updatePersonalGoals pour livreur ${livreurUserId}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Met à jour les paramètres spécifiques d'un livreur (dans la table 'livreurs').
 * Crée l'entrée si elle n'existe pas.
 */
const upsertLivreurSettings = async (userId, settingsData) => {
     try {
         const [result] = await dbConnection.execute(
             `INSERT INTO livreurs (user_id, vehicle_type, base_salary, commission_rate, monthly_objective)
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                 vehicle_type = VALUES(vehicle_type),
                 base_salary = VALUES(base_salary),
                 commission_rate = VALUES(commission_rate),
                 monthly_objective = VALUES(monthly_objective),
                 updated_at = NOW()`,
             [
                 userId,
                 settingsData.vehicle_type,
                 settingsData.base_salary || null,
                 settingsData.commission_rate || null,
                 settingsData.monthly_objective || null
             ]
         );
         return { success: result.affectedRows > 0 || result.insertId > 0 };
     } catch (error) {
        console.error(`Erreur dans upsertLivreurSettings pour user ${userId}:`, error);
        throw error;
     }
};

/**
 * Récupère les paramètres spécifiques d'un livreur (depuis la table 'livreurs').
 */
const findLivreurSettings = async (userId) => {
    const connection = await dbConnection.getConnection();
    try {
        const [rows] = await connection.execute(
            `SELECT vehicle_type, base_salary, commission_rate, monthly_objective
             FROM livreurs
             WHERE user_id = ?`,
            [userId]
        );
        return rows[0] || null;
    } catch (error) {
       console.error(`Erreur dans findLivreurSettings pour user ${userId}:`, error);
       throw error;
    } finally {
        if (connection) connection.release();
    }
};


module.exports = {
    init,
    getPerformanceData,
    updatePersonalGoals,
    upsertLivreurSettings,
    findLivreurSettings
};