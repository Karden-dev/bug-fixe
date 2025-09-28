// src/models/order.model.js
const moment = require('moment');
let cashService;

let dbConnection;

/**
 * Calcule l'impact financier d'un statut de commande spécifique.
 * @param {object} order - L'objet commande (doit inclure les infos du marchand: bill_packaging, packaging_price).
 * @param {string} status - Le statut à évaluer ('delivered', 'failed_delivery', etc.).
 * @param {string} paymentStatus - Le statut de paiement.
 * @returns {object} Un objet contenant les deltas pour le bilan.
 */
const getBalanceImpactForStatus = (order, status, paymentStatus) => {
    const balanceImpact = {
        orders_delivered: 0,
        revenue_articles: 0,
        delivery_fees: 0,
        packaging_fees: 0
    };

    if (status === 'delivered') {
        balanceImpact.orders_delivered = 1;
        balanceImpact.revenue_articles = paymentStatus === 'cash' ? parseFloat(order.article_amount || 0) : 0;
        balanceImpact.delivery_fees = parseFloat(order.delivery_fee || 0);
        // La logique correcte est ici : on vérifie si le marchand est éligible
        balanceImpact.packaging_fees = order.bill_packaging ? parseFloat(order.packaging_price || 0) : 0;
    } else if (status === 'failed_delivery') {
        balanceImpact.orders_delivered = 1; // Compte comme traitée mais pas de frais d'emballage
        balanceImpact.revenue_articles = parseFloat(order.amount_received || 0);
        balanceImpact.delivery_fees = parseFloat(order.delivery_fee || 0);
    }
    
    return balanceImpact;
};

/**
 * Met à jour dynamiquement le bilan journalier d'un marchand dans la table `daily_shop_balances`.
 * @param {object} connection - La connexion à la base de données.
 * @param {object} data - Les données à incrémenter ou décrémenter.
 */
const updateDailyBalance = async (connection, data) => {
    const {
        shop_id,
        date, // Doit être au format 'YYYY-MM-DD'
        orders_sent = 0,
        orders_delivered = 0,
        revenue_articles = 0,
        delivery_fees = 0,
        expedition_fees = 0,
        packaging_fees = 0
    } = data;

    if (!shop_id || !date) {
        console.error("updateDailyBalance: shop_id et date sont requis.");
        return;
    }

    const remittance_impact = revenue_articles - delivery_fees - expedition_fees - packaging_fees;

    const query = `
        INSERT INTO daily_shop_balances (report_date, shop_id, total_orders_sent, total_orders_delivered, total_revenue_articles, total_delivery_fees, total_expedition_fees, total_packaging_fees, remittance_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE
            total_orders_sent = total_orders_sent + VALUES(total_orders_sent),
            total_orders_delivered = total_orders_delivered + VALUES(total_orders_delivered),
            total_revenue_articles = total_revenue_articles + VALUES(total_revenue_articles),
            total_delivery_fees = total_delivery_fees + VALUES(total_delivery_fees),
            total_expedition_fees = total_expedition_fees + VALUES(total_expedition_fees),
            total_packaging_fees = total_packaging_fees + VALUES(total_packaging_fees),
            remittance_amount = remittance_amount + VALUES(remittance_amount);
    `;

    await connection.execute(query, [
        date, shop_id, orders_sent, orders_delivered, revenue_articles,
        delivery_fees, expedition_fees, packaging_fees, remittance_impact
    ]);
};


