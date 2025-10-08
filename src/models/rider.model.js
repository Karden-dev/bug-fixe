// src/models/rider.model.js
const moment = require('moment');

let dbConnection;

module.exports = {
    init: (connection) => { 
        dbConnection = connection;
    },
    
    // Récupère les commandes spécifiques à un livreur
    findRiderOrders: async (filters) => {
        const connection = await dbConnection.getConnection();
        try {
            // Log en mode DEBUG: Activé pour voir les filtres en cas de crash
            console.log("DEBUG: [RiderModel] Exécution de findRiderOrders avec filtres:", filters);

            // Requête corrigée pour éviter les erreurs d'espace de début de ligne
            let query = `SELECT o.*, s.name AS shop_name, u.name AS deliveryman_name
FROM orders o
LEFT JOIN shops s ON o.shop_id = s.id
LEFT JOIN users u ON o.deliveryman_id = u.id
WHERE o.deliveryman_id = ?`;

            const params = [filters.deliverymanId];

            if (filters.status && filters.status.length > 0) {
                // S'assure que filters.status est un tableau
                const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];

                const statusPlaceholders = statusArray.map(() => '?').join(',');
                query += ` AND o.status IN (${statusPlaceholders})`;
                params.push(...statusArray);
            }
            
            // Ajout des filtres de recherche et de date
            if (filters.search) {
                query += ` AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.delivery_location LIKE ? OR s.name LIKE ?)`;
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
            if (filters.startDate) query += ` AND o.created_at >= ?`, params.push(moment(filters.startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'));
            if (filters.endDate) query += ` AND o.created_at <= ?`, params.push(moment(filters.endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss'));
            
            query += ` ORDER BY o.created_at DESC`;

            const [rows] = await connection.execute(query, params);
            
            // Log réduit: Ne pas saturer le terminal avec les réussites
            // console.log("LOG: [RiderModel] findRiderOrders Query Success, rows returned:", rows.length); 
            
            return rows;
        } catch(error) {
            console.error("Erreur SQL dans RiderModel.findRiderOrders:", error.message);
            throw error; // Renvoyer l'erreur pour la gestion par le contrôleur
        } finally {
            connection.release();
        }
    },
    
    // Récupère les compteurs par statut
    getOrdersCounts: async (riderId) => {
        const connection = await dbConnection.getConnection();
        try {
            // Log en mode DEBUG: Activé pour voir l'ID en cas de crash
            console.log("DEBUG: [RiderModel] Exécution de getOrdersCounts pour l'ID:", riderId);

const [rows] = await connection.execute(
 'SELECT status, COUNT(*) as count FROM orders WHERE deliveryman_id = ? GROUP BY status',
 [riderId]
 );
 
const counts = rows.reduce((acc, row) => {
acc[row.status] = row.count;
 return acc;
}, {});
 
 // Log réduit: Ne pas saturer le terminal avec les réussites
 // console.log("LOG: [RiderModel] getOrdersCounts Query Success, counts:", counts);
return counts;
 } catch(error) {
 console.error("Erreur SQL dans RiderModel.getOrdersCounts:", error.message);
 throw error;
 } finally {
 connection.release();
}
 },
    
    // NOUVEAU: Récupère les notifications basées sur l'historique des commandes
    findRiderNotifications: async (riderId) => {
        const connection = await dbConnection.getConnection();
        try {
            console.log("DEBUG: [RiderModel] Exécution de findRiderNotifications pour l'ID:", riderId);
            const [rows] = await connection.execute(
                `SELECT 
                    oh.id, oh.action, oh.created_at, oh.order_id 
                FROM 
                    order_history oh 
                WHERE 
                    oh.user_id = ? 
                ORDER BY oh.created_at DESC 
                LIMIT 10`,
                [riderId]
            );
            return rows;
        } catch(error) {
            console.error("Erreur SQL dans RiderModel.findRiderNotifications:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }
};