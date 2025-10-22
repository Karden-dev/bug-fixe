// public/js/suivis.js
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';
    let currentUser = null;
    let currentOrderId = null; // ID de la commande dont la conversation est affichée
    let currentOrderDetails = null; // Détails de la commande affichée (pour appels, etc.)
    let deliverymenCache = []; // Pour la réassignation
    let shopsCache = []; // Pour la modification de commande
    let allConversations = []; // Cache local des conversations chargées
    let quickRepliesCache = []; // Cache pour les messages rapides
    let pollingIntervalId = null; // ID pour l'intervalle de rafraîchissement
    let lastMessageTimestamp = null; // Pour le polling des messages de la conversation ouverte
    const POLLING_INTERVAL = 2000; // Rafraîchissement toutes les 2 secondes

    // --- Références DOM ---
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
    // Spans spécifiques dans le header pour les détails
    const chatClientPhoneSpan = document.getElementById('chat-client-phone');
    const chatShopNameSpan = document.getElementById('chat-shop-name');
    const chatDeliverymanNameSpan = document.getElementById('chat-deliveryman-name');
    // Boutons Copier/Appeler dans le header
    const copyOrderIdBtn = document.querySelector('.copy-btn[data-copy-target="#chat-header-order-id"]');
    const copyClientPhoneBtn = document.getElementById('copy-client-phone-btn');
    const copyLivreurPhoneBtn = document.getElementById('copy-livreur-phone-btn');
    const callClientBtn = document.getElementById('call-client-btn');
    const callLivreurBtn = document.getElementById('call-livreur-btn');

    const chatMessages = document.getElementById('chat-messages');
    const quickReplyButtonsContainer = document.getElementById('quick-reply-buttons');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');

    // Actions Admin dans le Chat
    const chatAdminActions = document.getElementById('chat-admin-actions');
    const toggleUrgentBtn = document.getElementById('toggle-urgent-btn');
    const reassignBtn = document.getElementById('reassign-btn');
    const editOrderBtn = document.getElementById('edit-order-btn'); // Nouveau bouton modifier
    const resetStatusBtn = document.getElementById('reset-status-btn');

    // Modale Réassignation
    const reassignModalEl = document.getElementById('reassignModal');
    const reassignModal = reassignModalEl ? new bootstrap.Modal(reassignModalEl) : null;
    const reassignDeliverymanSelect = document.getElementById('reassign-deliveryman-select');
    const confirmReassignBtn = document.getElementById('confirm-reassign-btn');

    // Modale Modifier Commande (Champs adaptés pour cette modale)
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
        const alertId = `notif-${Date.now()}`; // Unique ID for each alert
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const activeAlert = document.getElementById(alertId);
            if (activeAlert) {
                try { // Envelopper dans try/catch au cas où l'alerte est déjà retirée
                    const bsAlert = bootstrap.Alert.getOrCreateInstance(activeAlert);
                    if (bsAlert) bsAlert.close();
                } catch (e) {
                    activeAlert.remove(); // Force remove if Bootstrap fails
                }
            }
        }, 4000);
    };

    const getAuthHeader = () => {
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) {
             showNotification("Erreur d'authentification critique.", "danger");
             setTimeout(() => AuthManager?.logout(), 1000);
             return null;
        }
        const token = AuthManager.getToken();
        // Ne pas déconnecter ici, laisser AuthManager gérer l'expiration/invalidité lors de l'appel API
        return token ? { 'Authorization': `Bearer ${token}` } : null;
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

    // Charger livreurs actifs et marchands actifs
    const fetchBaseData = async () => {
         const headers = getAuthHeader();
         if (!headers) return; // Ne pas continuer si pas de token
         try {
             // Charger seulement si les caches sont vides pour optimiser
             const promises = [];
             if (deliverymenCache.length === 0) {
                 promises.push(axios.get(`${API_BASE_URL}/deliverymen`, { params: { status: 'actif' }, headers }));
             } else {
                 promises.push(Promise.resolve({ data: deliverymenCache })); // Renvoyer le cache
             }
             if (shopsCache.length === 0) {
                 promises.push(axios.get(`${API_BASE_URL}/shops`, { params: { status: 'actif' }, headers }));
             } else {
                 promises.push(Promise.resolve({ data: shopsCache })); // Renvoyer le cache
             }

             const [deliverymenRes, shopsRes] = await Promise.all(promises);
             deliverymenCache = deliverymenRes.data;
             shopsCache = shopsRes.data;
             console.log("Données de base (livreurs, marchands) chargées/vérifiées.");
         } catch (error) {
             console.error("Erreur chargement données de base:", error);
             showNotification("Erreur lors du chargement des livreurs/marchands.", "danger");
             if (error.response?.status === 401 || error.response?.status === 403) {
                 stopPolling(); AuthManager.logout(); // Déconnecter si erreur d'auth
             }
         }
     };

    // Affiche/Masque les panneaux pour la vue mobile
    /**
     * Gère l'affichage/masquage des panneaux Liste/Chat pour mobile/desktop.
     * @param {boolean} showChat - True pour afficher le chat, False pour afficher la liste.
     */
    const showChatView = (showChat = true) => {
        if (!conversationListPanel || !chatPanel) return; // Sécurité si DOM pas prêt

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
                 currentOrderId = null; // Désélectionner la conversation quand on retourne à la liste sur mobile
                 document.querySelectorAll('.conversation-item.active').forEach(el => el.classList.remove('active')); // Retirer l'état actif visuel
            }
        } else {
             // Sur desktop, les deux panneaux sont toujours structurellement présents
             conversationListPanel.classList.add('show');
             conversationListPanel.classList.remove('d-none');
             chatPanel.classList.add('show');
             chatPanel.classList.remove('d-none');
        }
         // Gérer l'affichage du placeholder ou du contenu du chat
         if (showChat && currentOrderId) {
             chatPlaceholder?.classList.add('d-none');
             chatContent?.classList.remove('d-none');
             chatContent?.classList.add('d-flex');
         } else if (!currentOrderId && chatPanel?.classList.contains('show')) {
             // Si on est sur le panneau chat mais SANS conversation sélectionnée (Desktop principalement)
             chatPlaceholder?.classList.remove('d-none');
             chatContent?.classList.add('d-none');
             chatContent?.classList.remove('d-flex');
         }
    };


    // --- Fonctions Polling & Compteurs ---

    const stopPolling = () => {
         if (pollingIntervalId) {
             clearInterval(pollingIntervalId);
             pollingIntervalId = null;
             console.log("Polling arrêté.");
         }
     };

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
             if (error.response?.status === 401 || error.response?.status === 403) {
                 stopPolling(); AuthManager.logout();
             }
         }
     };

     const startPolling = () => {
         stopPolling();
         console.log(`Démarrage du polling (Intervalle: ${POLLING_INTERVAL}ms)...`);
         updateGlobalUnreadCount();
         loadConversations(true);

         pollingIntervalId = setInterval(() => {
             if (document.visibilityState === 'visible' && currentUser) {
                 loadConversations();
                 updateGlobalUnreadCount();
                 if (currentOrderId && chatPanel.classList.contains('show')) {
                     loadMessages(currentOrderId, lastMessageTimestamp);
                 }
             }
         }, POLLING_INTERVAL);
     };

    // --- Fonctions Liste Conversations ---

    const loadConversations = async (forceUpdate = false) => {
        if (!forceUpdate && conversationList.innerHTML.includes('Chargement...')) return;
        const headers = getAuthHeader();
        if (!headers || !currentUser) return;

        if (forceUpdate && conversationList) {
             conversationList.innerHTML = '<div class="p-5 text-center text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';
        }

        try {
            const params = {
                showArchived: filterArchivedSwitch.checked,
                showUrgentOnly: filterUrgentSwitch.checked
                // La recherche filtre côté client
            };

            const response = await axios.get(`${API_BASE_URL}/suivis/conversations`, { headers, params });
            allConversations = response.data || [];
            renderConversationList();

        } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) {
                console.error("Erreur chargement conversations:", error);
                if (conversationList) conversationList.innerHTML = '<div class="p-3 text-center text-danger">Erreur chargement.</div>';
             }
             if (error.response?.status === 401 || error.response?.status === 403) {
                 stopPolling(); AuthManager.logout();
             }
        }
    };

    const renderConversationList = () => {
        if (!conversationList) return; // Sécurité
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
            item.dataset.isUrgent = conv.is_urgent ? 'true' : 'false'; // Stocker comme string pour cohérence dataset

            const timeAgo = conv.last_message_time ? moment(conv.last_message_time).fromNow() : '-';
            const unreadBadge = conv.unread_count > 0 ? `<span class="badge rounded-pill bg-danger ms-1">${conv.unread_count}</span>` : '';
            const urgentIcon = conv.is_urgent ? '<i class="bi bi-flag-fill urgent-icon-list"></i>' : '';
            const archivedIcon = conv.is_archived ? '<i class="bi bi-archive-fill text-muted me-1"></i>' : '';
            const titleClass = `conv-title ${conv.unread_count > 0 ? 'unread' : ''}`;

            item.innerHTML = `
                ${urgentIcon || archivedIcon}
                <div class="conversation-content">
                    <div class="${titleClass}">#${conv.order_id}</div>
                    <div class="conv-details">M: ${conv.shop_name || '?'} | C: ${conv.customer_phone || '?'} | L: ${conv.deliveryman_name || '?'}</div>
                    <p class="mb-0 last-message">${conv.last_message || '...'}</p>
                </div>
                <div class="conv-meta">
                    <div class="conv-time">${timeAgo}</div>
                    <div>${unreadBadge}</div>
                </div>
            `;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                selectConversation(conv.order_id, item.dataset);
            });
            conversationList.appendChild(item);
        });
     };

    // --- Fonctions Chat & Messages ---

    const selectConversation = async (orderId, details = {}) => {
        // console.log(`Selecting conversation: ${orderId}`); // Debug
        if (currentOrderId === orderId && chatContent?.classList.contains('d-flex')) {
             showChatView(true);
             return;
        }

        currentOrderId = orderId;
        lastMessageTimestamp = null;
        currentOrderDetails = null;

        document.querySelectorAll('.conversation-item').forEach(item => {
             item.classList.toggle('active', item.dataset.orderId == currentOrderId);
        });

        // Afficher panneau chat, masquer placeholder
        if(chatPlaceholder) chatPlaceholder.classList.add('d-none');
        if(chatContent) {
            chatContent.classList.remove('d-none');
            chatContent.classList.add('d-flex');
        }

        // MAJ Header Chat
        if(chatHeaderOrderId) chatHeaderOrderId.textContent = currentOrderId;
        if(chatClientPhoneSpan) chatClientPhoneSpan.textContent = details.customerPhone || '?';
        if(chatShopNameSpan) chatShopNameSpan.textContent = details.shopName || '?';
        if(chatDeliverymanNameSpan) chatDeliverymanNameSpan.textContent = details.deliverymanName || '?';

        updateCopyCallButtons(details.customerPhone, null); // Num livreur chargé async

        const isUrgent = details.isUrgent === 'true'; // Comparaison string
        if(toggleUrgentBtn){
            toggleUrgentBtn.innerHTML = isUrgent ? '<i class="bi bi-flag-fill text-danger"></i>' : '<i class="bi bi-flag"></i>';
            toggleUrgentBtn.title = isUrgent ? 'Démarquer Urgent' : 'Marquer Urgent';
        }

        if (currentUser && currentUser.role === 'admin') {
            chatAdminActions?.classList.remove('d-none');
        } else {
            chatAdminActions?.classList.add('d-none');
        }

        // Charger messages + quick replies
        await loadMessages(currentOrderId, null);
        loadQuickReplies();

        showChatView(true); // Switch view mobile

        // Charger détails complets (numéros) en arrière-plan
        loadFullOrderDetailsForHeader(orderId);
     };

    const loadFullOrderDetailsForHeader = async (orderId) => { /* ... (inchangé) ... */
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
         } catch (error) { console.error(`Erreur chargement détails Cde ${orderId} header:`, error); updateCopyCallButtons(chatClientPhoneSpan?.textContent, null); }
     };

     const updateCopyCallButtons = (clientPhone, livreurPhone) => { /* ... (inchangé) ... */
         // Client
         const cleanClientPhone = clientPhone?.replace(/\s/g, '');
         if (callClientBtn && copyClientPhoneBtn && chatClientPhoneSpan) {
             if (cleanClientPhone) {
                 callClientBtn.href = `tel:${cleanClientPhone}`; callClientBtn.classList.remove('d-none');
                 copyClientPhoneBtn.classList.remove('d-none'); copyClientPhoneBtn.dataset.copyValue = clientPhone;
                 chatClientPhoneSpan.textContent = clientPhone;
             } else { callClientBtn.classList.add('d-none'); copyClientPhoneBtn.classList.add('d-none'); chatClientPhoneSpan.textContent = '?'; }
         }
         // Livreur
         const cleanLivreurPhone = livreurPhone?.replace(/\s/g, '');
         if (callLivreurBtn && copyLivreurPhoneBtn) {
             if (cleanLivreurPhone) {
                 callLivreurBtn.href = `tel:${cleanLivreurPhone}`; callLivreurBtn.classList.remove('d-none');
                 copyLivreurPhoneBtn.classList.remove('d-none'); copyLivreurPhoneBtn.dataset.copyValue = livreurPhone;
             } else { callLivreurBtn.classList.add('d-none'); copyLivreurPhoneBtn.classList.add('d-none'); }
         }
     };

    const loadMessages = async (orderId, since = null) => { /* ... (inchangé) ... */
        if (currentOrderId !== orderId || !chatPanel?.classList.contains('show')) return;
        if (!since && chatMessages) chatMessages.innerHTML = '<div class="p-5 text-center text-muted"><div class="spinner-border spinner-border-sm" role="status"></div></div>';

        const headers = getAuthHeader();
        if (!headers || !currentUser) return;

        const params = {};
        if (since) params.since = since;

        try {
            const response = await axios.get(`${API_BASE_URL}/orders/${orderId}/messages`, { headers, params });
            const messages = response.data || [];

            if (messages.length > 0) {
                 renderMessages(messages, !since);
                 lastMessageTimestamp = messages[messages.length - 1].created_at;
                 if (!since) loadConversations(); // Recharger liste si chargement initial pour badges
            } else if (!since && chatMessages) {
                 chatMessages.innerHTML = '<div class="p-3 text-center text-muted">Aucun message.</div>';
            }

        } catch (error) {
            if (error.response?.status !== 401 && error.response?.status !== 403) {
                console.error(`Erreur messages Cde ${orderId}:`, error);
                if (!since && chatMessages) chatMessages.innerHTML = '<div class="p-3 text-center text-danger">Erreur chargement messages.</div>';
            }
            if (error.response?.status === 401 || error.response?.status === 403) {
                 stopPolling(); AuthManager.logout();
            }
        }
    };

    const renderMessages = (messages, replace = true) => { /* ... (inchangé) ... */
        if (!chatMessages) return;
        if (replace) chatMessages.innerHTML = '';
        const isScrolledDown = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 30;

        messages.forEach(msg => {
            if (!replace && chatMessages.querySelector(`[data-message-id="${msg.id}"]`)) return;

            const messageDiv = document.createElement('div');
            messageDiv.dataset.messageId = msg.id;
            const isSent = msg.user_id === currentUser.id;
            const isSystem = msg.message_type === 'system';
            let messageClass = 'message';
            if (isSystem) messageClass += ' message-system';
            else if (isSent) messageClass += ' message-sent';
            else messageClass += ' message-received';
            messageDiv.className = messageClass;

            const time = moment(msg.created_at).format('HH:mm');
            const author = isSystem ? '' : `<strong>${isSent ? 'Moi' : (msg.user_name || '?')}:</strong><br>`;
            const messageContent = (msg.message_content || '').replace(/#(\d+)/g, '<a href="#" class="text-info fw-bold text-decoration-none tag-link" data-tag-order-id="$1">#$1</a>');

            messageDiv.innerHTML = `${author}${messageContent}<div class="message-meta">${time}</div>`;
            chatMessages.appendChild(messageDiv);
        });

        if (isScrolledDown || replace) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
     };

    const loadQuickReplies = async () => { /* ... (inchangé, utilise route corrigée) ... */
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
                 button.addEventListener('click', () => { messageInput.value += (messageInput.value ? ' ' : '') + replyText; messageInput.focus(); messageInput.dispatchEvent(new Event('input', { bubbles: true })); });
                 quickReplyButtonsContainer.appendChild(button);
             });

         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) console.error("Erreur messages rapides:", error);
         }
    };

    const sendMessage = async () => { /* ... (inchangé) ... */
         const content = messageInput.value.trim(); if (!content || !currentOrderId) return; const headers = getAuthHeader(); if (!headers || !currentUser) return;
         const tempId = `temp_${Date.now()}`; const optimisticMessage = { id: tempId, user_id: currentUser.id, user_name: currentUser.name, message_content: content, created_at: new Date().toISOString(), message_type: 'user' };
         renderMessages([optimisticMessage], false); lastMessageTimestamp = optimisticMessage.created_at; messageInput.value = ''; messageInput.rows = 1; sendMessageBtn.disabled = true;
         try {
             const response = await axios.post(`${API_BASE_URL}/orders/${currentOrderId}/messages`, { message_content: content }, { headers }); const newMessage = response.data;
             const msgElement = chatMessages?.querySelector(`[data-message-id="${tempId}"]`); if (msgElement) msgElement.remove(); renderMessages([newMessage], false); lastMessageTimestamp = newMessage.created_at;
             loadConversations(true);
         } catch (error) {
             if (error.response?.status !== 401 && error.response?.status !== 403) { console.error(`Erreur envoi Cde ${currentOrderId}:`, error); showNotification("Erreur envoi.", 'danger'); const msgElement = chatMessages?.querySelector(`[data-message-id="${tempId}"]`); if (msgElement) { msgElement.style.opacity = '0.5'; msgElement.title = "Échec."; } }
             if (error.response?.status === 401 || error.response?.status === 403) { stopPolling(); AuthManager.logout(); }
         } finally { sendMessageBtn.disabled = false; }
     };

    // --- Fonctions Actions Admin ---
    const toggleUrgency = async () => { /* ... (inchangé, utilise route corrigée) ... */
         if (!currentOrderId) return; const headers = getAuthHeader(); if (!headers || !currentUser) return; const isCurrentlyUrgent = toggleUrgentBtn?.innerHTML.includes('flag-fill'); const newUrgencyState = !isCurrentlyUrgent;
         try {
             await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/toggle-urgency`, { is_urgent: newUrgencyState }, { headers });
             if(toggleUrgentBtn){ toggleUrgentBtn.innerHTML = newUrgencyState ? '<i class="bi bi-flag-fill text-danger"></i>' : '<i class="bi bi-flag"></i>'; toggleUrgentBtn.title = newUrgencyState ? 'Démarquer Urgent' : 'Marquer Urgent'; }
             showNotification(`Urgence ${newUrgencyState ? 'activée' : 'désactivée'}.`);
             loadMessages(currentOrderId, null); loadConversations(true);
         } catch (error) { if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur urgence:", error); showNotification(error.response?.data?.message || "Erreur urgence.", "danger"); } if (error.response?.status === 401 || error.response?.status === 403) { stopPolling(); AuthManager.logout(); } }
     };
    const loadDeliverymenForSelect = async () => { /* ... (inchangé) ... */
         const headers = getAuthHeader(); if (!headers) return; if (deliverymenCache.length > 0) { reassignDeliverymanSelect.innerHTML = '<option value="">Choisir...</option>'; deliverymenCache.forEach(d => { const option = document.createElement('option'); option.value = d.id; option.textContent = d.name; reassignDeliverymanSelect.appendChild(option); }); return; }
         try { reassignDeliverymanSelect.innerHTML = '<option value="">Chargement...</option>'; await fetchBaseData(); reassignDeliverymanSelect.innerHTML = '<option value="">Choisir...</option>'; deliverymenCache.forEach(d => { const option = document.createElement('option'); option.value = d.id; option.textContent = d.name; reassignDeliverymanSelect.appendChild(option); });
         } catch (error) { console.error("Erreur chargement livreurs select:", error); reassignDeliverymanSelect.innerHTML = '<option value="">Erreur</option>'; }
     };
    const confirmReassignment = async () => { /* ... (inchangé, utilise route corrigée) ... */
        const newDeliverymanId = reassignDeliverymanSelect.value; if (!newDeliverymanId || !currentOrderId) { showNotification("Sélectionnez un livreur.", "warning"); return; } const headers = getAuthHeader(); if (!headers || !currentUser) return; confirmReassignBtn.disabled = true;
        try { await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/reassign-from-chat`, { newDeliverymanId }, { headers }); showNotification("Réassignée !"); reassignModal.hide(); loadMessages(currentOrderId, null); loadConversations(true); }
        catch (error) { if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur réassignation:", error); showNotification(error.response?.data?.message || "Erreur réassignation.", "danger"); } if (error.response?.status === 401 || error.response?.status === 403) { stopPolling(); AuthManager.logout(); } }
        finally { confirmReassignBtn.disabled = false; }
    };
    const resetOrderStatus = async () => { /* ... (inchangé, utilise route corrigée) ... */
        if (!currentOrderId) return; if (!confirm(`Réinitialiser statut Cde #${currentOrderId} ?`)) return; const headers = getAuthHeader(); if (!headers || !currentUser) return;
        try { await axios.put(`${API_BASE_URL}/suivis/orders/${currentOrderId}/reset-status-from-chat`, {}, { headers }); showNotification("Statut réinitialisé !"); loadMessages(currentOrderId, null); loadConversations(true); }
        catch (error) { if (error.response?.status !== 401 && error.response?.status !== 403) { console.error("Erreur reset:", error); showNotification(error.response?.data?.message || "Erreur reset.", "danger"); } if (error.response?.status === 401 || error.response?.status === 403) { stopPolling(); AuthManager.logout(); } }
     };

    // --- Fonctions Modale Modifier Commande ---
    const addItemRowModal = (container, item = {}) => { /* ... (inchangé) ... */
        const itemRow = document.createElement('div'); itemRow.className = 'row g-2 item-row mb-2'; const uniqueId = Date.now() + Math.random(); const nameId = `itemName-${uniqueId}`; const quantityId = `itemQuantity-${uniqueId}`; const amountId = `itemAmount-${uniqueId}`; const isFirst = container.children.length === 0;
        itemRow.innerHTML = `<div class="col-md-5"><label for="${nameId}" class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Nom article</label><input type="text" class="form-control form-control-sm item-name-input" id="${nameId}" value="${item.item_name || ''}" placeholder="Article" required></div><div class="col-md-3"><label for="${quantityId}" class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Qté</label><input type="number" class="form-control form-control-sm item-quantity-input" id="${quantityId}" value="${item.quantity || 1}" min="1" required></div><div class="col-md-4"><label for="${amountId}" class="form-label mb-1 ${!isFirst ? 'visually-hidden' : ''}">Montant</label><div class="input-group input-group-sm"><input type="number" class="form-control item-amount-input" id="${amountId}" value="${item.amount || 0}" min="0" required><button class="btn btn-outline-danger remove-item-btn" type="button"><i class="bi bi-trash"></i></button></div></div>`; container.appendChild(itemRow); if (!isFirst) itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
     };
    const handleRemoveItemModal = (container) => { /* ... (inchangé) ... */
        container?.addEventListener('click', (e) => { if (e.target.closest('.remove-item-btn') && container.children.length > 1) { e.target.closest('.item-row').remove(); if (container.children.length === 1) container.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden')); } });
     };
    const setupShopSearchModal = (inputElement, resultsContainerElement, hiddenInputElement) => { /* ... (inchangé) ... */
         inputElement?.addEventListener('input', () => { const searchTerm = inputElement.value.toLowerCase(); resultsContainerElement.innerHTML = ''; resultsContainerElement.classList.add('d-none'); if (searchTerm.length > 1 && shopsCache.length > 0) { const filteredShops = shopsCache.filter(shop => shop.name.toLowerCase().includes(searchTerm)); if (filteredShops.length > 0) { filteredShops.forEach(shop => { const div = document.createElement('div'); div.className = 'p-2 dropdown-item'; div.textContent = shop.name; div.dataset.id = shop.id; div.style.cursor = 'pointer'; div.addEventListener('click', () => { inputElement.value = shop.name; hiddenInputElement.value = shop.id; resultsContainerElement.classList.add('d-none'); }); resultsContainerElement.appendChild(div); }); resultsContainerElement.classList.remove('d-none'); } else { resultsContainerElement.innerHTML = '<div class="p-2 text-muted">Aucun résultat</div>'; resultsContainerElement.classList.remove('d-none'); } } }); document.body.addEventListener('click', (e) => { if (resultsContainerElement && !resultsContainerElement.contains(e.target) && e.target !== inputElement) resultsContainerElement.classList.add('d-none'); });
     };
    const openEditOrderModal = async () => { /* ... (inchangé) ... */
        if (!currentOrderId || !editOrderModal) return; const headers = getAuthHeader(); if (!headers) return; editOrderForm.reset(); editItemsContainer.innerHTML = '';
        try { const orderResponse = await axios.get(`${API_BASE_URL}/orders/${currentOrderId}`, { headers }); const order = orderResponse.data; if (shopsCache.length === 0 || deliverymenCache.length === 0) await fetchBaseData(); editOrderIdInputModal.value = order.id; editOrderModalOrderIdSpan.textContent = order.id; editDeliverymanIdInput.value = order.deliveryman_id || ''; const currentShop = shopsCache.find(s => s.id === order.shop_id); editShopSearchInput.value = currentShop?.name || `ID: ${order.shop_id}`; editSelectedShopIdInput.value = order.shop_id; editCustomerNameInput.value = order.customer_name || ''; editCustomerPhoneInput.value = order.customer_phone || ''; editDeliveryLocationInput.value = order.delivery_location || ''; editDeliveryFeeInput.value = order.delivery_fee || 0; const expeditionFee = parseFloat(order.expedition_fee || 0); editIsExpeditionCheckbox.checked = expeditionFee > 0; editExpeditionFeeContainer.style.display = expeditionFee > 0 ? 'block' : 'none'; editExpeditionFeeInput.value = expeditionFee; const formattedDate = order.created_at ? moment(order.created_at).format('YYYY-MM-DDTHH:mm') : ''; editCreatedAtInput.value = formattedDate; if (order.items && order.items.length > 0) { order.items.forEach(item => addItemRowModal(editItemsContainer, item)); } else { addItemRowModal(editItemsContainer); } editOrderModal.show(); } catch (error) { console.error(`Erreur chargement Cde ${currentOrderId} édition:`, error); showNotification("Erreur chargement détails.", "danger"); if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout(); }
     };
    const handleEditOrderSubmit = async (e) => { /* ... (inchangé) ... */
        e.preventDefault(); const orderId = editOrderIdInputModal.value; if (!orderId) return; const headers = getAuthHeader(); if (!headers || !currentUser) return; const items = Array.from(editItemsContainer.querySelectorAll('.item-row')).map(row => ({ item_name: row.querySelector('.item-name-input').value, quantity: parseInt(row.querySelector('.item-quantity-input').value), amount: parseFloat(row.querySelector('.item-amount-input').value) })); const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0); const updatedData = { shop_id: editSelectedShopIdInput.value, customer_name: editCustomerNameInput.value || null, customer_phone: editCustomerPhoneInput.value, delivery_location: editDeliveryLocationInput.value, article_amount: totalArticleAmount, delivery_fee: editDeliveryFeeInput.value, expedition_fee: editIsExpeditionCheckbox.checked ? parseFloat(editExpeditionFeeInput.value) : 0, items: items, deliveryman_id: editDeliverymanIdInput.value || null, created_at: editCreatedAtInput.value ? moment(editCreatedAtInput.value).format('YYYY-MM-DD HH:mm:ss') : null, updated_by: currentUser.id };
        try { await axios.put(`${API_BASE_URL}/orders/${orderId}`, updatedData, { headers }); showNotification('Commande modifiée !'); editOrderModal.hide(); loadMessages(currentOrderId, null); loadConversations(true); }
        catch (error) { if (error.response?.status !== 401 && error.response?.status !== 403) { console.error(`Erreur modification Cde ${orderId}:`, error); showNotification(error.response?.data?.message || 'Erreur modification.', 'danger'); } if (error.response?.status === 401 || error.response?.status === 403) { stopPolling(); AuthManager.logout(); } }
     };

    // --- Gestionnaire Copie ---
    const handleCopyClick = (e) => { /* ... (inchangé) ... */
         const button = e.target.closest('.copy-btn'); if (!button) return; let textToCopy = ''; const targetSelector = button.dataset.copyTarget; const valueToCopy = button.dataset.copyValue;
         if (targetSelector) { const targetElement = document.querySelector(targetSelector); textToCopy = targetElement?.textContent || ''; } else if (valueToCopy) { textToCopy = valueToCopy; }
         if (textToCopy) { navigator.clipboard.writeText(textToCopy.trim()).then(() => showNotification('Copié: ' + textToCopy.trim(), 'info')).catch(err => { console.error('Erreur copie:', err); showNotification('Erreur copie', 'danger'); }); }
     };

    // --- Initialisation ---
    const initializeApp = async () => {
        currentUser = AuthManager.getUser();
        if (!currentUser || currentUser.role !== 'admin') { console.warn("Accès non admin ou utilisateur non chargé."); AuthManager.logout(); return; }
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;

        await fetchBaseData(); // Charger livreurs/marchands

        // Listeners
        sidebarToggler?.addEventListener('click', () => { if (window.innerWidth < 992) sidebar?.classList.toggle('show'); else { sidebar?.classList.toggle('collapsed'); mainContent?.classList.toggle('expanded'); } });
        logoutBtn?.addEventListener('click', () => { stopPolling(); AuthManager.logout(); });
        filterUrgentSwitch?.addEventListener('change', () => loadConversations(true));
        filterArchivedSwitch?.addEventListener('change', () => loadConversations(true));
        conversationSearch?.addEventListener('input', debounce(renderConversationList));
        backToListBtn?.addEventListener('click', () => showChatView(false));
        messageInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        messageInput?.addEventListener('input', () => { messageInput.rows = 1; const lines = messageInput.value.split('\n').length; messageInput.rows = Math.max(1, Math.min(lines, 4)); });
        sendMessageBtn?.addEventListener('click', sendMessage);
        chatMessages?.addEventListener('click', (e) => { const tagLink = e.target.closest('.tag-link'); if (tagLink) { e.preventDefault(); const tagOrderId = tagLink.dataset.tagOrderId; showNotification(`Navigation vers Cde #${tagOrderId} (TODO)`); } });
        toggleUrgentBtn?.addEventListener('click', toggleUrgency);
        reassignBtn?.addEventListener('click', async () => { if (currentOrderId && reassignModal) { await loadDeliverymenForSelect(); reassignModal.show(); } });
        confirmReassignBtn?.addEventListener('click', confirmReassignment);
        resetStatusBtn?.addEventListener('click', resetOrderStatus);
        editOrderBtn?.addEventListener('click', openEditOrderModal);
        editOrderForm?.addEventListener('submit', handleEditOrderSubmit);
        editAddItemBtn?.addEventListener('click', () => addItemRowModal(editItemsContainer));
        handleRemoveItemModal(editItemsContainer);
        setupShopSearchModal(editShopSearchInput, editSearchResultsContainer, editSelectedShopIdInput);
        editIsExpeditionCheckbox?.addEventListener('change', () => { editExpeditionFeeContainer.style.display = editIsExpeditionCheckbox.checked ? 'block' : 'none'; if (!editIsExpeditionCheckbox.checked) editExpeditionFeeInput.value = 0; });
        document.body.addEventListener('click', handleCopyClick);

        // --- Démarrage ---
        startPolling();
        showChatView(false); // Afficher la liste par défaut

        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (!pollingIntervalId) startPolling(); else { loadConversations(true); if (currentOrderId) loadMessages(currentOrderId); } } });
    };

    // Attendre AuthManager
    if (typeof AuthManager !== 'undefined' && typeof AuthManager.getUser === 'function' && AuthManager.getUser()) {
         initializeApp();
     } else if (typeof AuthManager !== 'undefined') {
         document.addEventListener('authManagerReady', initializeApp);
         setTimeout(() => { if (!currentUser && AuthManager.getUser()) initializeApp(); else if (!currentUser) console.error("AuthManager non prêt."); }, 1500);
     } else {
         console.error("AuthManager n'est pas défini.");
         showNotification("Erreur critique d'initialisation de l'authentification.", "danger");
     }
});