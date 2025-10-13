// src/models/rider.model.js
const moment = require('moment');

let dbConnection;

module.exports = {
    init: (connection) => { 
        dbConnection = connection;
    },
    
    findRiderOrders: async (filters) => {
        const connection = await dbConnection.getConnection();
        try {
            let query = `SELECT 
                            o.*, 
                            s.name AS shop_name, 
                            u.name AS deliveryman_name,
                            (SELECT GROUP_CONCAT(CONCAT(oi.item_name, ' (x', oi.quantity, ')') SEPARATOR ', ') 
                             FROM order_items oi WHERE oi.order_id = o.id) as items_list
                         FROM orders o
                         LEFT JOIN shops s ON o.shop_id = s.id
                         LEFT JOIN users u ON o.deliveryman_id = u.id
                         WHERE o.deliveryman_id = ?`;

            const params = [filters.deliverymanId];

            if (filters.status && filters.status !== 'all') {
                query += ' AND o.status = ?';
                params.push(filters.status);
            }
            if (filters.search) {
                query += ' AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.id LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }
            if (filters.startDate && filters.endDate) {
                query += ' AND DATE(o.created_at) BETWEEN ? AND ?';
                params.push(filters.startDate, filters.endDate);
            }

            query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

            const [rows] = await connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error("Erreur SQL dans RiderModel.findRiderOrders:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    },
    
    getOrdersCounts: async (riderId) => {
        const connection = await dbConnection.getConnection();
        try {
            const [rows] = await connection.execute(
                `SELECT status, COUNT(*) as count FROM orders WHERE deliveryman_id = ? GROUP BY status`,
                [riderId]
            );
            const counts = rows.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {});
            
            return counts;
        } catch(error) {
            console.error("Erreur SQL dans RiderModel.getOrdersCounts:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    },
    
    findRiderNotifications: async (riderId) => {
        const connection = await dbConnection.getConnection();
        try {
            const [rows] = await connection.execute(
                `SELECT 
                    oh.id, oh.action, oh.created_at, oh.order_id, o.id as tracking_id
                FROM 
                    order_history oh
                JOIN 
                    orders o ON oh.order_id = o.id
                WHERE 
                    oh.user_id = ? AND oh.action = 'assigned'
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