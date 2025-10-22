// src/models/order.model.js
const moment = require('moment');
// Import du service de bilan
const balanceService = require('../services/balance.service');
// Le messageModel sera injecté au démarrage via init()
let localMessageModel;

let dbConnection;

module.exports = {
    /**
     * Initialise le modèle avec la connexion BDD et la référence au modèle message.
     * @param {object} connection - Le pool de connexion MySQL.
     * @param {object} msgModel - L'instance initialisée de messageModel.
     */
    init: (connection, msgModel) => {
        dbConnection = connection;
        localMessageModel = msgModel; // Stocke la référence à messageModel
        module.exports.dbConnection = connection; // Expose la connexion si besoin
    },

    /**
     * Crée une nouvelle commande et ses articles associés.
     * @param {object} orderData - Données de la commande.
     * @returns {Promise<object>} Résultat avec success: true et orderId.
     */
    create: async (orderData) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            // Ajout des colonnes is_urgent et is_archived par défaut à 0
            const orderQuery = `INSERT INTO orders (shop_id, customer_name, customer_phone, delivery_location, article_amount, delivery_fee, expedition_fee, status, payment_status, created_by, created_at, is_urgent, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, 0)`;
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

            // Mise à jour du bilan journalier
            const orderDate = moment().format('YYYY-MM-DD');
            await balanceService.updateDailyBalance(connection, {
                shop_id: orderData.shop_id,
                date: orderDate,
                orders_sent: 1,
                expedition_fees: parseFloat(orderData.expedition_fee || 0)
            });

            // Synchronisation de la dette de bilan si nécessaire
            await balanceService.syncBalanceDebt(connection, orderData.shop_id, orderDate);

            await connection.commit();
            return { success: true, orderId };
        } catch (error) {
            await connection.rollback();
            console.error("Erreur create order:", error); // Log détaillé
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Met à jour une commande existante et ses articles.
     * @param {number} orderId - ID de la commande à modifier.
     * @param {object} orderData - Nouvelles données de la commande.
     * @param {number} userId - ID de l'utilisateur effectuant la modification.
     * @returns {Promise<object>} Résultat avec success: true.
     */
    update: async (orderId, orderData, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();

            const [oldOrderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            if (oldOrderRows.length === 0) throw new Error("Commande non trouvée.");
            const oldOrder = oldOrderRows[0];
            const oldOrderDate = moment(oldOrder.created_at).format('YYYY-MM-DD');

            // Annuler l'ancien impact sur le bilan
            if (oldOrder.status !== 'pending') {
                const oldImpact = balanceService.getBalanceImpactForStatus(oldOrder);
                await balanceService.updateDailyBalance(connection, {
                    shop_id: oldOrder.shop_id, date: oldOrderDate,
                    orders_delivered: -oldImpact.orders_delivered,
                    revenue_articles: -oldImpact.revenue_articles,
                    delivery_fees: -oldImpact.delivery_fees,
                    packaging_fees: -oldImpact.packaging_fees
                });
            }
            await balanceService.updateDailyBalance(connection, {
                 shop_id: oldOrder.shop_id, date: oldOrderDate,
                 orders_sent: -1,
                 expedition_fees: -parseFloat(oldOrder.expedition_fee || 0)
            });


            const { items, ...orderFields } = orderData;
            // Assurer que les champs is_urgent et is_archived sont inclus s'ils sont passés
            const fieldsToUpdate = Object.keys(orderFields).map(key => `${key} = ?`).join(', ');
            const params = [...Object.values(orderFields), userId, orderId];
            await connection.execute(`UPDATE orders SET ${fieldsToUpdate}, updated_by = ?, updated_at = NOW() WHERE id = ?`, params);

            // Mise à jour des articles
            if (items) {
                await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
                const itemQuery = 'INSERT INTO order_items (order_id, item_name, quantity, amount) VALUES (?, ?, ?, ?)';
                for (const item of items) {
                    await connection.execute(itemQuery, [orderId, item.item_name, item.quantity, item.amount]);
                }
            }

            // Récupérer la commande mise à jour pour recalculer l'impact
            const [newOrderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            const newOrder = newOrderRows[0];
            const newDate = moment(newOrder.created_at).format('YYYY-MM-DD');

            // Appliquer le nouvel impact sur le bilan
             await balanceService.updateDailyBalance(connection, {
                 shop_id: newOrder.shop_id, date: newDate,
                 orders_sent: 1,
                 expedition_fees: parseFloat(newOrder.expedition_fee || 0)
             });
            if (newOrder.status !== 'pending') {
                 const newImpact = balanceService.getBalanceImpactForStatus(newOrder);
                 await balanceService.updateDailyBalance(connection, {
                     shop_id: newOrder.shop_id, date: newDate,
                     ...newImpact // Applique les deltas calculés
                 });
             }

            // Synchroniser les dettes
            await balanceService.syncBalanceDebt(connection, oldOrder.shop_id, oldOrderDate);
            if (oldOrder.shop_id != newOrder.shop_id || oldOrderDate != newDate) {
                await balanceService.syncBalanceDebt(connection, newOrder.shop_id, newDate);
            } else {
                 await balanceService.syncBalanceDebt(connection, newOrder.shop_id, newDate);
            }

            // Historique
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, 'Mise à jour de la commande', userId]);

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            console.error(`Erreur update order ${orderId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Met à jour le statut et le statut de paiement d'une commande.
     * Gère l'impact sur le bilan journalier et l'archivage automatique.
     */
    updateStatus: async (orderId, newStatus, amountReceived = null, newPaymentStatus = null, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            const [orderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            const order = orderRows[0];
            if (!order) throw new Error("Commande non trouvée.");
            const orderDate = moment(order.created_at).format('YYYY-MM-DD');
            const oldStatus = order.status;

            const finalStatusesForArchive = ['delivered', 'cancelled', 'failed_delivery'];

            // 1. Annuler l'ancien impact (sauf si 'pending')
            if (oldStatus !== 'pending') {
                 const oldImpact = balanceService.getBalanceImpactForStatus(order);
                 await balanceService.updateDailyBalance(connection, {
                     shop_id: order.shop_id, date: orderDate,
                     orders_delivered: -oldImpact.orders_delivered,
                     revenue_articles: -oldImpact.revenue_articles,
                     delivery_fees: -oldImpact.delivery_fees,
                     packaging_fees: -oldImpact.packaging_fees
                 });
             }

            // 2. Déterminer les nouvelles valeurs de statut/paiement/montant reçu
            const updatedOrderData = { ...order, status: newStatus };
            let finalPaymentStatus = order.payment_status;
            let finalAmountReceived = order.amount_received;

            if (newStatus === 'delivered') {
                finalPaymentStatus = newPaymentStatus || 'cash';
                finalAmountReceived = order.article_amount; // Montant total reçu
            } else if (newStatus === 'cancelled') {
                finalPaymentStatus = 'cancelled';
                finalAmountReceived = null;
            } else if (newStatus === 'failed_delivery') {
                finalAmountReceived = (amountReceived !== null && !isNaN(parseFloat(amountReceived))) ? parseFloat(amountReceived) : null;
                finalPaymentStatus = (finalAmountReceived !== null && finalAmountReceived > 0) ? 'cash' : 'pending';
            } else if (['pending', 'in_progress', 'reported'].includes(newStatus)) {
                 finalPaymentStatus = 'pending';
                 finalAmountReceived = null; // Réinitialiser si on revient à un statut non final
            }

            // 3. Appliquer le nouvel impact (sauf si 'pending')
            if (newStatus !== 'pending') {
                 updatedOrderData.payment_status = finalPaymentStatus;
                 updatedOrderData.amount_received = finalAmountReceived;
                 const newImpact = balanceService.getBalanceImpactForStatus(updatedOrderData);
                 await balanceService.updateDailyBalance(connection, {
                     shop_id: order.shop_id, date: orderDate,
                     ...newImpact
                 });
            }

            // 4. Mettre à jour la commande
            // MODIFICATION : Gérer archivage/dé-archivage DANS la même requête UPDATE
            const isFinal = finalStatusesForArchive.includes(newStatus);
            const wasFinal = finalStatusesForArchive.includes(oldStatus);
            let archiveUpdateSql = '';
            if (isFinal && !wasFinal) {
                archiveUpdateSql = ', is_archived = 1'; // Archiver
            } else if (!isFinal && wasFinal) {
                archiveUpdateSql = ', is_archived = 0'; // Dé-archiver
            }
            
            await connection.execute(
                `UPDATE orders SET status = ?, payment_status = ?, amount_received = ?, updated_by = ?, updated_at = NOW() ${archiveUpdateSql} WHERE id = ?`,
                [newStatus, finalPaymentStatus, finalAmountReceived, userId, orderId]
            );

            // 5. Synchroniser la dette
            await balanceService.syncBalanceDebt(connection, order.shop_id, orderDate);

            // 6. Historique
            await connection.execute('INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)', [orderId, `Statut changé en ${newStatus}`, userId]);
            
            // 7. Gérer archivage/dé-archivage (LOGIQUE DÉPLACÉE DANS L'UPDATE PRINCIPAL)
            // ... (logique supprimée d'ici) ...

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error(`Erreur updateStatus pour Order ${orderId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Supprime une commande et ses dépendances. Annule son impact sur le bilan.
     */
    remove: async (orderId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();
            const [orderRows] = await connection.execute('SELECT o.*, s.bill_packaging, s.packaging_price FROM orders o JOIN shops s ON o.shop_id = s.id WHERE o.id = ?', [orderId]);
            if (orderRows.length === 0) {
                 await connection.rollback();
                 return { affectedRows: 0 };
            }
            const order = orderRows[0];
            const orderDate = moment(order.created_at).format('YYYY-MM-DD');

            // Annuler l'impact sur le bilan
            if (order.status !== 'pending') {
                const impact = balanceService.getBalanceImpactForStatus(order);
                await balanceService.updateDailyBalance(connection, {
                    shop_id: order.shop_id, date: orderDate,
                    orders_delivered: -impact.orders_delivered,
                    revenue_articles: -impact.revenue_articles,
                    delivery_fees: -impact.delivery_fees,
                    packaging_fees: -impact.packaging_fees
                });
            }
             await balanceService.updateDailyBalance(connection, {
                 shop_id: order.shop_id, date: orderDate,
                 orders_sent: -1,
                 expedition_fees: -parseFloat(order.expedition_fee || 0)
             });


            await balanceService.syncBalanceDebt(connection, order.shop_id, orderDate);

            // Supprimer dépendances (le ON DELETE CASCADE gère message_read_status)
            await connection.execute('DELETE FROM order_history WHERE order_id = ?', [orderId]);
            await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
            await connection.execute('DELETE FROM order_messages WHERE order_id = ?', [orderId]);

            // Supprimer la commande
            const [result] = await connection.execute('DELETE FROM orders WHERE id = ?', [orderId]);

            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            console.error(`Erreur remove order ${orderId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Récupère toutes les commandes avec filtres et jointures.
     */
    findAll: async (filters) => {
        const connection = await dbConnection.getConnection();
        try {
            // Sélectionner is_urgent et is_archived
            let query = `SELECT o.*, s.name AS shop_name, u.name AS deliveryman_name, o.is_urgent, o.is_archived
                         FROM orders o
                         LEFT JOIN shops s ON o.shop_id = s.id
                         LEFT JOIN users u ON o.deliveryman_id = u.id
                         WHERE 1=1`;
            const params = [];
            if (filters.search) {
                // Recherche sur ID, nom/tél client, lieu, nom marchand, nom livreur
                query += ` AND (CAST(o.id AS CHAR) LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.delivery_location LIKE ? OR s.name LIKE ? OR u.name LIKE ?)`;
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }
            if (filters.startDate) query += ` AND DATE(o.created_at) >= ?`, params.push(filters.startDate);
            if (filters.endDate) query += ` AND DATE(o.created_at) <= ?`, params.push(filters.endDate);
            if (filters.status) query += ` AND o.status = ?`, params.push(filters.status);

            // Tri par date de création par défaut
            query += ` ORDER BY o.created_at DESC`;

            const [rows] = await connection.execute(query, params);
            // Récupérer les items pour chaque commande
            const ordersWithDetails = await Promise.all(rows.map(async (order) => {
                const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
                return { ...order, items };
            }));
            return ordersWithDetails;
        } finally {
            connection.release();
        }
    },

    /**
     * Récupère une commande par ID avec ses items et son historique.
     */
    findById: async (id) => {
        const connection = await dbConnection.getConnection();
        try {
            // Sélectionner is_urgent et is_archived
            const orderQuery = `SELECT o.*, u.name AS deliveryman_name, s.name AS shop_name, o.is_urgent, o.is_archived
                                FROM orders o
                                LEFT JOIN users u ON o.deliveryman_id = u.id
                                LEFT JOIN shops s ON o.shop_id = s.id
                                WHERE o.id = ?`;
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

    /**
     * Assigne un livreur. Crée message système. Gère archivage/urgence. Annule transaction pending.
     * MODIFIÉ : Consolide les UPDATE sur la table orders.
     */
    assignDeliveryman: async (orderId, deliverymanId, userId) => {
        const connection = await dbConnection.getConnection();
        try {
            await connection.beginTransaction();

            const [orderData] = await connection.execute('SELECT deliveryman_id FROM orders WHERE id = ?', [orderId]);
            if (orderData.length === 0) {
                await connection.rollback(); // Annuler si commande non trouvée
                throw new Error("Commande non trouvée.");
            }
            const oldDeliverymanId = orderData[0]?.deliveryman_id;
            const assigningUserId = userId; // ID de l'admin qui assigne

            const [deliverymanRows] = await connection.execute('SELECT name FROM users WHERE id = ? AND role = "livreur"', [deliverymanId]);
            if (deliverymanRows.length === 0) {
                await connection.rollback(); // Annuler si livreur non trouvé
                throw new Error("Nouveau livreur non trouvé ou rôle incorrect.");
            }
            const deliverymanName = deliverymanRows[0].name;

            // 1. Ajouter à l'historique principal (ne verrouille pas la ligne orders longtemps)
            const historyQuery = 'INSERT INTO order_history (order_id, action, user_id) VALUES (?, ?, ?)';
            const historyMessage = `Commande assignée au livreur : ${deliverymanName}`;
            await connection.execute(historyQuery, [orderId, historyMessage, assigningUserId]);

            // 2. Annuler transaction 'remittance' PENDING de l'ancien livreur (si différent)
            if (oldDeliverymanId && oldDeliverymanId != deliverymanId) {
                 await connection.execute(
                    `DELETE FROM cash_transactions WHERE user_id = ? AND type = 'remittance' AND status = 'pending' AND comment LIKE ?`,
                    [oldDeliverymanId, `%${orderId}%`]
                 );
            }

            // 3. Créer le message système (si localMessageModel est disponible)
            // Nous utilisons 'connection' pour l'insérer DANS la même transaction
            if (localMessageModel && typeof localMessageModel.createMessage === 'function') {
                 // **CORRECTION** : Nous ne pouvons pas appeler localMessageModel.createMessage
                 // car cette fonction prendra une NOUVELLE connexion du pool, créant un deadlock.
                 // Nous devons faire l'insertion directement ici, en utilisant la 'connection' active.
                 const systemMessageContent = `La commande a été assignée au livreur ${deliverymanName}. Le suivi commence.`;
                 await connection.execute(
                     `INSERT INTO order_messages (order_id, user_id, message_content, message_type, created_at) VALUES (?, ?, ?, 'system', NOW(3))`,
                     [orderId, assigningUserId, systemMessageContent]
                 );
            } else {
                 console.warn(`[assignDeliveryman Order ${orderId}] localMessageModel indisponible.`);
            }

            // 4. Mettre à jour la commande : livreur, statut, paiement, archivage, urgence en UNE SEULE REQUÊTE
            const updateQuery = `UPDATE orders SET
                                    deliveryman_id = ?,
                                    status = 'in_progress',
                                    payment_status = 'pending',
                                    is_urgent = 0,      -- Démarquer urgent
                                    is_archived = 0,    -- Dé-archiver
                                    updated_by = ?,
                                    updated_at = NOW()
                                 WHERE id = ?`;
            await connection.execute(updateQuery, [deliverymanId, assigningUserId, orderId]);

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback(); // Assurer le rollback en cas d'erreur
            console.error(`Erreur assignDeliveryman pour Order ${orderId}:`, error);
            if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
                 console.error("Lock Wait Timeout persiste. Examiner les requêtes concurrentes, les index.");
            }
            throw error; // Relancer l'erreur pour que le contrôleur la gère
        } finally {
            connection.release(); // Libérer la connexion
        }
    }
};