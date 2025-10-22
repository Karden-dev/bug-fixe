// src/controllers/suivis.controller.js
const messageModel = require('../models/message.model');
const orderModel = require('../models/order.model');
const userModel = require('../models/user.model');

// --- Contrôleurs pour l'Onglet Suivis ---

/**
 * GET /api/suivis/conversations
 * Récupère la liste des conversations pour l'admin connecté.
 */
const getConversations = async (req, res) => {
    try {
        const adminUserId = req.user.id;
        const filters = {
            search: req.query.search || null,
            showArchived: req.query.showArchived === 'true',
            showUrgentOnly: req.query.showUrgentOnly === 'true'
        };
        const conversations = await messageModel.findConversationsForAdmin(adminUserId, filters);
        res.json(conversations);
    } catch (error) {
        console.error("Erreur getConversations:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des conversations." });
    }
};

/**
 * GET /api/suivis/unread-count
 * Récupère le nombre total de messages non lus pour l'utilisateur connecté.
 */
const getTotalUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const count = await messageModel.countAllUnreadMessages(userId, userRole);
        res.json({ unreadCount: count });
    } catch (error) {
        console.error("Erreur getTotalUnreadCount:", error);
        res.status(500).json({ message: "Erreur serveur lors du comptage des messages non lus." });
    }
};


/**
 * GET /api/orders/:orderId/messages
 * Récupère les messages pour une commande. Marque comme lus au passage.
 */
const getMessages = async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const userId = req.user.id;
        const userRole = req.user.role;
        const since = req.query.since || null;

        if (isNaN(orderId)) return res.status(400).json({ message: "ID commande invalide." });

        const messages = await messageModel.findMessagesByOrderId(orderId, userId, userRole, since);

        // Marquer comme lus après récupération
        if (messages.length > 0) {
             const lastMessageId = messages[messages.length - 1].id;
             await messageModel.markMessagesAsRead(orderId, userId, lastMessageId);
        }

        res.json(messages);
    } catch (error) {
        console.error("Erreur getMessages:", error);
        if (error.message.includes("Accès non autorisé")) {
             return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: "Erreur serveur lors de la récupération des messages." });
    }
};

/**
 * POST /api/orders/:orderId/messages
 * Ajoute un nouveau message utilisateur.
 */
const postMessage = async (req, res) => {
     try {
        const orderId = parseInt(req.params.orderId);
        const userId = req.user.id;
        const userRole = req.user.role;
        const { message_content } = req.body;

        if (isNaN(orderId)) return res.status(400).json({ message: "ID commande invalide." });
        if (!message_content || message_content.trim() === '') {
             return res.status(400).json({ message: "Le contenu du message ne peut pas être vide." });
        }

        // Vérification d'accès et dé-archivage si besoin
        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Commande non trouvée." });
        }
        if (userRole !== 'admin' && order.deliveryman_id != userId) {
            return res.status(403).json({ message: "Accès non autorisé à poster dans cette conversation." });
        }
        if(order.is_archived) {
            await messageModel.setOrderArchived(orderId, false);
        }


        const newMessage = await messageModel.createMessage(orderId, userId, message_content.trim(), 'user');

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Erreur postMessage:", error);
        res.status(500).json({ message: "Erreur serveur lors de l'envoi du message." });
    }
};


// --- Contrôleurs Actions Admin ---

/**
 * PUT /api/suivis/orders/:orderId/reassign-from-chat
 */
const reassignFromChat = async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const adminUserId = req.user.id;
        const { newDeliverymanId } = req.body;

        if (isNaN(orderId) || !newDeliverymanId) {
             return res.status(400).json({ message: "ID commande et ID nouveau livreur requis." });
        }

        const [adminUser, newDeliveryman] = await Promise.all([
            userModel.findById(adminUserId),
            userModel.findById(newDeliverymanId)
        ]);
        if (!newDeliveryman || newDeliveryman.role !== 'livreur') {
             return res.status(400).json({ message: "ID livreur invalide ou utilisateur n'est pas livreur." });
        }

        await orderModel.assignDeliveryman(orderId, newDeliverymanId, adminUserId);

        const systemMessage = `Admin ${adminUser.name || 'Admin'} a réassigné la commande au livreur ${newDeliveryman.name}.`;
        await messageModel.createMessage(orderId, adminUserId, systemMessage, 'system');

        // Dé-archiver et démarquer urgent
        await Promise.all([
             messageModel.setOrderArchived(orderId, false),
             messageModel.setOrderUrgency(orderId, false)
        ]);


        res.json({ message: "Commande réassignée avec succès." });

    } catch (error) {
        console.error("Erreur reassignFromChat:", error);
        res.status(500).json({ message: error.message || "Erreur serveur lors de la réassignation." });
    }
};

/**
 * PUT /api/suivis/orders/:orderId/reset-status-from-chat
 */
const resetStatusFromChat = async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const adminUserId = req.user.id;
        const adminUser = await userModel.findById(adminUserId);

        if (isNaN(orderId)) return res.status(400).json({ message: "ID commande invalide." });

        // Remet à pending/pending, efface amount_received
        await orderModel.updateStatus(orderId, 'pending', null, 'pending', adminUserId);

        // Dé-archiver et démarquer urgent
         await Promise.all([
             messageModel.setOrderArchived(orderId, false),
             messageModel.setOrderUrgency(orderId, false)
        ]);

        const systemMessage = `Admin ${adminUser.name || 'Admin'} a réinitialisé le statut de la commande.`;
        await messageModel.createMessage(orderId, adminUserId, systemMessage, 'system');

        res.json({ message: "Statut de la commande réinitialisé avec succès." });

    } catch (error) {
        console.error("Erreur resetStatusFromChat:", error);
        res.status(500).json({ message: error.message || "Erreur serveur lors de la réinitialisation du statut." });
    }
};

/**
 * PUT /api/suivis/orders/:orderId/toggle-urgency
 */
const toggleUrgency = async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const { is_urgent } = req.body;

        if (isNaN(orderId) || typeof is_urgent !== 'boolean') {
             return res.status(400).json({ message: "ID commande et statut 'is_urgent' (boolean) requis." });
        }

        const success = await messageModel.setOrderUrgency(orderId, is_urgent);
        if (!success) return res.status(404).json({ message: "Commande non trouvée." });

        const adminUser = await userModel.findById(req.user.id);
        const systemMessage = `Admin ${adminUser.name || 'Admin'} a ${is_urgent ? 'marqué' : 'démarqué'} la commande comme urgente.`;
        await messageModel.createMessage(orderId, req.user.id, systemMessage, 'system');

        res.json({ message: `Urgence ${is_urgent ? 'activée' : 'désactivée'}.` });

    } catch (error) {
        console.error("Erreur toggleUrgency:", error);
        res.status(500).json({ message: "Erreur serveur lors de la modification de l'urgence." });
    }
};

// --- Contrôleurs pour Messages Rapides ---

/**
 * GET /api/suivis/quick-replies
 */
const getQuickReplies = async (req, res) => {
    try {
        const role = req.user.role;
        const replies = await messageModel.findQuickRepliesByRole(role);
        res.json(replies);
    } catch (error) {
        console.error("Erreur getQuickReplies:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des messages rapides." });
    }
};

module.exports = {
    getConversations,
    getTotalUnreadCount,
    getMessages,
    postMessage,
    reassignFromChat,
    resetStatusFromChat,
    toggleUrgency,
    getQuickReplies
};