// src/models/user.model.js
let dbConnection;

/**
 * Initialise le modèle avec la connexion à la base de données.
 * @param {object} connection - Le pool de connexion à la base de données.
 */
const init = (connection) => {
    dbConnection = connection;
};

// --- Fonctions pour la gestion des UTILISATEURS ---

const create = async (phone_number, pin, name, role) => {
    const query = 'INSERT INTO users (phone_number, pin, name, role, status) VALUES (?, ?, ?, ?, ?)';
    const [result] = await dbConnection.execute(query, [phone_number, pin, name, role, 'actif']);
    return result;
};

const findByPhoneNumber = async (phone_number) => {
    // Correction: utilisation de .trim() pour enlever les espaces
    const cleanedPhoneNumber = phone_number.trim();
    const query = 'SELECT * FROM users WHERE phone_number = ?';
    const [rows] = await dbConnection.execute(query, [cleanedPhoneNumber]);
    return rows[0];
};

const findById = async (id) => {
    const query = 'SELECT id, name, phone_number, role, status, created_at FROM users WHERE id = ?';
    const [rows] = await dbConnection.execute(query, [id]);
    return rows[0];
};

const findAll = async (filters = {}) => {
    let query = "SELECT id, name, phone_number, role, status, created_at FROM users";
    const params = [];
    if (filters.search) {
        query += ' WHERE name LIKE ?';
        params.push(`%${filters.search}%`);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await dbConnection.execute(query, params);
    return rows;
};

const update = async (id, name, phone_number, role, status) => {
    const query = 'UPDATE users SET name = ?, phone_number = ?, role = ?, status = ? WHERE id = ?';
    const [result] = await dbConnection.execute(query, [name, phone_number, role, status, id]);
    return result;
};

const remove = async (id) => {
    const query = 'DELETE FROM users WHERE id = ?';
    const [result] = await dbConnection.execute(query, [id]);
    return result;
};

const updatePin = async (id, pin) => {
    const query = 'UPDATE users SET pin = ? WHERE id = ?';
    const [result] = await dbConnection.execute(query, [pin, id]);
    return result;
};

const updateStatus = async (id, status) => {
     const query = 'UPDATE users SET status = ? WHERE id = ?';
     const [result] = await dbConnection.execute(query, [status, id]);
     return result;
};


// --- Fonctions pour les statistiques des LIVREURS ---

const findAllDeliverymen = async () => {
    // Cette fonction est utilisée pour l'assignation de commande et n'a pas besoin de jointure
    const query = "SELECT id, name FROM users WHERE role = 'livreur' AND status = 'actif' ORDER BY name ASC";
    const [rows] = await dbConnection.execute(query);
    return rows;
};

/**
 * Récupère les données de performance pour le classement sur la page admin (deliverymen.html).
 * Inclut la jointure avec la nouvelle table 'livreurs'.
 */
const findDeliverymenPerformance = async (filters = {}) => {
    const { startDate, endDate, search } = filters;
    const params = [];

    let dateConditions = '';
    if (startDate && endDate) {
        dateConditions = 'AND DATE(o.created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    let searchQuery = '';
    if (search) {
        searchQuery = 'AND u.name LIKE ?';
        params.push(`%${search}%`);
    }

    const query = `
        SELECT
            u.id,
            u.name,
            u.status,
            l.vehicle_type,
            l.base_salary,
            l.commission_rate, -- Colonne maintenant lue après l'étape SQL
            COALESCE(SUM(CASE WHEN o.deliveryman_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS received_orders,
            COALESCE(SUM(CASE WHEN o.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_orders,
            COALESCE(SUM(CASE WHEN o.status IN ('cancelled', 'failed_delivery', 'reported') THEN 1 ELSE 0 END), 0) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END), 0) AS delivered_orders,
            COALESCE(SUM(CASE WHEN o.status IN ('delivered', 'failed_delivery') THEN o.delivery_fee ELSE 0 END), 0) AS total_revenue
        FROM users u
        LEFT JOIN livreurs l ON u.id = l.user_id -- Jointure avec la nouvelle table livreurs
        LEFT JOIN orders o ON u.id = o.deliveryman_id ${dateConditions}
        WHERE u.role = 'livreur' ${searchQuery}
        GROUP BY u.id, u.name, u.status, l.vehicle_type, l.base_salary, l.commission_rate
        ORDER BY delivered_orders DESC, total_revenue DESC;
    `;
    const [rows] = await dbConnection.execute(query, params);
    return rows;
};

const getDeliverymenStats = async (startDate, endDate) => {
    // Total des livreurs dans la table users (tous statuts confondus pour le total général)
    const [totalRows] = await dbConnection.execute("SELECT COUNT(*) as total FROM users WHERE role = 'livreur'");
    const totalDeliverymen = Number(totalRows[0].total);

    // Compte les actifs et inactifs pour le total
    const [statusCounts] = await dbConnection.execute(`
        SELECT
            SUM(CASE WHEN status = 'actif' THEN 1 ELSE 0 END) AS total_actif,
            SUM(CASE WHEN status = 'inactif' THEN 1 ELSE 0 END) AS total_inactif
        FROM users
        WHERE role = 'livreur'
    `);
    const totalActif = Number(statusCounts[0].total_actif);


    let statsQuery = `
        SELECT
            COALESCE(COUNT(DISTINCT deliveryman_id), 0) as working, -- Nombre de livreurs ayant eu au moins 1 commande
            COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
            COALESCE(SUM(CASE WHEN status = 'cancelled' OR status = 'reported' THEN 1 ELSE 0 END), 0) as cancelled, -- Annulées/Reportées
            COALESCE(SUM(CASE WHEN status IN ('delivered', 'failed_delivery') THEN 1 ELSE 0 END), 0) as delivered,
            COALESCE(COUNT(id), 0) as received_all_statuses -- Toutes reçues
        FROM orders`;

    const params = [];
    if (startDate && endDate) {
        statsQuery += ' WHERE DATE(created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    const [statsRows] = await dbConnection.execute(statsQuery, params);
    const stats = statsRows[0];
    const workingDeliverymen = Number(stats.working);

    // Calcule le nombre d'absents (Livreurs actifs totaux - Livreurs qui ont eu des commandes sur la période)
    const absentDeliverymen = totalActif - workingDeliverymen;

    return {
        total: totalActif, // Seul le total actif est pertinent pour la gestion de l'activité
        working: workingDeliverymen,
        absent: absentDeliverymen > 0 ? absentDeliverymen : 0, // Ne pas avoir de valeur négative
        availability_rate: totalActif > 0 ? ((workingDeliverymen / totalActif) * 100) : 0,
        in_progress: Number(stats.in_progress),
        delivered: Number(stats.delivered),
        received: Number(stats.received_all_statuses),
        cancelled: Number(stats.cancelled)
    };
};

module.exports = {
    init,
    create,
    findByPhoneNumber,
    findById,
    findAll,
    update,
    remove,
    updatePin,
    updateStatus, // Ajouté pour permettre la modification du statut (dans la modale admin)
    findAllDeliverymen,
    findDeliverymenPerformance, // MIS À JOUR AVEC JOIN
    getDeliverymenStats
};