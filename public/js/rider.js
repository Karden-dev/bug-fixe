// js/rider.js

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '/api';
    let currentUser;
    let currentOrderId;
    let lastPendingOrderCount = 0;

    // --- Références DOM ---
    const ordersContainer = document.getElementById('ordersContainer');
    // La référence à 'cashContainer' qui causait l'erreur est supprimée.
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');
    const searchInput = document.getElementById('searchInput');
    const offcanvas = new bootstrap.Offcanvas(document.getElementById('sidebar'));
    const dateFilters = document.getElementById('dateFilters');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const filterDateBtn = document.getElementById('filterDateBtn');
    
    // Modals
    const statusActionModal = new bootstrap.Modal(document.getElementById('statusActionModal'));
    const deliveredPaymentModal = new bootstrap.Modal(document.getElementById('deliveredPaymentModal'));
    const failedDeliveryModal = new bootstrap.Modal(document.getElementById('failedDeliveryModal'));
    const returnModal = new bootstrap.Modal(document.getElementById('returnModal'));
    const remittanceModal = new bootstrap.Modal(document.getElementById('remittanceModal'));
    const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));

    const notificationSound = new Audio('/sound.mp3');

    const statusTranslations = {
        'pending': 'En attente', 'in_progress': 'En cours', 'delivered': 'Livrée',
        'cancelled': 'Annulée', 'failed_delivery': 'Livraison ratée', 'reported': 'À relancer',
        'return_pending': 'Retour en attente', 'returned': 'Retourné'
    };
    const paymentTranslations = {
        'pending': 'En attente', 'cash': 'En espèces',
        'paid_to_supplier': 'Payé au marchand', 'cancelled': 'Annulé'
    };

    // --- Fonctions utilitaires ---
    const showNotification = (message, type = 'success') => {
        const container = document.body;
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show fixed-top m-3`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

    const handleAuthError = (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            showNotification("Votre session a expiré. Veuillez vous reconnecter.", "danger");
            localStorage.removeItem('user'); sessionStorage.removeItem('user');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } else {
            console.error(error);
            showNotification("Une erreur inattendue est survenue.", "danger");
        }
    };

    // --- Fonctions de rendu ---
    const renderOrders = (orders) => {
        if (!orders || !Array.isArray(orders) || orders.length === 0) {
            ordersContainer.innerHTML = `<p class="text-center text-muted mt-5">Aucune commande à afficher.</p>`;
            return;
        }
        ordersContainer.innerHTML = '';
        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            const shopName = order.shop_name || 'N/A';
            const customerName = order.customer_name || 'Inconnu';
            const customerPhone = order.customer_phone || 'N/A';
            const deliveryLocation = order.delivery_location || 'Non spécifiée';
            const itemNames = order.items_list || 'Non spécifié';
            const clientInfo = customerName ? `${customerPhone} (${customerName})` : customerPhone;
            const amountToCollect = (parseFloat(order.article_amount) || 0);
            const statusText = statusTranslations[order.status] || order.status;
            const paymentText = paymentTranslations[order.payment_status] || order.payment_status;
            const statusDotClass = `status-dot status-${order.status}`;
            const paymentDotClass = `payment-dot payment-${order.payment_status}`;
            orderCard.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="order-id">Commande #${order.id}</h6>
                    <div class="order-actions">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown"><i class="bi bi-gear"></i></button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item status-btn" data-order-id="${order.id}" href="#">Statuer la commande</a></li>
                                <li><a class="dropdown-item return-btn" data-order-id="${order.id}" href="#">Déclarer un retour</a></li>
                            </ul>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-corail dropdown-toggle" type="button" data-bs-toggle="dropdown"><i class="bi bi-telephone"></i></button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="tel:${customerPhone}"><i class="bi bi-telephone"></i> Appeler</a></li>
                                <li><a class="dropdown-item" href="sms:${customerPhone}"><i class="bi bi-chat-text"></i> Envoyer un SMS</a></li>
                                <li><a class="dropdown-item" href="https://wa.me/${customerPhone}"><i class="bi bi-whatsapp"></i> WhatsApp</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="order-details">
                    <p><span class="detail-label">Marchand:</span> <span class="detail-value">${shopName}</span></p>
                    <p><span class="detail-label">Client:</span> <span class="detail-value">${clientInfo}</span></p>
                    <p><span class="detail-label">Adresse:</span> <span class="detail-value">${deliveryLocation}</span></p>
                    <p><span class="detail-label">Article:</span> <span class="detail-value">${itemNames}</span></p>
                    <p class="status-line">
                        <span class="detail-label">Statut:</span>
                        <span class="status-badge"><span class="${statusDotClass}"></span>${statusText}</span>
                        <span class="payment-badge"><span class="${paymentDotClass}"></span>${paymentText}</span>
                    </p>
                    <p><span class="detail-label">Montant à récupérer:</span> <span class="detail-value text-success">${formatAmount(amountToCollect)}</span></p>
                    <p class="text-muted text-end" style="font-size: 0.75rem;">Saisie le ${formatDate(order.created_at)}</p>
                </div>
            `;
            ordersContainer.appendChild(orderCard);
        });
    };

    const startOrderPolling = () => {
        setInterval(async () => {
            if (currentUser && document.visibilityState === 'visible') {
                await updateSidebarCounters();
            }
        }, 5000);
    };

    // --- Logique de l'application ---
    const checkAuthAndInit = () => {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!storedUser) { window.location.href = 'index.html'; return; }
        currentUser = JSON.parse(storedUser);
        if (currentUser.token) { axios.defaults.headers.common['Authorization'] = `Bearer ${currentUser.token}`; }
        document.getElementById('riderName').textContent = currentUser.name;
        document.getElementById('riderRole').textContent = 'Livreur';
        updateSidebarCounters();
        fetchAndRenderContent('today');
        startOrderPolling();
    };

    const updateSidebarCounters = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/rider/counts`);
            const counts = response.data;
            const currentPendingCount = counts.pending || 0;
            if (lastPendingOrderCount > 0 && currentPendingCount > lastPendingOrderCount) {
                notificationSound.play().catch(e => console.error("Erreur lecture son:", e));
                showNotification('🔔 Nouvelle commande assignée !', 'warning');
            }
            lastPendingOrderCount = currentPendingCount;
            const totalToday = (counts.pending || 0) + (counts.in_progress || 0) + (counts.reported || 0);
            document.getElementById('todayCount').textContent = totalToday;
            document.getElementById('myRidesCount').textContent = (counts.delivered || 0) + (counts.failed_delivery || 0) + totalToday;
            document.getElementById('relaunchCount').textContent = counts.reported || 0;
            document.getElementById('returnsCount').textContent = (counts.return_pending || 0) + (counts.returned || 0);
        } catch (error) {
            console.error('Erreur lors du chargement des compteurs:', error);
            handleAuthError(error);
        }
    };

    const fetchOrders = async (tabName, searchQuery = '') => {
        const params = {};
        const today = new Date().toISOString().slice(0, 10);
        switch (tabName) {
            case 'today': params.status = ['pending', 'in_progress', 'reported']; params.startDate = today; params.endDate = today; break;
            case 'my-rides': params.status = 'all'; if(dateFilters.classList.contains('d-flex')){ if(startDateFilter.value) params.startDate = startDateFilter.value; if(endDateFilter.value) params.endDate = endDateFilter.value; } break;
            case 'relaunch': params.status = 'reported'; const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7); params.startDate = oneWeekAgo.toISOString().slice(0, 10); params.endDate = today; break;
            case 'returns': params.status = ['cancelled', 'reported', 'failed_delivery']; break;
        }
        if (searchQuery) { params.search = searchQuery; }
        try {
            ordersContainer.innerHTML = `<p class="text-center text-muted mt-5">Chargement des commandes...</p>`;
            const response = await axios.get(`${API_BASE_URL}/rider/orders`, { params });
            renderOrders(response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des commandes:", error);
            showNotification(`Erreur: ${error.response?.data?.message || error.message}`, 'danger');
            ordersContainer.innerHTML = `<p class="text-center text-danger mt-5">Erreur de chargement.</p>`;
            handleAuthError(error);
        }
    };

    // **CORRECTION** : La fonction est simplifiée, elle ne gère plus la caisse.
    const fetchAndRenderContent = (tabName) => {
        offcanvas.hide();
        // La condition "if (tabName === 'cash')" est supprimée
        if (tabName === 'my-rides') {
            dateFilters.classList.add('d-flex');
            dateFilters.classList.remove('d-none');
        } else {
            dateFilters.classList.remove('d-flex');
            dateFilters.classList.add('d-none');
        }
        fetchOrders(tabName, searchInput.value);
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`.nav-link[data-tab="${tabName}"]`).classList.add('active');
    };

    // --- Gestion des événements ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Si le lien est celui de la caisse, on navigue, sinon on change de tab.
            if (e.currentTarget.getAttribute('href') === 'ridercash.html') {
                window.location.href = 'ridercash.html';
            } else {
                const tabName = e.currentTarget.dataset.tab;
                fetchAndRenderContent(tabName);
            }
        });
    });

    searchInput.addEventListener('input', () => {
        const activeTab = document.querySelector('.nav-link.active').dataset.tab;
        fetchOrders(activeTab, searchInput.value);
    });

    filterDateBtn.addEventListener('click', () => { fetchOrders('my-rides', searchInput.value); });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('user'); sessionStorage.removeItem('user'); window.location.href = 'index.html'; });

    ordersContainer.addEventListener('click', async (e) => {
        const target = e.target.closest('.status-btn, .return-btn');
        if (!target) return;
        currentOrderId = target.dataset.orderId;
        if (target.classList.contains('status-btn')) {
            document.getElementById('actionModalOrderId').textContent = currentOrderId;
            statusActionModal.show();
        } else if (target.classList.contains('return-btn')) {
            document.getElementById('returnModalOrderId').textContent = currentOrderId;
            returnModal.show();
        }
    });

    document.querySelectorAll('.status-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.currentTarget.dataset.status;
            statusActionModal.hide();
            if (status === 'delivered') {
                document.getElementById('deliveredModalOrderId').textContent = currentOrderId;
                deliveredPaymentModal.show();
            } else if (status === 'failed_delivery') {
                document.getElementById('failedModalOrderId').textContent = currentOrderId;
                failedDeliveryModal.show();
            } else {
                updateOrderStatus(currentOrderId, status);
            }
        });
    });

    document.getElementById('paymentCashBtn').addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'cash'); deliveredPaymentModal.hide(); });
    document.getElementById('paymentSupplierBtn').addEventListener('click', () => { updateOrderStatus(currentOrderId, 'delivered', 'paid_to_supplier'); deliveredPaymentModal.hide(); });
    document.getElementById('failedDeliveryForm').addEventListener('submit', (e) => { e.preventDefault(); const amount = document.getElementById('amountReceived').value; updateOrderStatus(currentOrderId, 'failed_delivery', 'cash', amount); failedDeliveryModal.hide(); });
    document.getElementById('confirmReturnBtn').addEventListener('click', async () => { try { await axios.put(`${API_BASE_URL}/orders/${currentOrderId}/status`, { status: 'return_pending', userId: currentUser.id }); showNotification('Déclaration de retour enregistrée.'); returnModal.hide(); fetchOrders('returns'); } catch (error) { showNotification(`Erreur: ${error.response?.data?.message || error.message}`, 'danger'); } });
    document.getElementById('remittanceForm').addEventListener('submit', async (e) => { e.preventDefault(); const amount = document.getElementById('remittanceAmount').value; const comment = document.getElementById('remittanceComment').value; try { await axios.post(`${API_BASE_URL}/rider/remittance`, { riderId: currentUser.id, amount, comment }); showNotification('Versement soumis avec succès.'); remittanceModal.hide(); fetchCashData(); } catch (error) { showNotification('Erreur lors de la soumission.', 'danger'); } });

    const updateOrderStatus = async (orderId, status, paymentStatus = null, amountReceived = 0) => {
        try {
            const payload = { status, payment_status: paymentStatus, amount_received: amountReceived, userId: currentUser.id };
            await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, payload);
            showNotification('Statut de la commande mis à jour !');
            fetchOrders(document.querySelector('.nav-link.active').dataset.tab);
            updateSidebarCounters();
        } catch (error) {
            showNotification(`Erreur: ${error.response?.data?.message || 'Impossible de mettre à jour le statut.'}`, 'danger');
        }
    };

    checkAuthAndInit();
});