// src/services/ai.service.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const WhatsAppService = require('./whatsapp.service'); 
// Importer la personnalité et les outils depuis le fichier voisin
const SAMConfig = require('./sam.personality.js'); 

// Variable locale pour stocker la connexion DB qui sera injectée depuis app.js
let db;

// --- IMPORTATION DE TOUS LES MODÈLES DE DONNÉES (Le Catalogue d'Expertise) ---
const UserModel = require('../models/user.model');
const ShopModel = require('../models/shop.model'); 
const OrderModel = require('../models/order.model');
const DebtModel = require('../models/debt.model');
const RemittanceModel = require('../models/remittance.model'); 
const CashModel = require('../models/cash.model');
const CashStatModel = require('../models/cash.stat.model');
const RidersCashModel = require('../models/riderscash.model');
const DashboardModel = require('../models/dashboard.model'); 
const ReportModel = require('../models/report.model');
const PerformanceModel = require('../models/performance.model'); 
const RiderModel = require('../models/rider.model');
const ScheduleModel = require('../models/schedule.model');
const MessageModel = require('../models/message.model.js');


// --- INITIALISATION DE GEMINI ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("ERREUR FATALE: GEMINI_API_KEY n'est pas défini.");
}
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);


/**
 * Détermine le rôle de l'utilisateur.
 * (MODIFIÉ: Ajout d'un contrôle de sécurité 'Super Admin' immédiat pour la robustesse et vérification 'customer')
 */
const identifyUserRole = async (phone_number) => {
    if (!db) return 'unknown';
    
    // 1. Tenter l'identification Admin via la DB
    const admin = await UserModel.getAdminByPhone(db, phone_number);
    if (admin) return 'admin';
    
    // 2. CONTRÔLE DE SÉCURITÉ SUPPLÉMENTAIRE (Super Admin Hardcodé):
    if (SAMConfig.SUPER_ADMINS.includes(phone_number)) {
        return 'admin'; 
    }
    
    // 3. Vérifier le Livreur
    const rider = await RiderModel.getRiderByPhone(db, phone_number);
    if (rider) return 'rider';

    // 4. Vérifier le Client final (nouvelle logique)
    const isCustomer = await OrderModel.isCustomer(db, phone_number);
    if (isCustomer) return 'customer';

    // 5. Dernier recours : C'est un vrai nouveau prospect
    return 'prospect_b2b';
};


// --- Helper de Fallback (Utilise gemini-2.5) ---
const generateResponseWithFallback = async (prompt, systemInstruction, tools, preferredModel, fallbackModel) => {
    let modelToUse = preferredModel;
    try {
        const generativeModel = ai.getGenerativeModel({ 
            model: modelToUse,
            systemInstruction: systemInstruction, 
            tools: tools
        });
        const chat = generativeModel.startChat();
        const result = await chat.sendMessage(prompt);
        return { chat, response: result.response, modelUsed: modelToUse };
    } catch (e1) {
        console.warn(`[AI Fallback] Échec du modèle préféré (${modelToUse}): ${e1.message}. Tentative avec le fallback (${fallbackModel})...`);
        modelToUse = fallbackModel;
        try {
            const generativeModel = ai.getGenerativeModel({ 
                model: modelToUse,
                systemInstruction: systemInstruction,
                tools: tools
            });
            const chat = generativeModel.startChat();
            const result = await chat.sendMessage(prompt);
            return { chat, response: result.response, modelUsed: modelToUse };
        } catch (e2) {
            console.error(`[AI Fallback] Échec du modèle de fallback (${modelToUse}) : ${e2.message}.`);
            throw e2; 
        }
    }
};


// --------------------------------------------------------------------------
// --- INTERCEPTEUR : Gère les réponses à la demande d'avis (Économie de Tokens) ---
// (RÉ-ACTIVÉ POUR LE FLUX 2-STEP)
// --------------------------------------------------------------------------
/**
 * Vérifie si un message entrant est une réponse à une demande d'avis.
 * Si oui, il gère la réponse et baisse le drapeau.
 * @returns {Object} { handled: true } si le message a été géré, { handled: false } sinon.
 */
