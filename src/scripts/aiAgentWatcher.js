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
const WATCH_INTERVAL_MS = 60000; 
const LAST_RUN_CACHE = {}; 
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
 * Vérifie les commandes livrées il y a 3h+ et envoie une demande d'avis.
 * (MODIFIÉ : Utilise gemini-2.5-flash)
 */
const checkDeliveredOrdersForReview = async () => {
    try {
        const orders = await OrderModel.getDeliveredOrdersPendingReview(db); 

        for (const order of orders) {
            if (!GOOGLE_FORM_LINK || !FACEBOOK_REVIEW_LINK) {
                console.warn("[AI Watcher] Liens de sondage/avis manquants dans .env. Opération ignorée.");
                return;
            }

            let targetLink = FACEBOOK_REVIEW_LINK;
            let platformName = "Facebook";

            if (order.id % 2 === 0) {
                targetLink = GOOGLE_FORM_LINK;
                platformName = "Google";
            }

            const deliverymanName = order.deliveryman_name || 'notre livreur'; 
            const itemName = order.first_item_name || 'votre article'; 
            const location = order.delivery_location || 'votre adresse'; 

            const prompt = `
                Tu es SAM, l'assistant de Wink. Rédige un message de suivi très court, amical et personnalisé.
                
                Contexte de la commande livrée aujourd'hui :
                - Article : ${itemName}
                - Lieu : ${location}
                - Livreur : ${deliverymanName}
                
                Ton message :
                1. Commence par "Bonjour !". 
                2. Confirme la livraison : "J'ai vu que votre commande pour [${itemName}] à [${location}] a bien été livrée aujourd'hui par ${deliverymanName}."
                3. **Question clé :** Demande "Est-ce que tout s'est bien passé pour vous ?"
                4. **Propose les deux issues (c'est la correction) :**
                   - "Si oui, vous feriez le bonheur de ${deliverymanName} en laissant un petit avis sur ${platformName} ici : ${targetLink}"
                   - "Si non, n'hésitez pas à me le dire ici, je suis là pour vous aider et remonter l'information."
                5. Sois chaleureux et utilise un emoji.
                
                Lien à inclure : ${targetLink}
            `;
            
            // Utilisation du nouveau modèle flash par défaut
            const aiMessage = await AIService.generateText(prompt, 'gemini-2.5-flash'); 

            await WhatsAppService.sendText(order.customer_phone, aiMessage, 'gemini-2.5-flash'); 
            
            await db.execute("UPDATE orders SET ai_review_sent = 1 WHERE id = ?", [order.id]);
        }
    } catch (error) {
        console.error("[AI Watcher] Erreur lors de la vérification des commandes livrées (Action requise: Ajouter colonne 'ai_review_sent'):", error.message);
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
    await checkDeliveredOrdersForReview();
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