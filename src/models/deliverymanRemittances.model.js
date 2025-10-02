// src/models/deliverymanRemittances.model.js

let dbConnection; // La connexion (pool) sera stockée ici

const DeliverymanRemittancesModel = {};

/**
 * Initialise le modèle avec l'objet de connexion à la base de données.
 * Ceci remplace le require('../config/db.config') manquant.
 * @param {Object} connection - L'objet pool de connexion à la DB.
 */
DeliverymanRemittancesModel.init = (connection) => { 
    dbConnection = connection;
};

/**
 * Récupère le statut consolidé des versements de tous les livreurs pour une date donnée.
 * Ce statut inclut le Montant Attendu (Créance) et le Montant Confirmé.
 * @param {string} date - Date à consolider (format YYYY-MM-DD).
 * @returns {Promise<Array>} Liste des versements consolidés par livreur.
 */
DeliverymanRemittancesModel.getDailySummary = async (date) => {
    const connection = await dbConnection.getConnection();
    try {
        // La date est utilisée pour filtrer les commandes et les versements
        const sql = `
            SELECT
                u.id AS deliveryman_id,
                u.full_name AS deliveryman_name,
                u.phone AS deliveryman_phone,

                -- 1. CALCUL DU MONTANT ATTENDU (CREANCE)
                COALESCE(SUM(
                    CASE
                        -- Commandes à encaisser (COD)
                        WHEN o.payment_type = 'COD' AND o.status IN ('Delivered', 'Failed') 
                        THEN (o.total_price - o.shipping_cost)
                        ELSE 0
                    END
                ), 0) AS expected_amount,
                
                -- 2. MONTANT DÉJÀ CONFIRMÉ PAR LA CAISSE (Versements du livreur)
                COALESCE(SUM(
                    CASE
                        -- Montant confirmé par la caisse (Montant total du versement r.amount)
                        WHEN ro.order_id IS NOT NULL AND DATE(r.remittance_date) = ? 
                        THEN ro.amount 
                        ELSE 0
                    END
                ), 0) AS confirmed_amount,
                
                -- 3. COMPTEURS DE COMMANDES
                COALESCE(SUM(
                    CASE
                        -- Compter toutes les commandes livrées/ratées pour la journée
                        WHEN o.status IN ('Delivered', 'Failed') THEN 1 
                        ELSE 0
                    END
                ), 0) AS total_orders,

                COALESCE(SUM(
                    CASE
                        -- Compter les commandes dont le versement a été fait (liées à remittance_orders)
                        WHEN ro.order_id IS NOT NULL THEN 1 
                        ELSE 0
                    END
                ), 0) AS confirmed_orders,
                
                -- Dépenses déclarées par le livreur, à déduire du Montant Attendu (doit être géré plus tard)
                -- Subquery ou LEFT JOIN sur delivery_expenses pour obtenir le total des dépenses du jour
                (
                    SELECT COALESCE(SUM(de.amount), 0)
                    FROM delivery_expenses de
                    WHERE de.deliveryman_id = u.id 
                    AND DATE(de.expense_date) = ?
                ) AS daily_expenses_total

            FROM users u
            -- Joindre seulement les utilisateurs qui sont des livreurs
            JOIN roles rl ON u.role_id = rl.id AND rl.name = 'DELIVERYMAN'
            
            -- Joindre les commandes assignées au livreur pour le jour
            LEFT JOIN orders o ON o.deliveryman_id = u.id AND DATE(o.delivery_date) = ?
            
            -- Joindre les liens de versement et les versements confirmés
            LEFT JOIN remittance_orders ro ON o.id = ro.order_id
            LEFT JOIN remittances r ON ro.remittance_id = r.id

            GROUP BY u.id
            HAVING total_orders > 0 OR confirmed_amount > 0 
            ORDER BY u.full_name ASC;
        `;
        
        // Le paramètre de date doit être passé 3 fois pour les JOINS et la subquery
        const [rows] = await connection.execute(sql, [date, date, date]);
        return rows;
    } finally {
        connection.release();
    }
};

/**
 * Récupère le détail des commandes (Attente/Confirmé) pour un livreur donné et une date donnée.
 * @param {number} deliverymanId - ID du livreur.
 * @param {string} date - Date des commandes (format YYYY-MM-DD).
 * @returns {Promise<Array>} Liste détaillée des commandes du livreur.
 */
DeliverymanRemittancesModel.getDeliverymanDetails = async (deliverymanId, date) => {
    const connection = await dbConnection.getConnection();
    try {
        const sql = `
            SELECT
                o.id AS order_id,
                o.ref AS order_ref,
                o.total_price,
                o.shipping_cost,
                (o.total_price - o.shipping_cost) AS amount_due, -- Montant dû pour la commande
                o.status,
                s.name AS shop_name,
                -- Vérifier si la commande a été confirmée dans un versement
                CASE
                    WHEN ro.order_id IS NOT NULL THEN 1
                    ELSE 0
                END AS is_confirmed,
                ro.amount AS confirmed_remittance_amount, -- Montant versé si confirmé
                r.remittance_date
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            LEFT JOIN remittance_orders ro ON o.id = ro.order_id
            LEFT JOIN remittances r ON ro.remittance_id = r.id
            
            WHERE o.deliveryman_id = ?
            AND DATE(o.delivery_date) = ?
            AND o.payment_type = 'COD' -- Seulement les commandes à encaisser
            AND o.status IN ('Delivered', 'Failed') -- Seulement les commandes qui nécessitent un versement
            
            ORDER BY o.id ASC;
        `;
        const [rows] = await connection.execute(sql, [deliverymanId, date]);
        return rows;
    } finally {
        connection.release();
    }
};


module.exports = DeliverymanRemittancesModel;