const handlePendingFeedbackInterceptor = async (fromPhone, userMessage) => {
    if (!db) return { handled: false };
    
    let connection;
    try {
        connection = await db.getConnection();
        
        // NOUVEAU: Si le message n'est qu'une salutation simple, on laisse l'IA (SAM) répondre
        const simpleGreetingRegex = /^(salut|bonjour|bonsoir|coucou|hello|yo|sls|bsr|slt|bnjr)[\s\p{P}]*$/ui; 
        if (simpleGreetingRegex.test(userMessage.trim())) {
            return { handled: false }; 
        }
        
        // 1. Vérifier le drapeau dans notre table "mémoire"
        const [rows] = await connection.execute(
            "SELECT pending_feedback_order_id FROM customer_conversation_state WHERE customer_phone = ?",
            [fromPhone]
        );
        
        if (rows.length === 0) {
            return { handled: false }; // Pas de drapeau, l'IA gère
        }
        
        const orderId = rows[0].pending_feedback_order_id;
        
        // 2. Baisser le drapeau IMMÉDIATEMENT
        await connection.execute(
            "DELETE FROM customer_conversation_state WHERE customer_phone = ?",
            [fromPhone]
        );
        
        // 3. Analyser la réponse du client
        const negativeRegex = /(non|pas bien|problème|mauvais|nul|retard|pas recu|pas encore|jamais reçu|c'était nul|en retard|pas satisfait|insatisfait|pas du tout|incorrect|souci|pas cool|c'est pas bon|pas top|pas super)/i;
        const positiveRegex = /(oui|yes|parfait|super|c'était bien|top|nickel|ok|merci|satisfait|correct|c'est bon|tout est bon|bien reçu|pas de problème|pas de souci|impeccable|cool|ça marche|d'accord|bien passé|absolument|exactement|c'est ça)/i;
        
        // CORRECTION DE LOGIQUE : Vérifier le négatif d'abord pour éviter l'erreur "Non merci"
        if (negativeRegex.test(userMessage)) {
            // Réponse négative : Laisser l'IA (SAM) gérer la plainte
            return { handled: false }; 
        }

        if (positiveRegex.test(userMessage)) {
            // 4. Gérer la réponse positive (Envoyer Message 2)
            
            // --- NOUVEAU: Récupération des liens depuis la configuration SAM ---
            const GOOGLE_FORM_LINK = SAMConfig.REVIEW_LINKS.GOOGLE_FORM;
            const FACEBOOK_REVIEW_LINK = SAMConfig.REVIEW_LINKS.FACEBOOK_REVIEW;
            
            // --- LOGIQUE DE RESILIENCE : Vérification des liens ---
            if (!GOOGLE_FORM_LINK || !FACEBOOK_REVIEW_LINK || GOOGLE_FORM_LINK.includes("votre_lien_google_ici")) {
                console.error("[AI Interceptor] ERREUR CRITIQUE : Liens d'avis (Google/FB) non configurés dans sam.personality.js.");
                
                await WhatsAppService.sendText(
                    fromPhone, 
                    "C'est génial d'entendre que tout s'est bien passé ! Je suis désolé, je rencontre un petit bug technique qui m'empêche d'envoyer le lien d'avis en ce moment. N'hésitez pas à revenir plus tard !", 
                    'review-fallback-error'
                );
                return { handled: true }; 
            }
            // --- FIN DE LA LOGIQUE D'ADAPTATION ---


            let targetLink = FACEBOOK_REVIEW_LINK;
            let platformName = "Facebook";
            
            // Alterner les liens (pair/impair)
            if (orderId % 2 === 0) {
                targetLink = GOOGLE_FORM_LINK;
                platformName = "Google";
            }

            const feedbackMessage = `Super ! Merci beaucoup pour ce retour. 😊
            
Si vous avez 30 secondes, vous feriez le bonheur de notre équipe en laissant un petit avis sur ${platformName} ici : ${targetLink}

Passez une excellente journée !`;
            
            await WhatsAppService.sendText(fromPhone, feedbackMessage, 'review-step-2');
            
            return { handled: true }; // C'est géré, l'IA ne doit PAS répondre.
        } 
        
        // Réponse neutre : Laisser l'IA gérer.
        return { handled: false }; 

    } catch (error) {
        console.error("[AI Interceptor] Erreur grave lors de la gestion du drapeau d'avis:", error.message);
        try {
            if (connection) {
                await connection.execute(
                    "DELETE FROM customer_conversation_state WHERE customer_phone = ?",
                    [fromPhone]
                );
            }
        } catch (deleteError) {}
        
        return { handled: false }; 
    } finally {
        if (connection) connection.release();
    }
};