module.exports = {
    init: (connection) => { 
        dbConnection = connection;
    },
    setCashService: (service) => {
        cashService = service;
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
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, 'Commande créée', orderData.created_by]);
            await updateDailyBalance(connection, {
                shop_id: orderData.shop_id,
                date: moment().format('YYYY-MM-DD'),
                orders_sent: 1,
                expedition_fees: parseFloat(orderData.expedition_fee || 0)
            });
            await connection.commit();
            return { success: true, orderId };
        } catch (error) {
            await connection.rollback(); throw error;
        } finally {
            connection.release();
        }
    },
    
    update: async (orderId, orderData, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();

            const [oldOrderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            if (oldOrderRows.length === 0) throw new Error("Commande non trouvée.");
            const oldOrder = oldOrderRows[0];
            const oldDate = moment(oldOrder.created_at).format('YYYY-MM-DD');

            const oldImpact = getBalanceImpactForStatus(oldOrder, oldOrder.status, oldOrder.payment_status);
            await updateDailyBalance(connection, {
                shop_id: oldOrder.shop_id, date: oldDate,
                orders_sent: -1,
                orders_delivered: -oldImpact.orders_delivered,
                revenue_articles: -oldImpact.revenue_articles,
                delivery_fees: -oldImpact.delivery_fees,
                packaging_fees: -oldImpact.packaging_fees,
                expedition_fees: -parseFloat(oldOrder.expedition_fee || 0)
            });

            const { items, ...orderFields } = orderData;
            const fieldsToUpdate = Object.keys(orderFields).map(key => `${key} = ?`).join(', ');
            const params = [...Object.values(orderFields), userId, orderId];
            await connection.execute(`UPDATE orders SET ${fieldsToUpdate}, updated_by = ?, updated_at = NOW() WHERE id = ?`, params);

            if (items) {
                await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
                const itemQuery = 'INSERT INTO order_items (order_id, item_name, quantity, amount) VALUES (?, ?, ?, ?)';
                for (const item of items) {
                    await connection.execute(itemQuery, [orderId, item.item_name, item.quantity, item.amount]);
                }
            }
            
            const [newOrderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            const newOrder = newOrderRows[0];
            const newDate = moment(newOrder.created_at).format('YYYY-MM-DD');
            const newImpact = getBalanceImpactForStatus(newOrder, newOrder.status, newOrder.payment_status);
            await updateDailyBalance(connection, {
                shop_id: newOrder.shop_id, date: newDate,
                orders_sent: 1,
                orders_delivered: newImpact.orders_delivered,
                revenue_articles: newImpact.revenue_articles,
                delivery_fees: newImpact.delivery_fees,
                packaging_fees: newImpact.packaging_fees,
                expedition_fees: parseFloat(newOrder.expedition_fee || 0)
            });

            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, 'Mise à jour de la commande', userId]);
            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback(); throw error;
        } finally {
            connection.release();
        }
    },

    updateStatus: async (orderId, newStatus, amountReceived = null, newPaymentStatus = null, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            const [orderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            const order = orderRows[0];
            if (!order) throw new Error("Commande non trouvée.");
            const orderDate = moment(order.created_at).format('YYYY-MM-DD');

            const oldImpact = getBalanceImpactForStatus(order, order.status, order.payment_status);
            await updateDailyBalance(connection, {
                shop_id: order.shop_id, date: orderDate,
                orders_delivered: -oldImpact.orders_delivered,
                revenue_articles: -oldImpact.revenue_articles,
                delivery_fees: -oldImpact.delivery_fees,
                packaging_fees: -oldImpact.packaging_fees
            });

            let historyMessage = `Statut changé en ${newStatus}`;
            const updatedOrderData = { ...order, status: newStatus };
            if (newStatus === 'delivered') { updatedOrderData.payment_status = newPaymentStatus; } 
            else if (newStatus === 'failed_delivery') {
                updatedOrderData.amount_received = amountReceived;
                updatedOrderData.payment_status = (amountReceived > 0) ? 'cash' : 'paid_to_supplier';
                historyMessage += ` (Montant perçu: ${amountReceived} FCFA)`;
            }
            const newImpact = getBalanceImpactForStatus(updatedOrderData, newStatus, updatedOrderData.payment_status);
            await updateDailyBalance(connection, {
                shop_id: order.shop_id, date: orderDate,
                orders_delivered: newImpact.orders_delivered,
                revenue_articles: newImpact.revenue_articles,
                delivery_fees: newImpact.delivery_fees,
                packaging_fees: newImpact.packaging_fees
            });

            await connection.execute('UPDATE orders SET status = ?, payment_status = ?, amount_received = ?, updated_by = ?, updated_at = NOW() WHERE id = ?', [newStatus, updatedOrderData.payment_status, amountReceived, userId, orderId]);
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, historyMessage, userId]);
            await connection.commit();
        } catch (error) {
            await connection.rollback(); throw error;
        } finally {
            connection.release();
        }
    },
    
    remove: async (orderId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();

            const [orderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            if (orderRows.length === 0) throw new Error("Commande non trouvée.");
            const order = orderRows[0];
            const orderDate = moment(order.created_at).format('YYYY-MM-DD');

            const impact = getBalanceImpactForStatus(order, order.status, order.payment_status);
            await updateDailyBalance(connection, {
                shop_id: order.shop_id, date: orderDate,
                orders_sent: -1,
                orders_delivered: -impact.orders_delivered,
                revenue_articles: -impact.revenue_articles,
                delivery_fees: -impact.delivery_fees,
                packaging_fees: -impact.packaging_fees,
                expedition_fees: -parseFloat(order.expedition_fee || 0)
            });

            await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
            const [result] = await connection.execute('DELETE FROM orders WHERE id = ?', [orderId]);
            
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback(); throw error;
        } finally {
            connection.release();
        }
    },
    
    findAll: async (filters) => {
        const connection = await dbConnection.getConnection();
        try {
            let query = `
                SELECT 
                    o.*, s.name AS shop_name, u.name AS deliveryman_name,
                    GROUP_CONCAT(oi.item_name) AS item_names
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN shops s ON o.shop_id = s.id
                LEFT JOIN users u ON o.deliveryman_id = u.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.search) {
                query += ` AND (o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.delivery_location LIKE ? OR s.name LIKE ?)`;
                params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
            }
            if (filters.startDate) {
                query += ` AND o.created_at >= ?`;
                params.push(moment(filters.startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'));
            }
            if (filters.endDate) {
                query += ` AND o.created_at <= ?`;
                params.push(moment(filters.endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss'));
            }
            if (filters.status) {
                query += ` AND o.status = ?`;
                params.push(filters.status);
            }
            query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

            const [rows] = await connection.execute(query, params);
            const ordersWithDetails = await Promise.all(rows.map(async (order) => {
                const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
                const [history] = await connection.execute(`SELECT oh.*, u.name as user_name FROM order_history oh LEFT JOIN users u ON oh.user_id = u.id WHERE oh.order_id = ? ORDER BY oh.created_at ASC`, [order.id]);
                return { ...order, items, history };
            }));
            return ordersWithDetails;
        } finally {
            connection.release();
        }
    },
    
    findById: async (id) => {
        const connection = await dbConnection.getConnection();
        try {
            const orderQuery = 'SELECT o.*, u.name AS deliveryman_name, s.name AS shop_name FROM orders o LEFT JOIN users u ON o.deliveryman_id = u.id LEFT JOIN shops s ON o.shop_id = s.id WHERE o.id = ?';
            const [orders] = await connection.execute(orderQuery, [id]);
            const order = orders[0];
            if (!order) return null;
            const itemsQuery = 'SELECT * FROM order_items WHERE order_id = ?';
            const [items] = await connection.execute(itemsQuery, [id]);
            order.items = items;
            const historyQuery = 'SELECT oh.*, u.name AS user_name FROM order_history oh LEFT JOIN users u ON oh.user_id = u.id WHERE oh.order_id = ? ORDER BY oh.created_at DESC';
            const [history] = await connection.execute(historyQuery, [id]);
            order.history = history;
            return order;
        } finally {
            connection.release();
        }
    },
        
    assignDeliveryman: async (orderId, deliverymanId, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            const [deliverymanRows] = await connection.execute('SELECT name FROM users WHERE id = ?', [deliverymanId]);
            const deliverymanName = deliverymanRows[0]?.name || 'Inconnu';
            const query = 'UPDATE orders SET deliveryman_id = ?, status = ?, payment_status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?';
            await connection.execute(query, [deliverymanId, 'in_progress', 'pending', userId, orderId]);
            const historyQuery = 'INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)';
            const historyMessage = `Commande assignée au livreur : ${deliverymanName}`;
            await connection.execute(historyQuery, [orderId, historyMessage, userId]);
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
