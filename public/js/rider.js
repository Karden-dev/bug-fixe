// public/js/rider.js
// Utilisation de Moment.js s'il est chargé globalement
const moment = (typeof window.moment === 'function') ? window.moment : (date) => new Date(date);

document.addEventListener('DOMContentLoaded', async () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = '/api';
    let currentUser; // Sera initialisé par checkAuthAndInit
    let currentOrderId; // Utilisé pour les modales d'action
    let chatOrderId = null; // ID spécifique pour la conversation ouverte dans la modale chat
    let lastPendingOrderCount = 0;
    let lastMessageTimestamp = null; // Pour le polling du chat ouvert
    const POLLING_INTERVAL = 10000; // Polling compteurs sidebar/liste commandes (10 secondes)
    const CHAT_POLLING_INTERVAL = 3000; // Polling du chat ouvert (3 secondes)
    let chatPollingIntervalId = null; // ID pour le polling du chat

    // --- Références DOM ---
    const ordersContainer = document.getElementById('ordersContainer');
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    const searchInput = document.getElementById('searchInput');
    const dateFilters = document.getElementById('dateFilters');
    const globalNotificationBadge = document.getElementById('globalNotificationBadge');
    
    // Modales (Références des éléments principaux)
    const statusActionModalEl = document.getElementById('statusActionModal');
    const statusActionModal = statusActionModalEl ? new bootstrap.Modal(statusActionModalEl) : null;
    const deliveredPaymentModalEl = document.getElementById('deliveredPaymentModal');
    const deliveredPaymentModal = deliveredPaymentModalEl ? new bootstrap.Modal(deliveredPaymentModalEl) : null;
    const failedDeliveryModalEl = document.getElementById('failedDeliveryModal');
    const failedDeliveryModal = failedDeliveryModalEl ? new bootstrap.Modal(failedDeliveryModalEl) : null;
    const returnModalEl = document.getElementById('returnModal');
    const returnModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;
    
    // Nouveaux éléments de chat
    const chatModalRiderEl = document.getElementById('chatModalRider');
    const chatModalRider = chatModalRiderEl ? new bootstrap.Modal(chatModalRiderEl) : null;
    const chatRiderOrderIdSpan = document.getElementById('chatRiderOrderId');
    const chatMessagesRider = document.getElementById('chatMessagesRider');
    const quickReplyButtonsRider = document.getElementById('quickReplyButtonsRider');
    const messageInputRider = document.getElementById('messageInputRider');
    const sendMessageBtnRider = document.getElementById('sendMessageBtnRider');
    const requestModificationBtn = document.getElementById('requestModificationBtn');

    // Spans / Boutons dans les modales existantes
    const actionModalOrderIdSpan = document.getElementById('actionModalOrderId');
    const statusSelectionDiv = document.getElementById('statusSelection'); 
    const deliveredModalOrderIdSpan = document.getElementById('deliveredModalOrderId');
    const failedModalOrderIdSpan = document.getElementById('failedModalOrderId');
    const returnModalOrderIdSpan = document.getElementById('returnModalOrderId');

    const notificationSound = new Audio('/sound.mp3'); 

    // Constantes
    const statusTranslations = { 'pending': 'En attente', 'in_progress': 'En cours', 'delivered': 'Livrée', 'cancelled': 'Annulée', 'failed_delivery': 'Livraison ratée', 'reported': 'À relancer', 'return_pending': 'Retour en attente', 'returned': 'Retourné' };
    const paymentTranslations = { 'pending': 'En attente', 'cash': 'En espèces', 'paid_to_supplier': 'Mobile Money', 'cancelled': 'Annulé' };
    const unprocessedStatuses = ['pending', 'in_progress', 'reported']; // Pour le tri

    // --- Fonctions Utilitaires ---

    // **CORRECTION :** Fonction Debounce ajoutée
    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    const showNotification = (message, type = 'success') => {
        const container = document.body;
        const alertId = `notif-${Date.now()}`;
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show fixed-top m-3`;
        alert.style.zIndex = "1060";
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => {
            const activeAlert = document.getElementById(alertId);
            if(activeAlert) { try { bootstrap.Alert.getOrCreateInstance(activeAlert)?.close(); } catch (e) { activeAlert.remove(); } }
        }, 5000);
    };

    const formatDate = (dateString) => dateString ? moment(dateString).format('DD MMM YYYY') : 'N/A';
    const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

    const getAuthHeader = () => { const token = AuthManager.getToken(); return token ? { 'Authorization': `Bearer ${token}` } : null; };

    const handleAuthError = (error) => {
        console.error("Erreur API:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            stopChatPolling();
            showNotification("Session expirée. Reconnexion...", "danger");
            AuthManager.logout();
        } else if (!navigator.onLine) {
            showNotification("Hors ligne. Actions mises en file d'attente si possible.", "warning");
        } else {
             const errMsg = error.response?.data?.message || error.message || "Erreur serveur.";
             if (error.response?.status !== 404) { showNotification(`Erreur: ${errMsg}`, "danger"); }
             else { console.warn("Ressource API non trouvée (404)"); }
        }
    };

    // --- Fonctions de Rendu ---
    
    // Trie les commandes pour l'onglet "Aujourd'hui"
    const sortRiderOrders = (orders) => {
         return orders.sort((a, b) => {
             const a_isUnprocessed = unprocessedStatuses.includes(a.status);
             const b_isUnprocessed = unprocessedStatuses.includes(b.status);
 
             if (a_isUnprocessed && !b_isUnprocessed) return -1; 
             if (!a_isUnprocessed && b_isUnprocessed) return 1;
             
             return moment(a.created_at).diff(moment(b.created_at)); // Plus ancienne en premier
         });
     };


    const renderOrders = (orders) => {
        const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;
        
        if (activeTab === 'today') {
            orders = sortRiderOrders(orders);
        } else {
            orders.sort((a,b) => moment(b.created_at).diff(moment(a.created_at)));
        }
        
        if (!ordersContainer) return;

        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            ordersContainer.innerHTML = `<p class="text-center text-muted mt-5">Aucune commande ici.</p>`;
            return;
        }

        ordersContainer.innerHTML = '';
        orders.forEach(order => {
            const orderCard = document.createElement('div');
            // Application de la classe Urgent (dépend du backend)
            orderCard.className = `order-card ${order.is_urgent ? 'urgent' : ''}`;
            
            const shopName = order.shop_name || 'N/A';
            const customerName = order.customer_name || 'Inconnu';
            const customerPhone = order.customer_phone || 'N/A';
            const deliveryLocation = order.delivery_location || 'Non spécifiée';
            const itemNames = order.items_list || 'Non spécifié';
            const clientInfo = customerName !== 'Inconnu' ? `${customerPhone} (${customerName})` : customerPhone;
            const amountToCollect = (parseFloat(order.article_amount) || 0);
            const totalAmount = amountToCollect + (parseFloat(order.delivery_fee) || 0) + (parseFloat(order.expedition_fee) || 0);
            const statusText = statusTranslations[order.status] || order.status;
            const paymentText = paymentTranslations[order.payment_status] || order.payment_status;
            const statusDotClass = `status-dot status-${order.status}`;
            const paymentDotClass = `payment-dot payment-${order.payment_status}`;
            const isFinalStatus = ['delivered', 'cancelled', 'returned'].includes(order.status);
            
            // Compteur non lu et indicateur Urgent (dépendent du backend)
            const unreadCount = order.unread_count || 0; 
            const unreadBadgeHtml = unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${unreadCount}</span>` : '';
            const urgentIconHtml = order.is_urgent ? '<i class="bi bi-exclamation-triangle-fill text-danger ms-1" title="URGENT"></i>' : '';

            orderCard.innerHTML = `
                <div class="order-card-header">
                    <h6 class="order-id mb-0">Commande #${order.id} ${urgentIconHtml}</h6>
                    <div class="order-actions">
                        
                        <button class="btn chat-btn" data-order-id="${order.id}" type="button" title="Discussion">
                            <i class="bi bi-chat-dots"></i> 
                            ${unreadBadgeHtml}
                        </button>

                        <div class="dropdown">
                            <button class="btn" type="button" data-bs-toggle="dropdown" title="Actions"><i class="bi bi-gear"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item status-btn ${isFinalStatus ? 'disabled text-muted' : ''}" 
                                       data-order-id="${order.id}" href="#"><i class="bi bi-check2-circle me-2"></i> Statuer la commande</a>
                                </li>
                                <li>
                                    <a class="dropdown-item return-btn ${isFinalStatus ? 'disabled text-muted' : ''}" 
                                       data-order-id="${order.id}" href="#"><i class="bi bi-box-arrow-left me-2"></i> Déclarer un retour</a>
                                </li>
                            </ul>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-corail" type="button" data-bs-toggle="dropdown" title="Contacter"><i class="bi bi-telephone"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="tel:${customerPhone.replace(/\s/g, '')}"><i class="bi bi-telephone-outbound me-2"></i> Appeler Client</a></li>
                                <li><a class="dropdown-item" href="sms:${customerPhone.replace(/\s/g, '')}"><i class="bi bi-chat-text me-2"></i> Envoyer SMS Client</a></li>
                                <li><a class="dropdown-item" href="https://wa.me/${customerPhone.replace(/\D/g, '')}" target="_blank"><i class="bi bi-whatsapp me-2"></i> WhatsApp Client</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <hr class="my-2">
                <div class="order-details">
                    <p><span class="detail-label">Marchand:</span> <span class="detail-value">${shopName}</span></p>
                    <p><span class="detail-label">Client:</span> <span class="detail-value">${clientInfo}</span></p>
                    <p><span class="detail-label">Adresse:</span> <span class="detail-value">${deliveryLocation}</span></p>
                    <p><span class="detail-label">Article(s):</span> <span class="detail-value">${itemNames}</span></p>
                    <p class="status-line">
                        <span class="detail-label">Statut:</span>
                        <span class="status-badge"><span class="${statusDotClass}"></span>${statusText}</span>
                        <span class="payment-badge"><span class="${paymentDotClass}"></span>${paymentText}</span>
                    </p>
                    <p><span class="detail-label">À récupérer:</span> <span class="detail-value fw-bold text-success">${formatAmount(totalAmount)}</span></p>
                    <p class="text-muted text-end" style="font-size: 0.75rem;">Créée le ${formatDate(order.created_at)}</p>
                </div>
            `;
            ordersContainer.appendChild(orderCard);
        });
    };

    // --- Logique de Polling du Chat ---

    const stopChatPolling = () => {
         if (chatPollingIntervalId) {
             clearInterval(chatPollingIntervalId);
             chatPollingIntervalId = null;
         }
    };

    const startChatPolling = (orderId) => {
         stopChatPolling();
         console.log(`Polling chat pour Cde ${orderId} démarré...`);
         loadRiderMessages(orderId, null); // Charger messages complets d'abord
         
         chatPollingIntervalId = setInterval(() => {
             if (document.visibilityState === 'visible' && chatModalRiderEl?.classList.contains('show')) {
                 loadRiderMessages(orderId, lastMessageTimestamp);
             }
         }, CHAT_POLLING_INTERVAL);
    };
    
    // Rend les messages dans la modale chat
    const renderRiderMessages = (messages, replace = true) => {
        if (!chatMessagesRider) return;
        if (replace) chatMessagesRider.innerHTML = '';
        const isScrolledDown = chatMessagesRider.scrollHeight - chatMessagesRider.scrollTop - chatMessagesRider.clientHeight < 50;

        messages.forEach(msg => {
            if (!msg || typeof msg.id === 'undefined') {
                console.warn("Message ignoré car ID manquant ou message invalide.");
                return;
            }
            // **CORRECTION :** Vérifier si currentUser est défini avant d'accéder à .id
            const currentUserIdValid = currentUser && typeof currentUser.id !== 'undefined';
            
            if (!replace && chatMessagesRider.querySelector(`[data-message-id="${msg.id}"]`)) return;

            const messageDiv = document.createElement('div');
            messageDiv.dataset.messageId = msg.id;
            const isSentByMe = currentUserIdValid ? (msg.user_id === currentUser.id) : false;
            const isSystem = msg.message_type === 'system';
            let messageClass = 'message';
            if (isSystem) messageClass += ' message-system';
            else if (isSentByMe) messageClass += ' message-sent';
            else messageClass += ' message-received';
            messageDiv.className = messageClass;
            const time = moment(msg.created_at).format('HH:mm');
            const author = isSystem ? '' : `<strong>${isSentByMe ? 'Moi' : (msg.user_name || 'Admin')}:</strong><br>`;
            const messageContent = (msg.message_content || '').replace(/#(\d+)/g, '<span class="text-info">#$1</span>');
            messageDiv.innerHTML = `${author}${messageContent}<div class="message-meta">${time}</div>`;
            chatMessagesRider.appendChild(messageDiv);
        });

        if (isScrolledDown || replace) {
            setTimeout(() => { chatMessagesRider.scrollTop = chatMessagesRider.scrollHeight; }, 0);
        }
    };

    // Charge les messages pour une commande
    const loadRiderMessages = async (orderId, since = null) => {
         const headers = getAuthHeader();
         if (!headers) return;

         if (!since && chatMessagesRider) chatMessagesRider.innerHTML = `<p class="text-center text-muted p-5"><div class="spinner-border spinner-border-sm"></div> Chargement...</p>`;
         
         const params = {};
         if (since) params.since = since;
         const queryString = new URLSearchParams(params).toString();
 
         try {
             const response = await axios.get(`${API_BASE_URL}/orders/${orderId}/messages?${queryString}`, { headers });
             const messages = response.data || [];
 
             if (messages.length > 0) {
                  renderRiderMessages(messages, !since);
                  lastMessageTimestamp = messages[messages.length - 1].created_at;
             } else if (!since && chatMessagesRider) {
                  chatMessagesRider.innerHTML = `<p class="text-center text-muted p-5">Aucun message.</p>`;
             }
             
             if(!since) {
                updateSidebarCounters();
                fetchOrders(document.querySelector('.nav-link.active')?.dataset.tab || 'today');
             }

         } catch (error) {
             console.error(`Erreur messages Cde ${orderId}:`, error);
             if (error.response?.status === 403) { showNotification("Accès refusé à cette conversation.", "warning"); if(chatModalRider) chatModalRider.hide(); }
             else { if (!since && chatMessagesRider) chatMessagesRider.innerHTML = `<p class="text-center text-danger p-5">Erreur chargement.</p>`; handleAuthError(error); }
         }
     };

    // Charge les messages rapides pour le livreur
    const loadRiderQuickReplies = async () => {
        const headers = getAuthHeader(); if (!headers || !quickReplyButtonsRider) return;
        quickReplyButtonsRider.innerHTML = '';
        try {
            const response = await axios.get(`${API_BASE_URL}/suivis/quick-replies`, { headers });
            const quickReplies = response.data || [];
            
            quickReplies.forEach(replyText => {
                 const button = document.createElement('button');
                 button.className = 'btn btn-sm btn-outline-secondary';
                 button.textContent = replyText;
                 button.type = 'button';
                 button.addEventListener('click', () => {
                      messageInputRider.value += (messageInputRider.value ? ' ' : '') + replyText;
                      messageInputRider.focus();
                      messageInputRider.dispatchEvent(new Event('input', { bubbles: true }));
                 });
                 quickReplyButtonsRider.appendChild(button);
             });
        } catch (error) {
            console.error("Erreur chargement messages rapides:", error);
        }
    };

    // Envoie un message depuis la modale chat
    const sendRiderMessage = async () => {
         const content = messageInputRider.value.trim();
        if (!content || !chatOrderId) return;
        const headers = getAuthHeader(); if (!headers) return;

        // **CORRECTION :** Vérifier currentUser avant d'accéder à .id
        if (!currentUser || typeof currentUser.id === 'undefined') {
            showNotification("Erreur d'utilisateur, veuillez vous reconnecter.", "danger");
            handleAuthError(new Error("currentUser is not defined in sendRiderMessage"));
            return;
        }

        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = { id: tempId, user_id: currentUser.id, user_name: currentUser.name, message_content: content, created_at: new Date().toISOString(), message_type: 'user' };
        
        renderRiderMessages([optimisticMessage], false); 
        messageInputRider.value = '';
        messageInputRider.rows = 1;
        sendMessageBtnRider.disabled = true;

        try {
            await axios.post(`${API_BASE_URL}/orders/${chatOrderId}/messages`, { message_content: content }, { headers });
            
            loadRiderMessages(chatOrderId, null); // Recharger les messages pour confirmation

            fetchOrders(document.querySelector('.nav-link.active')?.dataset.tab || 'today'); // MAJ liste
            
        } catch (error) {
            console.error(`Erreur envoi Cde ${chatOrderId}:`, error);
            showNotification("Erreur d'envoi.", 'danger');
            const msgElement = chatMessagesRider?.querySelector(`[data-message-id="${tempId}"]`);
            if (msgElement) { msgElement.style.opacity = '0.5'; msgElement.title = "Échec."; }
            handleAuthError(error);
        } finally {
            if(sendMessageBtnRider) sendMessageBtnRider.disabled = false;
        }
    };
    
    // **MODIFIÉ :** Pré-remplit le message pour la demande de modification
    const requestOrderModification = () => {
         const prefix = "Demande de modification : ";
         const detailedMessage = prefix + "Veuillez préciser ici l'erreur (client, adresse, articles, montant...).";
         messageInputRider.value = detailedMessage;
         messageInputRider.focus();
         
         if (messageInputRider.setSelectionRange) {
             const startPos = messageInputRider.value.indexOf('Veuillez');
             messageInputRider.setSelectionRange(startPos, startPos);
         }
         showNotification("Précisez la modification et cliquez sur Envoyer.", 'info');
     };


    // --- Logique Principale et Initialisation ---

    // **MISE À JOUR :** Logique d'initialisation corrigée
    const checkAuthAndInit = () => {
        // Utiliser AuthManager pour charger l'utilisateur
        currentUser = AuthManager.getUser(); // Charge depuis le stockage
        
        if (!currentUser || !currentUser.token) {
            console.error("Utilisateur non authentifié ou token manquant. Redirection...");
            AuthManager.logout(); // Force la redirection vers index.html
            return; 
        }
        
        // **CORRECTION :** Le rôle est 'livreur'
        if (currentUser.role !== 'livreur') {
             console.warn("Rôle incorrect. Redirection...");
             AuthManager.logout(); // Pas un livreur, déconnexion
             return;
        }
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`;
        
        // **CORRECTION :** Affichage du nom du livreur
        if (document.getElementById('riderName')) document.getElementById('riderName').textContent = currentUser.name || 'Livreur';
        if (document.getElementById('riderRole')) document.getElementById('riderRole').textContent = 'Livreur';
        
        startOrderPolling(); 
        fetchOrders('today');
    };

    // Polling général pour compteurs et liste "Aujourd'hui"
    const startOrderPolling = () => {
         updateSidebarCounters();

         setInterval(async () => {
             if (AuthManager.getToken() && document.visibilityState === 'visible' && navigator.onLine) {
                 await updateSidebarCounters();
                 const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;
                 if (activeTab === 'today') {
                      await fetchOrders('today');
                 }
             }
         }, POLLING_INTERVAL);
     };

    // Met à jour les compteurs sidebar et badge global
    const updateSidebarCounters = async () => {
        const headers = getAuthHeader(); if(!headers) return;
        try {
            const [countsResponse, unreadResponse] = await Promise.all([
                 axios.get(`${API_BASE_URL}/rider/counts`, { headers }),
                 axios.get(`${API_BASE_URL}/suivis/unread-count`, { headers })
            ]);
            
            const counts = countsResponse.data || {};
            const unreadMsgCount = unreadResponse.data.unreadCount || 0;
            
            const currentPendingCount = counts.pending || 0;
            if (currentPendingCount > lastPendingOrderCount && lastPendingOrderCount !== 0) {
                notificationSound.play().catch(e => console.warn("Impossible jouer son:", e));
                showNotification(`🔔 ${currentPendingCount - lastPendingOrderCount} nouvelle(s) commande(s) assignée(s) !`, 'info');
            }
            lastPendingOrderCount = currentPendingCount;
            
            const totalToday = (counts.pending || 0) + (counts.in_progress || 0) + (counts.reported || 0);
            
            // Mise à jour badges sidebar
            if(document.getElementById('todayCount')) document.getElementById('todayCount').textContent = totalToday;
            if(document.getElementById('myRidesCount')) document.getElementById('myRidesCount').textContent = (counts.delivered || 0) + (counts.failed_delivery || 0) + (counts.cancelled || 0) + (counts.returned || 0) + totalToday;
            if(document.getElementById('relaunchCount')) document.getElementById('relaunchCount').textContent = counts.reported || 0;
            if(document.getElementById('returnsCount')) document.getElementById('returnsCount').textContent = (counts.return_pending || 0) + (counts.returned || 0);
            
            // Mise à jour badge global (notifications + messages non lus)
            const totalGlobalBadgeCount = (counts.notifications || 0) + unreadMsgCount;
            if (globalNotificationBadge) {
                 globalNotificationBadge.textContent = totalGlobalBadgeCount;
                 globalNotificationBadge.classList.toggle('d-none', totalGlobalBadgeCount === 0);
            }

        } catch (error) {
            console.error('Erreur compteurs:', error);
            handleAuthError(error);
        }
    };

    // Récupère et affiche les commandes
    const fetchOrders = async (tabName, searchQuery = '') => {
        const headers = getAuthHeader(); if(!headers) return;
        const params = {}; const today = moment().format('YYYY-MM-DD');
        switch (tabName) {
            case 'today': params.status = ['pending', 'in_progress', 'reported']; params.startDate = today; params.endDate = today; break;
            case 'my-rides': params.status = 'all'; const startDateFilter = document.getElementById('startDateFilter'); const endDateFilter = document.getElementById('endDateFilter'); if(startDateFilter?.value) params.startDate = startDateFilter.value; if(endDateFilter?.value) params.endDate = endDateFilter.value; break;
            case 'relaunch': params.status = 'reported'; const oneWeekAgo = moment().subtract(7, 'days').format('YYYY-MM-DD'); params.startDate = oneWeekAgo; params.endDate = today; break;
            case 'returns': params.status = ['cancelled', 'failed_delivery', 'return_pending', 'returned']; break;
            default: params.status = 'all';
        }
        if (searchQuery) { params.search = searchQuery; }
        
        params.include_unread_count = true; // Demande les compteurs

        if (!ordersContainer) return;

        try {
            ordersContainer.innerHTML = `<p class="text-center text-muted mt-5"><div class="spinner-border spinner-border-sm"></div> Chargement...</p>`;
            const response = await axios.get(`${API_BASE_URL}/rider/orders`, { params, headers });
            
            renderOrders(response.data || []);
            
        } catch (error) {
            console.error("Erreur récupération commandes:", error);
            if(ordersContainer) ordersContainer.innerHTML = `<p class="text-center text-danger mt-5">Erreur chargement. Vérifiez connexion.</p>`;
            handleAuthError(error);
        }
    };

    const fetchAndRenderContent = (tabName) => {
        const offcanvasElement = document.getElementById('sidebar');
        const offcanvas = offcanvasElement ? bootstrap.Offcanvas.getInstance(offcanvasElement) || new bootstrap.Offcanvas(offcanvasElement) : null;
        if(offcanvas) offcanvas.hide();

        const dateFilters = document.getElementById('dateFilters');
        //const startDateFilter = document.getElementById('startDateFilter'); // Déjà défini globalement
        //const endDateFilter = document.getElementById('endDateFilter'); // Déjà défini globalement

        if (tabName === 'my-rides') { dateFilters?.classList.add('d-flex'); dateFilters?.classList.remove('d-none'); }
        else { dateFilters?.classList.remove('d-flex'); dateFilters?.classList.add('d-none'); }
        
        fetchOrders(tabName, searchInput.value);
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`.nav-link[data-tab="${tabName}"]`)?.classList.add('active');
    };

    // Met à jour le statut d'une commande
    const updateOrderStatus = async (orderId, status, paymentStatus = null, amountReceived = 0) => {
        const headers = getAuthHeader(); if(!headers) return;
        const currentUser = AuthManager.getUser(); if(!currentUser) return;
        const payload = { status, userId: currentUser.id };
        if (paymentStatus) payload.payment_status = paymentStatus;
        if (status === 'failed_delivery') { payload.amount_received = parseFloat(amountReceived) || 0; }
        const url = `${API_BASE_URL}/orders/${orderId}/status`;

        try {
            if (!navigator.onLine) throw new Error("Offline");
            await axios.put(url, payload, { headers });
            showNotification(`Statut Cde #${orderId} mis à jour !`, 'success');
            fetchOrders(document.querySelector('.nav-link.active')?.dataset.tab || 'today');
            updateSidebarCounters();
        } catch (error) {
            if (!navigator.onLine) { showNotification('Mode hors ligne. MAJ en attente.', 'info'); await queueFailedRequest(url, 'PUT', payload); }
            else { showNotification(`Erreur MAJ Cde #${orderId}.`, 'danger'); handleAuthError(error); }
        }
    };

    // --- LISTENERS ---

    // Navigation Sidebar
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute('href');
            if (href && href !== '#') { window.location.href = href; }
            else { const tabName = e.currentTarget.dataset.tab; fetchAndRenderContent(tabName); }
        });
    });

    searchInput?.addEventListener('input', debounce(() => {
        const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;
        if (activeTab) fetchOrders(activeTab, searchInput.value);
    }, 500));
    
    // Listeners pour les filtres de date (si présents)
    //const startDateFilter = document.getElementById('startDateFilter'); // Déjà défini
    //const endDateFilter = document.getElementById('endDateFilter'); // Déjà défini
    //const filterDateBtn = document.getElementById('filterDateBtn'); // Déjà défini
    if (filterDateBtn) filterDateBtn.addEventListener('click', () => { fetchOrders('my-rides', searchInput.value); });
    if (startDateFilter) startDateFilter.addEventListener('change', () => { if (document.querySelector('.nav-link.active')?.dataset.tab === 'my-rides') fetchOrders('my-rides', searchInput.value); });
    if (endDateFilter) endDateFilter.addEventListener('change', () => { if (document.querySelector('.nav-link.active')?.dataset.tab === 'my-rides') fetchOrders('my-rides', searchInput.value); });

    // Déconnexion
    document.getElementById('logoutBtn')?.addEventListener('click', () => { 
        stopChatPolling();
        AuthManager.logout(); 
    });

    // Clics sur cartes commandes (DÉLÉGATION)
    ordersContainer?.addEventListener('click', async (e) => {
        const target = e.target.closest('.status-btn, .return-btn, .chat-btn');
        if (!target) return;
        
        e.preventDefault(); 
        if (target.classList.contains('disabled')) return;
        
        currentOrderId = target.dataset.orderId;
        
        if (target.classList.contains('chat-btn')) {
            if (chatModalRider && currentOrderId) {
                 chatOrderId = currentOrderId;
                 if(chatRiderOrderIdSpan) chatRiderOrderIdSpan.textContent = chatOrderId;
                 lastMessageTimestamp = null;
                 loadRiderMessages(chatOrderId, null);
                 loadRiderQuickReplies();
                 chatModalRider.show();
             }
        } else if (target.classList.contains('status-btn')) {
            if(actionModalOrderIdSpan) actionModalOrderIdSpan.textContent = currentOrderId;
            if(statusActionModal) statusActionModal.show();
        } else if (target.classList.contains('return-btn')) {
            if(document.getElementById('returnModalOrderId')) document.getElementById('returnModalOrderId').textContent = currentOrderId;
            if(returnModal) returnModal.show();
        }
    });
    
    // Listeners Modale Chat
    if (sendMessageBtnRider) sendMessageBtnRider.addEventListener('click', sendRiderMessage);
    if (messageInputRider) messageInputRider.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRiderMessage(); } });
    if (requestModificationBtn) requestModificationBtn.addEventListener('click', requestOrderModification); 
    if (chatModalRiderEl) chatModalRiderEl.addEventListener('hidden.bs.modal', stopChatPolling);
    if (chatModalRiderEl) chatModalRiderEl.addEventListener('shown.bs.modal', () => { if(chatOrderId) startChatPolling(chatOrderId); });
    if(messageInputRider) messageInputRider.addEventListener('input', () => { 
         if(!messageInputRider) return; 
         messageInputRider.rows = 1; 
         const lines = messageInputRider.value.split('\n').length; 
         const neededRows = Math.max(1, Math.min(lines, 4)); 
         messageInputRider.rows = neededRows; 
     });
    
    // **CORRECTION :** Vérification de l'existence de statusSelectionDiv
    if(statusSelectionDiv) {
        statusSelectionDiv.addEventListener('click', (e) => { 
            const button = e.target.closest('.status-action-btn'); if(!button) return; const status = button.dataset.status; if(statusActionModal) statusActionModal.hide(); 
            const deliveredModalOrderIdSpan = document.getElementById('deliveredModalOrderId');
            const failedModalOrderIdSpan = document.getElementById('failedModalOrderId');
            const amountInput = document.getElementById('amountReceived');

            if (status === 'delivered') { if(deliveredModalOrderIdSpan) deliveredModalOrderIdSpan.textContent = currentOrderId; if(deliveredPaymentModal) deliveredPaymentModal.show(); } 
            else if (status === 'failed_delivery') { if(failedModalOrderIdSpan) failedModalOrderIdSpan.textContent = currentOrderId; if(amountInput) amountInput.value = '0'; if(failedDeliveryModal) failedDeliveryModal.show(); } 
            else { updateOrderStatus(currentOrderId, status); } 
        });
    }

    if(document.getElementById('paymentCashBtn')) document.getElementById('paymentCashBtn').addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'cash'); if(deliveredPaymentModal) deliveredPaymentModal.hide(); });
    if(document.getElementById('paymentSupplierBtn')) document.getElementById('paymentSupplierBtn').addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'paid_to_supplier'); if(deliveredPaymentModal) deliveredPaymentModal.hide(); });
    if(document.getElementById('failedDeliveryForm')) document.getElementById('failedDeliveryForm').addEventListener('submit', (e) => { e.preventDefault(); const amount = document.getElementById('amountReceived').value; updateOrderStatus(currentOrderId, 'failed_delivery', null, amount); if(failedDeliveryModal) failedDeliveryModal.hide(); });
    
    // **CORRECTION SYNTAXE :** Bloc try/catch/finally corrigé
    if(document.getElementById('confirmReturnBtn')) {
        document.getElementById('confirmReturnBtn').addEventListener('click', async () => { 
            const payload = { status: 'return_pending', userId: currentUser.id }; 
            const url = `${API_BASE_URL}/orders/${currentOrderId}/status`; 
            
            try { 
                if (!navigator.onLine) throw new Error("Offline"); 
                await axios.put(url, payload, getAuthHeader()); 
                showNotification('Retour déclaré.'); 
                fetchOrders('returns'); 
            } catch (error) { 
                if (!navigator.onLine) { 
                    showNotification("Offline. Déclaration mise en attente.", 'info'); 
                    await queueFailedRequest(url, 'PUT', payload); 
                } else { 
                    showNotification(`Erreur: ${error.response?.data?.message || error.message}`, 'danger'); 
                    handleAuthError(error); 
                } 
            } finally { 
                // Fermer la modale
                const returnModalInstance = bootstrap.Modal.getInstance(document.getElementById('returnModal'));
                if(returnModalInstance) returnModalInstance.hide();
            }
        });
    }

    // --- INITIALISATION ---
    const initializeApp = () => {
        // **CORRECTION :** Appel à checkAuthAndInit déplacé ici
        checkAuthAndInit();
    };
    
    // Attendre l'initialisation du AuthManager
    if (typeof AuthManager !== 'undefined') {
         document.addEventListener('authManagerReady', initializeApp);
         // Fallback si l'event est déjà passé
         if (document.readyState === 'complete' || document.readyState === 'interactive') {
             if (!currentUser && AuthManager.getUser()) { // Vérifier si currentUser n'est pas déjà défini
                initializeApp(); 
             }
         }
     } else {
         console.error("AuthManager n'est pas défini. Vérifiez l'inclusion de auth.js.");
         // Fallback si auth.js est lent
         setTimeout(() => {
             if (typeof AuthManager !== 'undefined' && AuthManager.getUser()) {
                 initializeApp();
             } else if (!currentUser) {
                 showNotification("Erreur critique d'authentification.", "danger");
             }
         }, 1500);
     }
});