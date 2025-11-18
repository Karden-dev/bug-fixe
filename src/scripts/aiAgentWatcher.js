// src/scripts/aiAgentWatcher.js

const AIService = require('../services/ai.service'); 
const WhatsAppService = require('../services/whatsapp.service');
const OrderModel = require('../models/order.model');
// Imports de modèles pour les rapports (désactivés)
// const UserModel = require('../models/user.model');
// const DashboardModel = require('../models/dashboard.model');
// const ReportModel = require('../models/report.model');

let db;

// --- CONFIGURATION DU MOTEUR ---
const WATCH_INTERVAL_MS = 60000; // 1 minute.
const LAST_RUN_CACHE = {}; 
const UNANSWERED_TIMEOUT_MINUTES = 30; // Délai de reprise de conversation par SAM

// NOTE: Les liens ne sont plus utilisés ici, ils sont gérés par ai.service.js
const GOOGLE_FORM_LINK = process.env.GOOGLE_FORM_LINK; 
const FACEBOOK_REVIEW_LINK = process.env.FACEBOOK_REVIEW_LINK;

/**
 * (FONCTIONNALITÉ DÉS ACTIVÉE)
 */
const checkPerformanceReports = async () => {
    // Désactivé comme demandé.
    return;
};


/**
 * Étape 1/2 de la demande d'avis : Envoie la question et lève le drapeau.
 * (MODIFIÉ : Flux 2-STEP, ne pose que la question)
 */
const checkDeliveredOrdersForReview = async () => {
    try {
        // 1. Récupère les commandes (fenêtre 30min-24h)
        const orders = await OrderModel.getDeliveredOrdersPendingReview(db); 

        for (const order of orders) {
            
            // 2. Préparation des variables (avec fallbacks)
            const shopName = order.shop_name || 'votre boutique';
            const deliverymanName = order.deliveryman_name || 'notre livreur';
            const location = order.delivery_location || 'votre adresse';
            
            // --- LOGIQUE DE FORMATAGE DU MONTANT ---
            const rawAmount = order.article_amount || order.total_price;
            let amountDisplay = 'votre commande';

            if (rawAmount !== undefined && rawAmount !== null) {
                // Utiliser parseInt pour nettoyer les décimales et toLocaleString('fr-FR') pour l'espace
                const num = parseInt(rawAmount, 10);
                if (!isNaN(num)) {
                    amountDisplay = `${num.toLocaleString('fr-FR')} FCFA`;
                }
            }
            const amount = amountDisplay; 
            // --- FIN DE LA LOGIQUE DE FORMATAGE ---
            
            const articleName = order.first_item_name || 'votre article';
            
            // 3. Détermination du Lien (SUPPRIMÉ - Géré par ai.service.js)
            // ...

            // 4. Construction du Message 1 (La Question SEULEMENT)
            const firstMessage = `Bonjour !
J'ai vu que votre commande de la boutique en ligne *${shopName}* de *${articleName}* d'un montant de *${amount}*
a bien été livrée à *${location}* par notre livreur *${deliverymanName}*

Est-ce que tout s'est bien passé pour vous ?`; // Le lien est supprimé d'ici

            // 5. Envoi du Message 1
            await WhatsAppService.sendText(order.customer_phone, firstMessage, 'review-step-1'); 
            
            // 6. LEVER LE DRAPEAU (customer_conversation_state)
            // C'est le cœur de la logique 2-Step
            try {
                await db.execute(
                    "INSERT INTO customer_conversation_state (customer_phone, pending_feedback_order_id) VALUES (?, ?)",
                    [order.customer_phone, order.id]
                );
            } catch (dbError) {
                // Gère le cas où le drapeau est déjà levé (ex: INSERT échoue sur clé primaire)
                console.error(`[AI Watcher] Échec de la levée du drapeau pour ${order.customer_phone}:`, dbError.message);
                // On continue quand même pour marquer ai_review_sent, sinon on boucle
            }

            // 7. Marquer la commande comme traitée (Action BDD)
            await db.execute("UPDATE orders SET ai_review_sent = 1 WHERE id = ?", [order.id]);
        }
    } catch (error) {
        console.error("[AI Watcher] Erreur lors de l'envoi de la demande d'avis (2-STEP):", error.message);
    }
};


/**
 * NOUVEAU: Fonction de surveillance pour la reprise de conversation par l'IA.
 * Déclenchée si un message client est resté sans réponse pendant 30 minutes.
 */
const checkUnansweredMessages = async () => {
    try {
        // 1. Récupération des messages en attente de réponse (plus de 30 minutes)
        // Note: Cette fonction doit exister dans whatsapp.service.js
        const pendingMessages = await WhatsAppService.getUnansweredMessagesOlderThan(UNANSWERED_TIMEOUT_MINUTES);

        for (const msg of pendingMessages) {
            
            console.log(`[AI Takeover] Reprise du message de ${msg.recipient_phone} datant de ${msg.created_at}.`);

            // Étape 1: Identification du rôle
            const role = await AIService.identifyUserRole(msg.recipient_phone);
            
            // L'objet userInfo est requis par processRequest
            const userInfo = { phoneNumber: msg.recipient_phone, role: role, id: null, shopId: null }; 
            
            // Étape 2: Traitement par SAM (Appel au service IA)
            const aiResponse = await AIService.processRequest(userInfo, msg.message_text);
            
            // Étape 3: Envoi de la réponse (logguée automatiquement par sendText)
            await WhatsAppService.sendText(msg.recipient_phone, aiResponse.text, 'ai-takeover');
            
            // Le log de sendText() dans whatsapp.service.js marque la réponse comme 'OUTGOING',
            // ce qui empêche la requête SQL de reprendre ce message une seconde fois.
        }

    } catch (error) {
        console.error("[AI Watcher] Erreur lors de la vérification des messages non répondus:", error.message);
    }
};


/**
 * Fonction principale du moteur qui tourne en boucle.
 */
const runAgentCycle = async () => {
    if (!db) {
        return;
    }
    
    // await checkPerformanceReports(); // Désactivé
    await checkDeliveredOrdersForReview(); // Demande d'avis (Étape 1)
    await checkUnansweredMessages(); // Reprise de conversation par l'IA (Timeout 30min)
};


/**
 * Initialise le service en injectant le pool de connexion DB et démarre le moteur.
 */
const init = (dbPool) => {
    console.log("[AIWatcher] Initialisé avec la connexion DB.");
    db = dbPool; 
    
    if (process.env.NODE_ENV !== 'test') {
        console.log(`[AIWatcher] Démarrage du moteur proactif (Intervalle: ${WATCH_INTERVAL_MS / 1000}s).`);
        setInterval(runAgentCycle, WATCH_INTERVAL_MS);
    }
};


module.exports = {
    init
};