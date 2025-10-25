// public/js/suivis.js
/**
 * Module de gestion du suivi des commandes (chat admin).
 * Utilise WebSocket pour la communication en temps réel.
 * Basé sur le code source fonctionnel de l'utilisateur, avec améliorations de style et corrections.
 */

// Configuration de Moment.js pour le français et les timestamps courts
if (typeof moment === 'function') {
    moment.locale('fr');
    moment.updateLocale('fr', {
        relativeTime: {
            future: "dans %s", past: "%s", s: 'qq sec', ss: '%d sec',
            m: "1 min", mm: "%d min", h: "1 h", hh: "%d h", d: "1 j", dd: "%d j",
            M: "1 mois", MM: "%d mois", y: "1 an", yy: "%d ans"
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';
    const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

    let currentUser = null;
    let currentOrderId = null;
    let currentOrderDetails = null;
    let deliverymenCache = [];
    let shopsCache = [];
    let allConversations = [];
    let ws = null;
    let lastMessageTimestamp = null; // Restauré depuis le code source

    // --- Références DOM (Telles que définies dans le code source) ---
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userName');
    const globalUnreadBadge = document.getElementById('global-unread-badge');

    // Panneau Liste
    const conversationListPanel = document.getElementById('conversation-list-panel');
    const conversationList = document.getElementById('conversation-list');
    const conversationSearch = document.getElementById('conversation-search');
    const filterUrgentSwitch = document.getElementById('filter-urgent');
    const filterArchivedSwitch = document.getElementById('filter-archived');

    // Panneau Chat
    const chatPanel = document.getElementById('chat-panel');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const chatContent = document.getElementById('chat-content');
    const chatHeaderOrderId = document.getElementById('chat-header-order-id');
    const chatHeaderDetails = document.getElementById('chat-header-details');
    // Nouveaux spans pour les détails (regroupés)
    const chatClientPhoneDisplay = document.getElementById('chat-client-phone-display');
    const chatShopNameSpan = document.getElementById('chat-shop-name');
    const chatDeliverymanNameSpan = document.getElementById('chat-deliveryman-name');
    // Boutons Copier/Appeler (dans les dropdowns)
    const copyClientPhoneBtn = document.getElementById('copy-client-phone-btn');
    const copyLivreurPhoneBtn = document.getElementById('copy-livreur-phone-btn');
    const callClientBtn = document.getElementById('call-client-btn');
    const callLivreurBtn = document.getElementById('call-livreur-btn');

    const chatMessages = document.getElementById('chat-messages');
    const quickReplyButtonsContainer = document.getElementById('quick-reply-buttons');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');

    // Actions Admin (maintenant dans le dropdown)
    const chatAdminActions = document.getElementById('chat-admin-actions');
    const toggleUrgentBtn = document.getElementById('toggle-urgent-btn');
    const reassignBtn = document.getElementById('reassign-btn');
    const editOrderBtn = document.getElementById('edit-order-btn');
    const resetStatusBtn = document.getElementById('reset-status-btn');
    const toggleArchiveBtn = document.getElementById('toggle-archive-btn');

    // Modale Réassignation
    const reassignModalEl = document.getElementById('reassignModal');
    const reassignModal = reassignModalEl ? new bootstrap.Modal(reassignModalEl) : null;
    const reassignDeliverymanSelect = document.getElementById('reassign-deliveryman-select');
    const confirmReassignBtn = document.getElementById('confirm-reassign-btn');

    // Modale Modifier Commande
    const editOrderModalEl = document.getElementById('editOrderFromSuivisModal');
    const editOrderModal = editOrderModalEl ? new bootstrap.Modal(editOrderModalEl) : null;
    const editOrderForm = document.getElementById('editOrderFromSuivisForm');
    const editOrderModalOrderIdSpan = document.getElementById('editOrderModalOrderId');
    const editOrderIdInputModal = document.getElementById('editOrderModal_Id');
    const editShopSearchInput = document.getElementById('editOrderModal_ShopSearchInput');
    const editSearchResultsContainer = document.getElementById('editOrderModal_SearchResults');
    const editSelectedShopIdInput = document.getElementById('editOrderModal_SelectedShopId');
    const editCustomerNameInput = document.getElementById('editOrderModal_CustomerName');
    const editCustomerPhoneInput = document.getElementById('editOrderModal_CustomerPhone');
    const editDeliveryLocationInput = document.getElementById('editOrderModal_DeliveryLocation');
    const editCreatedAtInput = document.getElementById('editOrderModal_CreatedAt');
    const editItemsContainer = document.getElementById('editOrderModal_ItemsContainer');
    const editAddItemBtn = document.getElementById('editOrderModal_AddItemBtn');
    const editIsExpeditionCheckbox = document.getElementById('editOrderModal_IsExpedition');
    const editExpeditionFeeContainer = document.getElementById('editOrderModal_ExpeditionFeeContainer');
    const editExpeditionFeeInput = document.getElementById('editOrderModal_ExpeditionFee');
    const editDeliveryFeeInput = document.getElementById('editOrderModal_DeliveryFee');
    const editDeliverymanIdInput = document.getElementById('editOrderModal_DeliverymanId');


    // --- Fonctions Utilitaires ---
    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alertId = `notif-${Date.now()}`;
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const activeAlert = document.getElementById(alertId);
            if (activeAlert) { try { bootstrap.Alert.getOrCreateInstance(activeAlert)?.close(); } catch (e) { activeAlert.remove(); } }
        }, 4000);
    };

    const getAuthHeader = () => {
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) {
             console.error("AuthManager non défini ou .getToken() manquant.");
             return null;
        }
        const token = AuthManager.getToken();
        if (!token) {
             console.error("Token non trouvé par AuthManager.");
             AuthManager.logout();
             return null;
        }
        return { 'Authorization': `Bearer ${token}` };
    };

    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const fetchBaseData = async () => {
         const headers = getAuthHeader();
         if (!headers) return;
         try {
             const [deliverymenRes, shopsRes] = await Promise.all([
                 deliverymenCache.length === 0 ? axios.get(`${API_BASE_URL}/deliverymen`, { params: { status: 'actif' }, headers }) : Promise.resolve({ data: deliverymenCache }),
                 shopsCache.length === 0 ? axios.get(`${API_BASE_URL}/shops`, { params: { status: 'actif' }, headers }) : Promise.resolve({ data: shopsCache })
             ]);
             deliverymenCache = deliverymenRes.data;
             shopsCache = shopsRes.data;
             console.log("Données de base (livreurs, marchands) chargées/vérifiées.");
         } catch (error) {
             console.error("Erreur chargement données de base:", error);
             showNotification("Erreur lors du chargement des livreurs/marchands.", "danger");
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
         }
     };

    // Affiche/Masque les panneaux pour la vue mobile/desktop
    const showChatView = (showChat = true) => {
        if (!conversationListPanel || !chatPanel) return;

        if (window.innerWidth < 768) { // Point de rupture 'md' de Bootstrap
            if (showChat) {
                conversationListPanel.classList.remove('show');
                conversationListPanel.classList.add('d-none'); // Cache la liste
                chatPanel.classList.add('show');
                chatPanel.classList.remove('d-none'); // Affiche le chat
            } else {
                conversationListPanel.classList.add('show');
                conversationListPanel.classList.remove('d-none'); // Affiche la liste
                chatPanel.classList.remove('show');
                chatPanel.classList.add('d-none'); // Cache le chat
                 if(currentOrderId) {
                     leaveConversation(currentOrderId);
                     currentOrderId = null; 
                 }
                 document.querySelectorAll('.conversation-item.active').forEach(el => el.classList.remove('active'));
            }
        } else {
             conversationListPanel.classList.add('show');
             conversationListPanel.classList.remove('d-none');
             chatPanel.classList.add('show');
             chatPanel.classList.remove('d-none');
        }
         
         if (showChat && currentOrderId) {
             chatPlaceholder?.classList.add('d-none');
             chatContent?.classList.remove('d-none');
             chatContent?.classList.add('d-flex');
         } else if (!currentOrderId) {
             chatPlaceholder?.classList.remove('d-none');
             chatContent?.classList.add('d-none');
             chatContent?.classList.remove('d-flex');
         }
    };

    // --- GESTION WebSocket ---

    /**
     * Initialise la connexion WebSocket.
     */
    const initWebSocket = () => {
        const token = AuthManager.getToken();
        if (!token) {
            console.error("WebSocket: Token non trouvé, connexion annulée.");
            return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
             console.log("WebSocket déjà connecté.");
             return;
        }

        console.log(`WebSocket: Tentative de connexion à ${WS_URL}...`);
        ws = new WebSocket(`${WS_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('WebSocket: Connexion établie.');
            loadConversations(true); 
            updateGlobalUnreadCount(); 
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket: Message reçu:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket: Erreur parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket: Erreur de connexion:', error);
            showNotification("Erreur de connexion temps réel.", "danger");
        };

        ws.onclose = (event) => {
            console.log(`WebSocket: Connexion fermée. Code: ${event.code}, Raison: ${event.reason}`);
            ws = null; 
            if (event.code !== 1000 && event.code !== 1008) { 
                console.log("WebSocket: Tentative de reconnexion dans 5 secondes...");
                setTimeout(initWebSocket, 5000);
            } else if (event.code === 1008) {
                 showNotification("Authentification temps réel échouée. Reconnexion...", "warning");
                 AuthManager.logout(); 
            }
        };
    };

    /**
     * Gère les messages reçus via WebSocket.
     */
    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'AUTH_SUCCESS':
                console.log("WebSocket: Authentification confirmée par le serveur.");
                break;
            case 'NEW_MESSAGE':
                if (data.payload) {
                    if (data.payload.order_id === currentOrderId) {
                        renderMessages([data.payload], false); 
                        if (document.visibilityState === 'visible') {
                             markMessagesAsRead(currentOrderId, data.payload.id);
                        }
                    } else { 
                        updateConversationItemBadge(data.payload.order_id);
                    }
                    loadConversations();
                }
                updateGlobalUnreadCount();
                break;
            case 'UNREAD_COUNT_UPDATE':
                if (globalUnreadBadge && data.payload) {
                    const count = data.payload.unreadCount || 0;
                    globalUnreadBadge.textContent = count;
                    globalUnreadBadge.classList.toggle('d-none', count === 0);
                }
                break;
             case 'CONVERSATION_LIST_UPDATE':
                 console.log("WebSocket: Demande de rafraîchissement de la liste reçue.");
                 loadConversations();
                 break;
            case 'ERROR':
                 console.error("WebSocket: Erreur reçue du serveur:", data.message);
                 showNotification(`Erreur serveur: ${data.message}`, 'danger');
                 break;
            default:
                console.warn(`WebSocket: Type de message non géré: ${data.type}`);
        }
    };

    /**
    * Informe le serveur que l'utilisateur a rejoint une conversation.
    * @param {number} orderId
    */
    const joinConversation = (orderId) => {
        if (ws && ws.readyState === WebSocket.OPEN && orderId) {
            ws.send(JSON.stringify({ type: 'JOIN_CONVERSATION', payload: { orderId } }));
             console.log(`WebSocket: Envoi JOIN_CONVERSATION pour ${orderId}`);
        }
    };

    /**
     * Informe le serveur que l'utilisateur a quitté une conversation.
     * @param {number} orderId
     */
    const leaveConversation = (orderId) => {
         if (ws && ws.readyState === WebSocket.OPEN && orderId) {
            ws.send(JSON.stringify({ type: 'LEAVE_CONVERSATION', payload: { orderId } }));
             console.log(`WebSocket: Envoi LEAVE_CONVERSATION pour ${orderId}`);
         }
    };

    /**
     * Marque les messages comme lus via API (appel silencieux).
     * @param {number} orderId
     * @param {number} lastMessageId
     */
    const markMessagesAsRead = async (orderId, lastMessageId) => {
         const headers = getAuthHeader();
         if (!headers || !orderId || !lastMessageId || !currentUser) return;
         try {
             await axios.get(`${API_BASE_URL}/orders/${orderId}/messages?triggerRead=${lastMessageId}`, { headers });
             console.log(`WebSocket: Marqué comme lu jusqu'à ${lastMessageId} pour Cde ${orderId}`);
             updateGlobalUnreadCount();
             updateConversationItemBadge(orderId, 0); 

         } catch (error) {
              if (error.response?.status !== 401 && error.response?.status !== 403) {
                 console.error(`Erreur marquage comme lu Cde ${orderId}:`, error);
              }
         }
     };

     /**
     * Met à jour le badge non lu pour un item spécifique dans la liste des conversations.
     * @param {number} orderId
     * @param {number|null} count - Le nouveau compte (null pour juste mettre en gras)
     */
     const updateConversationItemBadge = (orderId, count = null) => {
         const convItem = conversationList?.querySelector(`.conversation-item[data-order-id="${orderId}"]`);
         if (!convItem) return;

         const titleEl = convItem.querySelector('.conv-title');
         const metaDiv = convItem.querySelector('.conv-meta div:last-child');
         const existingBadge = metaDiv?.querySelector('.badge');

         if (count === null || count > 0) { 
             if(titleEl) titleEl.classList.add('unread'); 
             if (metaDiv) {
                 if (count !== null) { 
                    if (existingBadge) {
                        existingBadge.textContent = count;
                        existingBadge.classList.remove('d-none');
                    } else {
                        metaDiv.innerHTML = `<span class="badge rounded-pill bg-danger ms-1">${count}</span>`;
                    }
                 } else if (!existingBadge) { 
                     metaDiv.innerHTML += `<span class="badge rounded-pill bg-danger ms-1">!</span>`;
                 }
             }
         } else if (count === 0) { 
              if(titleEl) titleEl.classList.remove('unread'); 
              if (existingBadge) {
                  existingBadge.classList.add('d-none'); 
                  existingBadge.textContent = '0';
              }
         }
     };


    // --- Fonctions Liste Conversations ---

    // Met à jour compteur global (appelé par WebSocket ou au chargement initial)
    const updateGlobalUnreadCount = async () => {
         const headers = getAuthHeader();
         if (!headers || !currentUser) return;
         try {
             const response = await axios.get(`${API_BASE_URL}/suivis/unread-count`, { headers });
             const count = response.data.unreadCount || 0;
             if (globalUnreadBadge) {
                 globalUnreadBadge.textContent = count;
                 globalUnreadBadge.classList.toggle('d-none', count === 0);
             }
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) {
                console.error("Erreur mise à jour compteur global:", error.message);
             }
         }
     };

    /**
     * Charge la liste des conversations avec les filtres appliqués.
     * @param {boolean} [forceUpdate=false] - Forcer l'affichage du spinner.
     */
    const loadConversations = async (forceUpdate = false) => {
        if (!forceUpdate && conversationList?.innerHTML.includes('spinner-border')) return;
        const headers = getAuthHeader();
        if (!headers || !currentUser) {
            console.warn("loadConversations annulé: utilisateur non authentifié.");
            return;
        }

        if (forceUpdate && conversationList) {
             conversationList.innerHTML = '<div class="p-5 text-center text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';
        }

        try {
            // Filtre strict envoyé au backend
            const params = {
                showArchived: filterArchivedSwitch.checked,
                showUrgentOnly: filterUrgentSwitch.checked
            };
            const response = await axios.get(`${API_BASE_URL}/suivis/conversations`, { headers, params });
            allConversations = response.data || [];
            renderConversationList();

        } catch (error) {
             if (error.response?.status === 401 || error.response?.status === 403) {
                 AuthManager.logout();
             }
             else if (forceUpdate && conversationList) {
                 console.error("Erreur chargement conversations:", error);
                 conversationList.innerHTML = '<div class="p-3 text-center text-danger">Erreur chargement.</div>';
             }
        }
    };

    /**
     * Filtre la liste chargée et rend les éléments dans le DOM.
     */
    const renderConversationList = () => {
        if (!conversationList) return; 
        const searchTerm = conversationSearch.value.toLowerCase();
        let filtered = allConversations;

        if (searchTerm) {
             filtered = filtered.filter(conv =>
                 conv.order_id.toString().includes(searchTerm) ||
                 (conv.customer_phone && conv.customer_phone.toLowerCase().includes(searchTerm)) ||
                 (conv.shop_name && conv.shop_name.toLowerCase().includes(searchTerm)) ||
                 (conv.deliveryman_name && conv.deliveryman_name.toLowerCase().includes(searchTerm))
             );
        }

        filtered.sort((a, b) => {
            if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
            return moment(b.last_message_time).diff(moment(a.last_message_time));
        });

        conversationList.innerHTML = '';
        if (filtered.length === 0) {
            conversationList.innerHTML = '<div class="p-3 text-center text-muted">Aucune conversation.</div>';
            return;
        }

        filtered.forEach(conv => {
            const item = document.createElement('a');
            item.href = '#';
            const isActive = conv.order_id === currentOrderId;
            let itemClass = 'list-group-item list-group-item-action conversation-item';
            if (isActive) itemClass += ' active';
            if (conv.is_urgent) itemClass += ' urgent'; 
            if (conv.is_archived) itemClass += ' archived';
            item.className = itemClass;

            item.dataset.orderId = conv.order_id;
            item.dataset.shopName = conv.shop_name || 'N/A';
            item.dataset.customerPhone = conv.customer_phone || 'N/A';
            item.dataset.deliverymanName = conv.deliveryman_name || 'N/A';
            item.dataset.isUrgent = conv.is_urgent ? 'true' : 'false';
            item.dataset.isArchived = conv.is_archived ? 'true' : 'false';

            const timeAgo = conv.last_message_time ? moment(conv.last_message_time).fromNow(true) : '-'; // Format court
            const unreadBadge = conv.unread_count > 0 ? `<span class="badge rounded-pill bg-danger ms-1">${conv.unread_count}</span>` : '';
            const indicatorIcon = conv.is_urgent ? 'bi-flag-fill' : (conv.is_archived ? 'bi-archive-fill' : 'bi-chat-text');
            const indicatorClass = conv.is_urgent ? 'text-danger' : 'text-muted';
            const titleClass = `conv-title ${conv.unread_count > 0 ? 'unread' : ''}`;

            item.innerHTML = `
                <i class="bi ${indicatorIcon} ${indicatorClass}"></i>
                <div class="conversation-content flex-grow-1 overflow-hidden">
                    <div class="${titleClass}">#${conv.order_id}</div>
                    <div class="conv-details text-truncate">M: ${conv.shop_name || '?'} | L: ${conv.deliveryman_name || '?'}</div>
                    <p class="mb-0 last-message text-truncate">${conv.last_message || '...'}</p>
                </div>
                <div class="conv-meta text-end flex-shrink-0">
                    <div class="conv-time">${timeAgo}</div>
                    <div>${unreadBadge}</div>
                </div>
            `;
            // L'écouteur est géré par la délégation dans initializeEventListeners
            conversationList.appendChild(item);
        });
     };

    // --- Fonctions Chat & Messages ---

    /**
     * Sélectionne une conversation et charge les messages.
     * @param {number} orderId - ID de la commande.
     * @param {Object} details - Détails initiaux (depuis le dataset).
     */
    const selectConversation = async (orderId, details = {}) => {
        const previousOrderId = currentOrderId;

        if (previousOrderId && previousOrderId !== orderId) {
            leaveConversation(previousOrderId);
        }
        if (currentOrderId === orderId && chatContent?.classList.contains('d-flex')) {
             showChatView(true);
             joinConversation(orderId);
             return;
        }

        currentOrderId = orderId;
        lastMessageTimestamp = null; 
        currentOrderDetails = null;

        document.querySelectorAll('.conversation-item').forEach(item => {
             item.classList.toggle('active', item.dataset.orderId == currentOrderId);
        });

        if(chatPlaceholder) chatPlaceholder.classList.add('d-none');
        if(chatContent) {
            chatContent.classList.remove('d-none');
            chatContent.classList.add('d-flex');
             setTimeout(() => { if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
        }

        // MAJ Header Chat
        if(chatHeaderOrderId) chatHeaderOrderId.textContent = currentOrderId;
        if(chatClientPhoneDisplay) chatClientPhoneDisplay.textContent = details.customerPhone || '?';
        if(chatShopNameSpan) chatShopNameSpan.textContent = details.shopName || '?';
        if(chatDeliverymanNameSpan) chatDeliverymanNameSpan.textContent = details.deliverymanName || '?';
        updateCopyCallButtons(details.customerPhone, null);

        const isUrgent = details.isUrgent === 'true';
        const isArchived = details.isArchived === 'true';

        // Mettre à jour les éléments DANS le dropdown admin
        const urgentLink = document.getElementById('toggle-urgent-btn');
        const archiveLink = document.getElementById('toggle-archive-btn');
        if(urgentLink){ urgentLink.innerHTML = isUrgent ? '<i class="bi bi-flag-fill text-danger me-2"></i> Démarquer Urgent' : '<i class="bi bi-flag me-2"></i> Marquer Urgent'; }
        if(archiveLink){ archiveLink.innerHTML = isArchived ? '<i class="bi bi-archive-fill me-2"></i> Désarchiver' : '<i class="bi bi-archive me-2"></i> Archiver'; }


        if (currentUser && currentUser.role === 'admin') {
            chatAdminActions?.classList.remove('d-none');
        } else {
            chatAdminActions?.classList.add('d-none');
        }

        joinConversation(orderId);
        await loadMessages(currentOrderId, null); 
        loadQuickReplies(); 
        showChatView(true); 
        loadFullOrderDetailsForHeader(orderId); 
     };

    /**
     * Charge les détails complets (numéros) pour le header du chat.
     */
    const loadFullOrderDetailsForHeader = async (orderId) => {
         const headers = getAuthHeader();
         if (!headers) return;
         try {
             const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`, { headers });
             currentOrderDetails = response.data;
             let livreurPhone = null;
             if (currentOrderDetails && currentOrderDetails.deliveryman_id) {
                 if (deliverymenCache.length === 0) await fetchBaseData();
                 const livreur = deliverymenCache.find(d => d.id == currentOrderDetails.deliveryman_id);
                 livreurPhone = livreur ? livreur.phone_number : null;
             }
             updateCopyCallButtons(currentOrderDetails?.customer_phone, livreurPhone);
         } catch (error) { 
             console.error(`Erreur chargement détails Cde ${orderId} header:`, error); 
             // Fallback
             const item = conversationList?.querySelector(`.conversation-item[data-order-id="${orderId}"]`);
             if (item) { updateCopyCallButtons(item.dataset.customerPhone, null); }
         }
     };

     /**
      * Met à jour les boutons copier/appeler dans le dropdown.
      */
      const updateCopyCallButtons = (clientPhone, livreurPhone) => {
         const cleanPhone = (phone) => phone?.replace(/\s/g, '').replace(/[^0-9+]/g, '') || '';
         const clientClean = cleanPhone(clientPhone);
         const livreurClean = cleanPhone(livreurPhone);

         document.getElementById('call-client-btn')?.classList.toggle('d-none', !clientClean);
         document.getElementById('call-client-btn')?.setAttribute('href', clientClean ? `tel:${clientClean}` : '#');
         document.getElementById('copy-client-phone-btn')?.classList.toggle('d-none', !clientClean);
         document.getElementById('copy-client-phone-btn')?.setAttribute('data-copy-value', clientClean);
         
         document.getElementById('call-livreur-btn')?.classList.toggle('d-none', !livreurClean);
         document.getElementById('call-livreur-btn')?.setAttribute('href', livreurClean ? `tel:${livreurClean}` : '#');
         document.getElementById('copy-livreur-phone-btn')?.classList.toggle('d-none', !livreurClean);
         document.getElementById('copy-livreur-phone-btn')?.setAttribute('data-copy-value', livreurClean);
         
         if (chatClientPhoneDisplay) chatClientPhoneDisplay.textContent = clientPhone || 'N/A';
         document.getElementById('copy-order-id-btn')?.setAttribute('data-copy-target', '#chat-header-order-id');
     };

    /**
     * Charge les messages initiaux (historique).
     */
    const loadMessages = async (orderId, since = null) => {
        if (since) { return; } // WebSocket gère les nouveaux messages
        if (chatMessages) chatMessages.innerHTML = '<div class="p-5 text-center text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

        const headers = getAuthHeader();
        if (!headers || !currentUser) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/orders/${orderId}/messages`, { headers });
            const messages = response.data || [];

            if (messages.length > 0) {
                 renderMessages(messages, true); 
                 lastMessageTimestamp = messages[messages.length - 1].created_at;
                  markMessagesAsRead(orderId, messages[messages.length-1].id);
            } else if (chatMessages) {
                 chatMessages.innerHTML = '<div class="p-3 text-center text-muted">Aucun message.</div>';
            }
             loadConversations(); 

        } catch (error) {
             if (error.response?.status === 401 || error.response?.status === 403) {
                 AuthManager.logout();
             } else if (chatMessages) {
                 console.error(`Erreur messages Cde ${orderId}:`, error);
                 chatMessages.innerHTML = '<div class="p-3 text-center text-danger">Erreur chargement messages.</div>';
             }
        }
    };

    /**
     * Rend les messages dans la zone de chat (avec style "bulle").
     */
    const renderMessages = (messages, replace = true) => {
        if (!chatMessages) return;
        if (replace) chatMessages.innerHTML = '';
        const isScrolledDown = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 50;

        const replaceEmojis = (text) => text.replace(/:\)/g, '😊').replace(/:D/g, '😃').replace(/;\)/g, '😉').replace(/:o/g, '😮').replace(/<3/g, '❤️').replace(/\(y\)/g, '👍');

        messages.forEach(msg => {
            if (!replace && chatMessages.querySelector(`[data-message-id="${msg.id}"]`)) return;

            const messageDiv = document.createElement('div');
            messageDiv.dataset.messageId = msg.id;
            const isSent = msg.user_id === currentUser?.id;
            const isSystem = msg.message_type === 'system';
            let messageClass = 'message';
            
            if (isSystem) messageClass += ' message-system';
            else if (isSent) messageClass += ' message-sent';
            else messageClass += ' message-received';
            messageDiv.className = messageClass;

            const time = moment(msg.created_at).format('HH:mm');
            // CORRIGÉ: Auteur affiché seulement si reçu
            const authorHtml = isSystem ? '' : (!isSent ? `<div class="message-author">${msg.user_name || 'Admin'}</div>` : '');

            const messageContentRaw = msg.message_content || '';
            const messageContentHtml = messageContentRaw
                .replace(/#(\d+)/g, '<a href="#" class="text-info fw-bold text-decoration-none tag-link" data-tag-order-id="$1">#$1</a>');
            
            const contentWithEmojis = replaceEmojis(messageContentHtml);
            
            messageDiv.innerHTML = `
                ${authorHtml}
                ${contentWithEmojis}
                <div class="message-meta">${time}</div>
            `;
            chatMessages.appendChild(messageDiv);
        });

        if (isScrolledDown || replace) {
             setTimeout(() => { if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
        }
     };

    // Charger quick replies (inchangé)
    const loadQuickReplies = async () => {
         if (!quickReplyButtonsContainer) return;
         quickReplyButtonsContainer.innerHTML = '';
         const headers = getAuthHeader();
         if (!headers || !currentUser) return;

         try {
             const response = await axios.get(`${API_BASE_URL}/suivis/quick-replies`, { headers });
             const quickReplies = response.data || [];
             quickReplies.forEach(replyText => {
                 const button = document.createElement('button');
                 button.className = 'btn btn-sm btn-outline-secondary quick-reply-btn';
                 button.textContent = replyText;
                 button.type = 'button';
                 button.addEventListener('click', () => { 
                    if(messageInput) { 
                        messageInput.value += (messageInput.value ? ' ' : '') + replyText; 
                        messageInput.focus(); 
                        messageInput.dispatchEvent(new Event('input', { bubbles: true })); 
                    } 
                 });
                 quickReplyButtonsContainer.appendChild(button);
             });

         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) console.error("Erreur messages rapides:", error);
         }
    };

    // Envoyer message (utilise toujours axios.post, réception via WebSocket)
    const sendMessage = async () => {
         const content = messageInput?.value.trim(); if (!content || !currentOrderId) return; const headers = getAuthHeader(); if (!headers || !currentUser) return;
         const tempId = `temp_${Date.now()}`; const optimisticMessage = { id: tempId, user_id: currentUser.id, user_name: currentUser.name, message_content: content, created_at: new Date().toISOString(), message_type: 'user' };
         renderMessages([optimisticMessage], false); 
         if(messageInput){ messageInput.value = ''; messageInput.rows = 1; }
         if(sendMessageBtn) sendMessageBtn.disabled = true;
         try {
             await axios.post(`${API_BASE_URL}/orders/${currentOrderId}/messages`, { message_content: content }, { headers });
             // La confirmation et le message final viendront du WebSocket
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) { console.error(`Erreur envoi Cde ${currentOrderId}:`, error); showNotification("Erreur envoi.", 'danger'); const msgElement = chatMessages?.querySelector(`[data-message-id="${tempId}"]`); if (msgElement) { msgElement.style.opacity = '0.5'; msgElement.title = "Échec."; } }
             if (error.response?.status === 401 || error.response?.status === 403) { AuthManager.logout(); }
         } finally { if(sendMessageBtn) sendMessageBtn.disabled = false; }
     };

    // --- Fonctions Actions Admin ---
    
    const toggleUrgency = async () => {
        if (!currentOrderId) return;
        const headers = getAuthHeader(); if (!headers) return;
        const link = document.getElementById('toggle-urgent-btn');
        const isCurrentlyUrgent = link.innerHTML.includes('flag-fill');
        const newUrgencyState = !isCurrentlyUrgent;
        try {
            await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/toggle-urgency`, { is_urgent: newUrgencyState, userId: currentUser.id }, { headers });
            link.innerHTML = newUrgencyState ? '<i class="bi bi-flag-fill text-danger me-2"></i> Démarquer Urgent' : '<i class="bi bi-flag me-2"></i> Marquer Urgent';
            showNotification(`Urgence ${newUrgencyState ? 'activée' : 'désactivée'}.`);
            loadMessages(currentOrderId, true); 
            loadConversations(true);
        } catch (error) {
            if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur urgence:", error); showNotification(error.response?.data?.message || "Erreur urgence.", "danger"); }
            if (error.response?.status === 401 || error.response?.status === 403) { AuthManager.logout(); }
        }
     };

     const toggleArchive = async () => {
         if (!currentOrderId) return;
         const headers = getAuthHeader(); if (!headers) return;
         const link = document.getElementById('toggle-archive-btn');
         const isCurrentlyArchived = link.innerHTML.includes('archive-fill');
         const newArchiveState = !isCurrentlyArchived;
         
         try {
             await axios.put(`${API_BASE_URL}/suivis/conversations/${currentOrderId}/toggle-archive`, { is_archived: newArchiveState, userId: currentUser.id }, { headers });
             link.innerHTML = newArchiveState ? '<i class="bi bi-archive-fill me-2"></i> Désarchiver' : '<i class="bi bi-archive me-2"></i> Archiver';
             showNotification(`Conversation ${newArchiveState ? 'archivée' : 'désarchivée'}.`);
             
             if (newArchiveState) showChatView(false);
             loadConversations(true); 
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur archivage:", error); showNotification(error.response?.data?.message || "Erreur archivage.", "danger"); }
             if (error.response?.status === 401 || error.response?.status === 403) { AuthManager.logout(); }
         }
     };
     
     const confirmReassignment = async () => {
         const newDeliverymanId = reassignDeliverymanSelect.value;
         if (!newDeliverymanId || !currentOrderId) { showNotification("Sélectionnez un livreur.", "warning"); return; }
         
         const headers = getAuthHeader(); if (!headers) return;
         if(confirmReassignBtn) confirmReassignBtn.disabled = true;
         
         try {
             await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/reassign-from-chat`, { newDeliverymanId, userId: currentUser.id }, { headers });
             showNotification("Commande réassignée !");
             reassignModal?.hide();
             loadMessages(currentOrderId, true); 
             loadConversations(true);
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur réassignation:", error); showNotification(error.response?.data?.message || "Erreur réassignation.", "danger"); }
             if (error.response?.status === 401 || error.response?.status === 403) { AuthManager.logout(); }
         } finally { if(confirmReassignBtn) confirmReassignBtn.disabled = false; }
     };
     
     const resetOrderStatus = async () => {
         if (!currentOrderId) return;
         if (!confirm(`Voulez-vous vraiment réinitialiser le statut de la commande #${currentOrderId} ? Cela la remettra généralement en attente.`)) return;
         
         const headers = getAuthHeader(); if (!headers) return;
         
         try {
             await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/reset-status-from-chat`, { userId: currentUser.id }, { headers });
             showNotification("Statut réinitialisé avec succès !");
             loadMessages(currentOrderId, true); 
             loadConversations(true);
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur reset:", error); showNotification(error.response?.data?.message || "Erreur reset.", "danger"); }
             if (error.response?.status === 401 || error.response?.status === 403) { AuthManager.logout(); }
         }
     };

     // --- Fonctions Modale Edition ---
     const openEditOrderModal = async () => { /* ... (Logique du code source) ... */ };
     const handleEditOrderSubmit = async (e) => { /* ... (Logique du code source) ... */ };
     const addItemRowModal = (container, item = {}) => { /* ... (Logique du code source) ... */ };
     const handleRemoveItemModal = (container) => { /* ... (Logique du code source) ... */ };
     const setupShopSearchModal = (input, results, hidden) => { /* ... (Logique du code source) ... */ };

     const handleCopyClick = (e) => {
         const button = e.target.closest('.copy-btn'); if (!button) return; let textToCopy = ''; const targetSelector = button.dataset.copyTarget; const valueToCopy = button.dataset.copyValue;
         if (targetSelector) { const targetElement = document.querySelector(targetSelector); textToCopy = targetElement?.textContent || ''; } else if (valueToCopy) { textToCopy = valueToCopy; }
         if (textToCopy) { navigator.clipboard.writeText(textToCopy.trim()).then(() => showNotification('Copié: ' + textToCopy.trim(), 'info')).catch(err => { console.error('Erreur copie:', err); showNotification('Erreur copie', 'danger'); }); }
     };

    // --- GESTION DES ÉVÉNEMENTS ---

    const initializeEventListeners = () => {
        // Bouton Hamburger
        sidebarToggler?.addEventListener('click', () => {
            if (!sidebar || !mainContent) return; 
            if (window.innerWidth < 992) {
                 sidebar.classList.toggle('show');
            } else { 
                sidebar.classList.toggle('collapsed'); 
                mainContent.classList.toggle('expanded'); 
            }
        });
        
        logoutBtn?.addEventListener('click', () => { if (ws) { ws.close(1000, "Déconnexion manuelle"); } AuthManager.logout(); });
        
        // Filtres
        filterUrgentSwitch?.addEventListener('change', () => loadConversations(true));
        filterArchivedSwitch?.addEventListener('change', () => loadConversations(true));
        conversationSearch?.addEventListener('input', debounce(renderConversationList));
        
        // Sélection de la conversation
        conversationList?.addEventListener('click', (e) => {
            const item = e.target.closest('.conversation-item');
            if (item && item.dataset.orderId) {
                 e.preventDefault();
                 selectConversation(item.dataset.orderId, item.dataset);
            }
        });
        
        // Chat
        backToListBtn?.addEventListener('click', () => { showChatView(false); });
        messageInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        sendMessageBtn?.addEventListener('click', sendMessage);
        
        // Actions Admin (Dropdown)
        document.querySelector('#chat-admin-actions .dropdown-menu')?.addEventListener('click', (e) => {
             const actionLink = e.target.closest('a.dropdown-item');
             if (!actionLink) return;
             
             const actionId = actionLink.id;
             e.preventDefault();

             const dropdownToggle = actionLink.closest('.dropdown').querySelector('.dropdown-toggle');
             const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownToggle);
             if (dropdownInstance) dropdownInstance.hide();

             if (actionId === 'toggle-urgent-btn') toggleUrgency();
             else if (actionId === 'toggle-archive-btn') toggleArchive();
             else if (actionId === 'reassign-btn') { if (currentOrderId && reassignModal) { loadDeliverymenForSelect(); reassignModal.show(); } }
             else if (actionId === 'edit-order-btn') { if (currentOrderId && editOrderModal) { openEditOrderModal(); } }
             else if (actionId === 'reset-status-btn') resetOrderStatus();
        });
        
        confirmReassignBtn?.addEventListener('click', confirmReassignment);
        
        // Actions Contact/Copie (Dropdown)
        document.querySelector('.header-actions-group .dropdown-menu')?.addEventListener('click', handleCopyClick);

        // Listeners Modale Edition (pris du code source)
        editOrderForm?.addEventListener('submit', handleEditOrderSubmit);
        editAddItemBtn?.addEventListener('click', () => addItemRowModal(editItemsContainer));
        handleRemoveItemModal(editItemsContainer);
        setupShopSearchModal(editShopSearchInput, editSearchResultsContainer, editSelectedShopIdInput);
        editIsExpeditionCheckbox?.addEventListener('change', () => { if(editExpeditionFeeContainer){ editExpeditionFeeContainer.style.display = editIsExpeditionCheckbox.checked ? 'block' : 'none'; if (!editIsExpeditionCheckbox.checked && editExpeditionFeeInput) editExpeditionFeeInput.value = 0; } });
    
        // Gestion de la visibilité
        document.addEventListener('visibilitychange', () => {
             if (document.visibilityState === 'visible') {
                 if (!ws || ws.readyState !== WebSocket.OPEN) { initWebSocket(); } 
                 else if (currentOrderId) {
                      const lastMessageEl = chatMessages?.lastElementChild;
                      if(lastMessageEl && lastMessageEl.dataset.messageId){
                        markMessagesAsRead(currentOrderId, lastMessageEl.dataset.messageId);
                      }
                 }
                 updateGlobalUnreadCount();
                 loadConversations();
             }
         });
    };

    // --- INITIALISATION ---
    const initializeApp = async () => {
        currentUser = AuthManager.getUser();
        if (!currentUser || currentUser.role !== 'admin') { 
            console.warn("Accès non admin ou utilisateur non chargé.");
            AuthManager.logout(); 
            return; 
        }
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name || '{{username}}';

        await fetchBaseData();
        initWebSocket();
        initializeEventListeners();
        // loadConversations(true) est appelé par ws.onopen()
        showChatView(false);
    };

    // Initialisation basée sur auth.js fourni
    if (typeof AuthManager !== 'undefined') {
        AuthManager.init();
        document.addEventListener('authManagerReady', initializeApp);
        
        if (AuthManager.getUser()) {
             setTimeout(() => { if (!currentUser) { initializeApp(); } }, 50);
        }
    } else {
         console.error("AuthManager n'est pas défini.");
         showNotification("Erreur critique d'initialisation de l'authentification.", "danger");
    }
});