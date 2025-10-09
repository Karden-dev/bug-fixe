// src/models/order.model.js
const moment = require('moment');
const balanceService = require('../services/balance.service');
// L'import de cashModel n'est plus nécessaire ici pour la création automatique
// const cashModel = require('./cash.model'); 

let dbConnection;

module.exports = {
    init: (connection) => { 
        dbConnection = connection;
    },
    
    create: async (orderData) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            const orderQuery = `INSERT INTO orders (shop_id, customer_name, customer_phone, delivery_location, article_amount, delivery_fee, expedition_fee, status, payment_status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
            const [orderResult] = await connection.execute(orderQuery, [
                orderData.shop_id, orderData.customer_name, orderData.customer_phone,
                orderData.delivery_location, orderData.article_amount, orderData.delivery_fee,
                orderData.expedition_fee, 'pending', 'pending', orderData.created_by
            ]);
            const orderId = orderResult.insertId;
            const itemQuery = 'INSERT INTO order_items (order_id, item_name, quantity, amount) VALUES (?, ?, ?, ?)';
            for (const item of orderData.items) {
                await connection.execute(itemQuery, [orderId, item.item_name, item.quantity, item.amount]);
            }
            
            const historyQuery = 'INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)';
            await connection.execute(historyQuery, [orderId, 'Commande créée', orderData.created_by]);
            
            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    findById: async (id) => {
        const query = `
            SELECT o.*, s.name as shop_name, u.name as deliveryman_name, c.name as creator_name
            FROM orders o
            LEFT JOIN shops s ON o.shop_id = s.id
            LEFT JOIN users u ON o.deliveryman_id = u.id
            LEFT JOIN users c ON o.created_by = c.id
            WHERE o.id = ?
        `;
        const [rows] = await dbConnection.execute(query, [id]);
        if (rows.length === 0) return null;

        const order = rows[0];
        const [items] = await dbConnection.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
        order.items = items;
        
        const [history] = await dbConnection.execute(`
            SELECT h.*, u.name as user_name 
            FROM order_history h 
            LEFT JOIN users u ON h.user_id = u.id 
            WHERE h.order_id = ? ORDER BY h.created_at DESC`, [id]);
        order.history = history;

        return order;
    },

    findAll: async (filters) => {
        let query = `
            SELECT o.*, s.name as shop_name, u.name as deliveryman_name
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            LEFT JOIN users u ON o.deliveryman_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.startDate && filters.endDate) {
            query += ' AND DATE(o.created_at) BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }
        if (filters.status) {
            query += ' AND o.status = ?';
            params.push(filters.status);
        }
        if (filters.deliverymanId) {
            query += ' AND o.deliveryman_id = ?';
            params.push(filters.deliverymanId);
        }
        if (filters.shopId) {
            query += ' AND o.shop_id = ?';
            params.push(filters.shopId);
        }
        if (filters.search) {
            query += ' AND (o.id LIKE ? OR o.customer_phone LIKE ? OR s.name LIKE ? OR u.name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY o.created_at DESC';
        if (filters.limit && filters.offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(filters.limit), parseInt(filters.offset));
        }

        const [rows] = await dbConnection.execute(query, params);
        return rows;
    },

    count: async (filters) => {
        let query = `
            SELECT COUNT(o.id) as total
            FROM orders o
            JOIN shops s ON o.shop_id = s.id
            LEFT JOIN users u ON o.deliveryman_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (filters.startDate && filters.endDate) {
            query += ' AND DATE(o.created_at) BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }
        if (filters.status) {
            query += ' AND o.status = ?';
            params.push(filters.status);
        }
        if (filters.deliverymanId) {
            query += ' AND o.deliveryman_id = ?';
            params.push(filters.deliverymanId);
        }
        if (filters.shopId) {
            query += ' AND o.shop_id = ?';
            params.push(filters.shopId);
        }
        if (filters.search) {
            query += ' AND (o.id LIKE ? OR o.customer_phone LIKE ? OR s.name LIKE ? OR u.name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        const [rows] = await dbConnection.execute(query, params);
        return rows[0].total;
    },
    
    update: async (id, data, userId) => {
        const allowedFields = ['shop_id', 'deliveryman_id', 'customer_name', 'customer_phone', 'delivery_location', 'article_amount', 'delivery_fee', 'expedition_fee', 'status', 'payment_status', 'amount_received'];
        const fields = Object.keys(data).filter(key => allowedFields.includes(key));
        if (fields.length === 0) {
            throw new Error("Aucun champ valide à mettre à jour.");
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const query = `UPDATE orders SET ${setClause}, updated_by = ? WHERE id = ?`;
        
        const params = fields.map(field => data[field]);
        params.push(userId, id);

        const [result] = await dbConnection.execute(query, params);
        
        // Ajout à l'historique
        const historyDetails = fields.map(field => `${field}: ${data[field]}`).join('; ');
        await dbConnection.execute(
            'INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)',
            [id, `Mise à jour: ${historyDetails}`, userId]
        );

        return result;
    },

    /**
     * ## FONCTION MISE À JOUR ##
     * Supprime toute la logique de création de transaction de versement.
     * Met à jour uniquement le statut de la commande et son historique.
     */
    updateStatus: async (orderId, newStatus, amountReceived, paymentStatus, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();

            const [orderRows] = await connection.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (orderRows.length === 0) {
                throw new Error("Commande non trouvée.");
            }
            const order = orderRows[0];

            const updateData = { status: newStatus };
            if (paymentStatus) {
                updateData.payment_status = paymentStatus;
            }
            if (amountReceived !== null && amountReceived !== undefined) {
                updateData.amount_received = parseFloat(amountReceived);
            }

            const fields = Object.keys(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const query = `UPDATE orders SET ${setClause}, updated_by = ? WHERE id = ?`;
            
            const params = fields.map(field => updateData[field]);
            params.push(userId, orderId);
            
            await connection.execute(query, params);

            const historyMessage = `Statut changé à : ${newStatus}`;
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, historyMessage, userId]);

            // --- LOGIQUE DE CRÉATION DE VERSEMENT AUTOMATIQUE SUPPRIMÉE ---
            // L'ancien code qui créait une transaction "remittance" ici a été retiré.
            // La responsabilité est maintenant entièrement gérée par la page "Caisse".

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },
        
    assignDeliveryman: async (orderId, deliverymanId, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            
            await module.exports.update(orderId, { deliveryman_id: deliverymanId }, userId);
            await module.exports.updateStatus(orderId, 'in_progress', null, 'pending', userId);

            const [deliverymanRows] = await connection.execute('SELECT name FROM users WHERE id = ?', [deliverymanId]);
            const deliverymanName = deliverymanRows[0]?.name || 'Inconnu';
            const historyMessage = `Commande assignée au livreur : ${deliverymanName}`;
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, historyMessage, userId]);
            
            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};