/**
 * Génère la réponse de l'IA.
 */
const processRequest = async (userInfo, userMessage) => {
    const fromPhone = userInfo.phoneNumber; 
    
    // --- ÉTAPE D'INTERCEPTION : Demande d'avis en 2 étapes (RÉ-ACTIVÉE) ---
    const feedbackResult = await handlePendingFeedbackInterceptor(fromPhone, userMessage);
    if (feedbackResult.handled) {
        // Le message était la réponse positive à la question d'avis. On arrête tout.
        return { text: "INTERCEPTED_POSITIVE_FEEDBACK", model: "interceptor" };
    }
    // --- FIN DE L'INTERCEPTION ---
    

    let modelToUse = 'gemini-2.5-flash'; 
    
    // --- 1. Logique de Sécurité par Rôle (Gestion des Outils et du Ton) ---
    const isSuperAdmin = SAMConfig.SUPER_ADMINS.includes(fromPhone);
    
    // --- CORRECTIF DE SÉCURITÉ : Outrepasser le rôle si Super Admin ---
    if (isSuperAdmin && userInfo.role !== 'admin') {
        userInfo.role = 'admin'; 
    }

    // Définit le ton basé sur le rôle (maintenant corrigé)
    let dynamicTone = SAMConfig.TONES_BY_ROLE[userInfo.role] || SAMConfig.TONES_BY_ROLE['default'];
    
    // --- CORRECTION BUG "Duplicate Function" ---
    // On assemble dynamiquement les outils sans doublons
    let toolDeclarations = [...SAMConfig.vCardTool.functionDeclarations];
    
    if (isSuperAdmin) {
        modelToUse = 'gemini-2.5-pro'; 
        toolDeclarations.push(
            ...SAMConfig.adminTools_definitions,
            ...SAMConfig.livreurTools_definitions,
            ...SAMConfig.marchandTools_definitions,
            ...SAMConfig.superAdminTools_definitions
        );
    } else if (userInfo.role === 'admin') {
        modelToUse = 'gemini-2.5-flash';
        toolDeclarations.push(...SAMConfig.adminTools_definitions);
    } else if (userInfo.role === 'livreur') {
        toolDeclarations.push(...SAMConfig.livreurTools_definitions);
    } else if (userInfo.role === 'prospect_b2b' || userInfo.role === 'customer') {
        // Le rôle 'customer' bénéficie des outils marchand (comme la VCard du marchand)
        toolDeclarations.push(...SAMConfig.marchandTools_definitions);
    }
    
    const toolsToUse = [{ functionDeclarations: toolDeclarations }];
    // --- Fin Logique de Sécurité ---

    try {
        // 2. PRÉPARATION DU CONTEXTE (Pré-chargement)
        let contextData = {};
        if (userInfo.role === 'prospect_b2b') {
             if (userMessage.length > 100 && userMessage.includes('Prix')) {
                 contextData.productInfo = {
                    name: "Produit anti-nuisibles (Punaises de lit, cafards, moustiques)",
                    currentPromotion: "2 flacons pour 9 000 FCFA ou 3 flacons pour 13 000 FCFA",
                    standardPrice: "5 000 FCFA le flacon",
                    delivery: "Livraison gratuite si commande maintenant (Douala, Yaoundé, expédition ailleurs)",
                    contact: "Veuillez indiquer votre adresse pour valider la commande ou poser une question."
                };
            }
        }
        
        // --- 3. CONSTRUCTION DU PROMPT FINAL (AVEC MÉMOIRE) ---
        const history = await WhatsAppService.getConversationHistory(fromPhone, 10);
        const chatHistoryString = history.map(msg => {
            return (msg.message_direction === 'INCOMING') ? `Utilisateur: ${msg.message_text}` : `SAM: ${msg.message_text}`;
        }).join('\n');
        
        let contextString = '';
        if (Object.keys(contextData).length > 0) {
            contextString = "\n\n--- DONNÉES CONTEXTUELLES PRÉ-CHARGÉES ---\n" + JSON.stringify(contextData, null, 2) + "\n---------------------------------------\n";
        }

        const finalPrompt = `
${dynamicTone} 
${contextString}
--- DEBUT HISTORIQUE DE CONVERSATION ---
${chatHistoryString}
--- FIN HISTORIQUE DE CONVERSATION ---

--- NOUVEAU MESSAGE ---
Utilisateur: ${userMessage}
`;
        
        // 4. APPEL DE L'API GEMINI
        const { chat, response, modelUsed } = await generateResponseWithFallback(
            finalPrompt, 
            SAMConfig.EXPERT_WINK_INSTRUCTION,
            toolsToUse,
            modelToUse, 
            'gemini-2.5-flash'
        );
        modelToUse = modelUsed; 
         
         
         // --- 5. GESTION DES OUTILS ---
         const functionCall = response.functionCalls()?.[0];

         if (functionCall) {
            let toolResultPayload;
            let functionName = functionCall.name;

            // --- Envelopper chaque appel d'outil dans un try/catch ---
            try {
                // CAS 1 : VCard (Contacts internes WINK)
                if (functionName === 'send_contact_card') {
                    const contactKey = functionCall.args.contactKey;
                    const contact = SAMConfig.CONTACT_LIST[contactKey];
                    if (contact) {
                        await WhatsAppService.sendVCard(fromPhone, contact.name, contact.phone);
                        toolResultPayload = { success: true, contactName: contact.name };
                    } else {
                        toolResultPayload = { success: false, error: "Contact non trouvé" };
                    }
                }

                // CAS 2 : Diffusion (Super Admin)
                else if (functionName === 'send_broadcast_message') {
                    if (!isSuperAdmin) {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                    } else {
                        const message = functionCall.args.messageText;
                        const role = functionCall.args.targetRole; 
                        const users = await UserModel.getPhoneNumbersByRole(db, role);
                        let count = 0;
                        for (const user of users) {
                            if (user.phone_number) {
                                await WhatsAppService.sendText(user.phone_number, `[DIFFUSION ADMIN] ${message}`, 'admin-broadcast');
                                count++;
                            }
                        }
                        toolResultPayload = { success: true, sentCount: count, targetRole: role };
                    }
                }

                // CAS 3 : Message Ciblé (Super Admin)
                else if (functionName === 'send_message_to_user_by_name') {
                     if (!isSuperAdmin) {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                     } else {
                        const userName = functionCall.args.userName;
                        const message = functionCall.args.messageText;
                        const user = await UserModel.findUserByName(db, userName);
                        if (user && user.phone_number) {
                            await WhatsAppService.sendText(user.phone_number, `[MESSAGE ADMIN] ${message}`, 'admin-direct');
                            toolResultPayload = { success: true, sentToName: user.name };
                        } else {
                            toolResultPayload = { success: false, error: `Utilisateur '${userName}' non trouvé.` };
                        }
                     }
                }

                // CAS 4 : Stats (Admin)
                else if (functionName === 'get_daily_summary_for_date') {
                     if (userInfo.role !== 'admin' && !isSuperAdmin) {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                     } else {
                        const date = functionCall.args.date;
                        const summary = await DashboardModel.getDailySummary(db, date);
                        toolResultPayload = { success: true, date: date, data: summary };
                     }
                }
                
                // CAS 5 : Stats de livraisons du Livreur
                else if (functionName === 'get_my_delivery_stats') {
                    if (userInfo.role !== 'livreur') {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                    } else {
                        const period = functionCall.args.period;
                        const stats = await PerformanceModel.getDeliveryStatsForRider(db, userInfo.id, period);
                        toolResultPayload = { success: true, period: period, data: stats };
                    }
                }
                
                // CAS 6 : Gains du Livreur
                else if (functionName === 'get_my_earnings') {
                    if (userInfo.role !== 'livreur') {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                    } else {
                        const period = functionCall.args.period;
                        const earnings = await PerformanceModel.getEarningsForRider(db, userInfo.id, period);
                        toolResultPayload = { success: true, period: period, data: earnings };
                    }
                }

                // CAS 7 : Infos de la boutique du Marchand
                else if (functionName === 'get_my_shop_info') {
                    if (userInfo.role !== 'prospect_b2b') {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                    } else {
                        if (!userInfo.shopId) {
                            toolResultPayload = { success: false, error: "Compte marchand non lié à une boutique." };
                        } else {
                            // La fonction est supposée maintenant inclure le phone_number
                            const shopInfo = await ShopModel.getShopInfoForIA(db, userInfo.shopId);
                            toolResultPayload = { success: true, data: shopInfo };
                        }
                    }
                }
                
                // CAS 8 : Historique des versements du Marchand
                else if (functionName === 'get_my_remittance_history') {
                    if (userInfo.role !== 'prospect_b2b') {
                         toolResultPayload = { success: false, error: "Action non autorisée" };
                    } else {
                        if (!userInfo.shopId) {
                            toolResultPayload = { success: false, error: "Compte marchand non lié à une boutique." };
                        } else {
                            const period = functionCall.args.period;
                            const history = await RemittanceModel.getHistoryForShop(db, userInfo.shopId, period);
                            toolResultPayload = { success: true, period: period, data: history };
                        }
                    }
                }
                
                // CAS 9 : NOUVEL OUTIL - VCard Marchand pour les clients finaux (Sécurité Produit)
                else if (functionName === 'send_merchant_contact_for_last_order') {
                    // C'est un outil pour les clients finaux (rôle 'customer' ou 'prospect_b2b')
                    if (userInfo.role === 'admin' || userInfo.role === 'livreur') { 
                         toolResultPayload = { success: false, error: "Action non autorisée pour ce rôle" };
                    } else {
                        // 1. Trouver la dernière commande du client
                        const order = await OrderModel.getLastOrderForCustomer(db, fromPhone);
                        
                        if (order && order.shop_id) {
                            // 2. Trouver les infos du marchand (fonction fusionnée)
                            const shop = await ShopModel.getShopInfoForIA(db, order.shop_id);
                            
                            // 3. Envoyer la VCard
                            if (shop && shop.name && shop.phone_number) {
                                await WhatsAppService.sendVCard(fromPhone, shop.name, shop.phone_number);
                                toolResultPayload = { success: true, contactName: shop.name, phone: shop.phone_number };
                            } else {
                                toolResultPayload = { success: false, error: "Contact marchand (téléphone) non trouvé pour cette boutique." };
                            }
                        } else {
                            toolResultPayload = { success: false, error: "Aucune commande récente n'a été trouvée pour ce numéro." };
                        }
                    }
                }
            
            } catch (e) {
                // Attrape une erreur SQL (ex: 'is_disabled' n'existe pas)
                console.error(`Erreur lors de l'exécution de l'outil IA '${functionName}':`, e);
                toolResultPayload = { success: false, error: e.message };
            }

            // --- CORRECTION DU BUG "iterable" : Envoyer la réponse à l'IA dans un TABLEAU ---
            const result2 = await chat.sendMessage([
                { functionResponse: { name: functionName, response: toolResultPayload } }
            ]);
            return { text: result2.response.text(), model: modelToUse };
         }
         // --- FIN GESTION DES OUTILS ---

         // Si aucun outil n'a été appelé, renvoyer la réponse texte simple
        return { 
            text: response.text(),
            model: modelToUse 
        };

    } catch (error) {
        // Cette erreur est attrapée si l'appel initial ou le fallback échoue
        console.error(`ERREUR API GEMINI (Double Échec) :`, error);
        
        try {
            const fs = require('fs');
            const path = require('path');
            const logFilePath = path.join(__dirname, '..', 'whatsapp_debug.log');
            fs.appendFileSync(logFilePath, `\n${new Date().toISOString()} - [ERREUR GEMINI DOUBLE ÉCHEC] ${error.message} (Modèle: ${modelToUse}): ${error.stack}\n`, 'utf8');
        } catch (e) {}

        return { 
            text: "Je suis désolé, je rencontre actuellement une erreur de raisonnement complexe. Veuillez réessayer.",
            model: modelToUse 
        };
    }
};

/**
 * Fonction d'utilité pour le script Agent Observateur (envois proactifs de rapports).
 * (Utilise gemini-2.5)
 */
const generateText = async (prompt, model = 'gemini-2.5-flash') => { 
     if (!GEMINI_API_KEY) return "Erreur: Clé Gemini manquant.";
     
     try {
         const { response } = await generateResponseWithFallback(
            prompt,
            SAMConfig.EXPERT_WINK_INSTRUCTION,
            [], 
            model,
            'gemini-2.5-flash'
         );
         
        return response.text();
    } catch (error) {
        console.error(`Erreur de génération de texte proactif (Double Échec) avec ${model}:`, error);
        return "Erreur lors de la génération du rapport par l'Agent IA.";
    }
};

/**
 * Initialise le service en injectant le pool de connexion DB.
 * (Fonction inchangée)
 */
const init = (dbPool) => {
    console.log("[AIService] Initialisé avec la connexion DB.");
    db = dbPool; 
};


module.exports = {
    init,
    processRequest,
    generateText,
    identifyUserRole,
};