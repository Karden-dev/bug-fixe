// js/orders.js
// Version 2.1 - Intégration complète et robuste de la gestion hors ligne

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = '/api';
    // --- Références DOM ---
    const ordersTableBody = document.getElementById('ordersTableBody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const bulkActionsDropdown = document.getElementById('bulkActionsDropdown');
    const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
    const addShopModal = new bootstrap.Modal(document.getElementById('addShopModal'));
    const editOrderModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
    const statusActionModal = new bootstrap.Modal(document.getElementById('statusActionModal'));
    const assignDeliveryModal = new bootstrap.Modal(document.getElementById('assignDeliveryModal'));
    const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    
    // Pagination DOM
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    
    const bulkStatusActionModal = new bootstrap.Modal(document.getElementById('bulkStatusActionModal'));
    const bulkFailedDeliveryModal = new bootstrap.Modal(document.getElementById('bulkFailedDeliveryModal'));

    const addOrderForm = document.getElementById('addOrderForm');
    const addShopForm = document.getElementById('addShopForm');
    const editOrderForm = document.getElementById('editOrderForm');
    const failedDeliveryForm = document.getElementById('failedDeliveryForm');
    const deliveredPaymentForm = document.getElementById('deliveredPaymentForm');
    const assignDeliveryForm = document.getElementById('assignDeliveryForm');
    const deliverymanSearchInput = document.getElementById('deliverymanSearchInput');
    const deliverymanSearchResultsContainer = document.getElementById('deliverymanSearchResults');
    const assignDeliverymanIdInput = document.getElementById('assignDeliverymanId');
    const filterBtn = document.getElementById('filterBtn');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    const statusFilterBtn = document.getElementById('statusFilterBtn');
    const statusFilterMenu = document.getElementById('statusFilterMenu');
    let selectedStatusFilter = '';

    const bulkDeliveredPaymentForm = document.getElementById('bulkDeliveredPaymentForm');
    const bulkFailedDeliveryForm = document.getElementById('bulkFailedDeliveryForm');

    const addShopSearchInput = document.getElementById('shopSearchInput');
    const addSearchResultsContainer = document.getElementById('searchResults');
    const addSelectedShopIdInput = document.getElementById('selectedShopId');
    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');

    const editShopSearchInput = document.getElementById('editShopSearchInput');
    const editSearchResultsContainer = document.getElementById('editSearchResults');
    const editSelectedShopIdInput = document.getElementById('editSelectedShopId');
    const editItemsContainer = document.getElementById('editItemsContainer');
    const editAddItemBtn = document.getElementById('editAddItemBtn');
    const editOrderIdInput = document.getElementById('editOrderId');
    const editDeliverymanIdInput = document.getElementById('editDeliverymanId');
    const editCreatedAtInput = document.getElementById('editCreatedAt');

    const isExpeditionCheckbox = document.getElementById('isExpedition');
    const expeditionFeeContainer = document.getElementById('expeditionFeeContainer');
    const expeditionFeeInput = document.getElementById('expeditionFee');
    const editIsExpeditionCheckbox = document.getElementById('editIsExpedition');
    const editExpeditionFeeContainer = document.getElementById('editExpeditionFeeContainer');
    const editExpeditionFeeInput = document.getElementById('editExpeditionFee');

    const selectedOrdersIdsSpan = document.getElementById('selectedOrdersIds');
    
    let allOrders = [];
    let filteredOrders = []; 
    let shopsCache = [];
    let deliverymenCache = [];
    let currentOrdersToAssign = [];

    // Pagination State
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value);
    
    const statusTranslations = {
        'pending': 'En attente', 'in_progress': 'En cours', 'delivered': 'Livrée',
        'cancelled': 'Annulée', 'failed_delivery': 'Livraison ratée', 'reported': 'À relancer'
    };
    const paymentTranslations = {
        'pending': 'En attente', 'cash': 'En espèces', 'paid_to_supplier': 'Payé au marchand', 'cancelled': 'Annulé'
    };
    const statusColors = {
        'pending': 'status-pending', 'in_progress': 'status-in_progress', 'delivered': 'status-delivered',
        'cancelled': 'status-cancelled', 'failed_delivery': 'status-failed_delivery', 'reported': 'status-reported'
    };
    const paymentColors = {
        'pending': 'payment-pending', 'cash': 'payment-cash', 'paid_to_supplier': 'payment-supplier_paid', 'cancelled': 'payment-cancelled'
    };
    
    const truncateText = (text, maxLength) => {
        if (!text) return 'N/A';
        const str = String(text);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    };
    
    // Fonction pour obtenir l'en-tête d'authentification
    const getAuthHeader = () => {
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) {
            console.error("AuthManager non défini ou .getToken() manquant.");
            return null;
        }
        const token = AuthManager.getToken();
        if (!token) {
            console.error("Token non trouvé pour l'en-tête.");
            return null;
        }
        return { 'Authorization': `Bearer ${token}` };
    };
    
    const fetchShops = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/shops?status=actif`);
            shopsCache = res.data;
        } catch (error) {
            console.error("Erreur détaillée lors du chargement des marchands:", error);
        }
    };
    
    const fetchDeliverymen = async () => {
        try {
            const headers = getAuthHeader(); // <-- FIX: Récupération de l'en-tête
            if (!headers) return; // <-- FIX: Arrêter si pas de token

            const res = await axios.get(`${API_BASE_URL}/deliverymen`, { headers }); // <-- FIX: Passage des headers
            deliverymenCache = res.data;
        } catch (error) {
            console.error("Erreur détaillée lors du chargement des livreurs:", error);
        }
    };

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const showLoading = (element) => {
        element.innerHTML = '<tr><td colspan="12" class="text-center p-4"><div class="spinner-border text-corail" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
    };

    const fetchAllData = async () => {
        showLoading(ordersTableBody);
        await applyFilters();
    };

    const applyFilters = async () => {
        const searchText = searchInput.value;
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;
        const status = selectedStatusFilter;
        try {
            const params = {};
            if (searchText) params.search = searchText;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (status) params.status = status;

            const ordersRes = await axios.get(`${API_BASE_URL}/orders`, { params });
            allOrders = ordersRes.data;
            filteredOrders = allOrders;
            currentPage = 1;
            renderPaginatedTable();
        } catch (error) {
            console.error("Erreur détaillée lors de l'application des filtres:", error);
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger p-4">Erreur lors du filtrage des données.</td></tr>`;
            updatePaginationInfo(0);
        }
    };
    
    const updatePaginationInfo = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        
        currentPageDisplay.textContent = currentPage;
        paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} commande(s))`;

        firstPageBtn.classList.toggle('disabled', currentPage === 1);
        prevPageBtn.classList.toggle('disabled', currentPage === 1);
        nextPageBtn.classList.toggle('disabled', currentPage === totalPages || totalPages === 0);
        lastPageBtn.classList.toggle('disabled', currentPage === totalPages || totalPages === 0);
    };

    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        renderPaginatedTable();
    };
    
    const renderPaginatedTable = () => {
        ordersTableBody.innerHTML = '';
        if (!filteredOrders || filteredOrders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center p-3">Aucune commande trouvée.</td></tr>`;
            updatePaginationInfo(0);
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const ordersToRender = filteredOrders.slice(startIndex, endIndex);

        ordersToRender.forEach(order => {
            const row = document.createElement('tr');
            const totalArticleAmount = parseFloat(order.article_amount || 0);
            const deliveryFee = parseFloat(order.delivery_fee || 0);
            const expeditionFee = parseFloat(order.expedition_fee || 0);
            const deliverymanName = order.deliveryman_name || 'Non assigné';
            const shopName = order.shop_name || 'N/A';
            
            let payoutAmount = 0;
            if (order.status === 'delivered') {
                if (order.payment_status === 'cash') {
                    payoutAmount = totalArticleAmount - deliveryFee - expeditionFee;
                } else if (order.payment_status === 'paid_to_supplier') {
                    payoutAmount = -deliveryFee - expeditionFee;
                }
            } else if (order.status === 'failed_delivery') {
                const amountReceived = parseFloat(order.amount_received || 0);
                payoutAmount = amountReceived - deliveryFee - expeditionFee;
            }
            
            const displayStatus = statusTranslations[order.status] || 'Non spécifié';
            const displayPaymentStatus = paymentTranslations[order.payment_status] || 'Non spécifié';
            const statusClass = statusColors[order.status] || 'bg-secondary text-white';
            const paymentClass = paymentColors[order.payment_status] || 'bg-secondary text-white';
            
            const itemTooltip = order.items && order.items.length > 0
                ? order.items.map(item => `Article: ${item.quantity} x ${item.item_name}<br>Montant: ${item.amount.toLocaleString('fr-FR')} FCFA`).join('<br>')
                : 'N/A';
            
            row.innerHTML = `
                <td><input type="checkbox" class="order-checkbox" data-order-id="${order.id}"></td>
                <td>${truncateText(shopName, 25)}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="Client: ${order.customer_name || 'N/A'}">${truncateText(order.customer_phone, 25)}</span></td>
                <td>${truncateText(order.delivery_location, 25)}</td>
                <td><span data-bs-toggle="tooltip" data-bs-html="true" title="${itemTooltip}">${truncateText(order.items && order.items.length > 0 ? order.items[0].item_name : 'N/A', 25)}</span></td>
                <td class="text-end">${totalArticleAmount.toLocaleString('fr-FR')} FCFA</td>
                <td class="text-end">${deliveryFee.toLocaleString('fr-FR')} FCFA</td>
                <td class="text-end">${payoutAmount.toLocaleString('fr-FR')} FCFA</td>
                <td><div class="payment-container"><i class="bi bi-circle-fill ${paymentClass}"></i>${displayPaymentStatus}</div></td>
                <td><div class="status-container"><i class="bi bi-circle-fill ${statusClass}"></i>${displayStatus}</div></td>
                <td>${truncateText(deliverymanName, 25)}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-gear"></i></button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item details-btn" href="#" data-order-id="${order.id}"><i class="bi bi-eye"></i> Afficher les détails</a></li>
                            <li><a class="dropdown-item edit-btn" href="#" data-order-id="${order.id}"><i class="bi bi-pencil"></i> Modifier</a></li>
                            <li><a class="dropdown-item assign-btn" href="#" data-order-id="${order.id}"><i class="bi bi-person"></i> Assigner</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item status-delivered-btn" href="#" data-order-id="${order.id}"><i class="bi bi-check-circle"></i> Livrée</a></li>
                            <li><a class="dropdown-item status-failed-btn" href="#" data-order-id="${order.id}"><i class="bi bi-x-circle"></i> Livraison ratée</a></li>
                            <li><a class="dropdown-item status-reported-btn" href="#" data-order-id="${order.id}"><i class="bi bi-clock"></i> À relancer</a></li>
                            <li><a class="dropdown-item status-cancelled-btn" href="#" data-order-id="${order.id}"><i class="bi bi-slash-circle"></i> Annulée</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item delete-btn text-danger" href="#" data-order-id="${order.id}"><i class="bi bi-trash"></i> Supprimer</a></li>
                        </ul>
                    </div>
                </td>
                `;
            ordersTableBody.appendChild(row);
        });

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        updatePaginationInfo(filteredOrders.length);
    };
    
    const resetAddOrderForm = () => {
        addOrderForm.reset();
        
        // Réinitialiser les champs de recherche marchand
        addSelectedShopIdInput.value = ''; 
        addShopSearchInput.value = '';
        
        // Réinitialiser les articles au minimum (une seule ligne par défaut)
        itemsContainer.innerHTML = '';
        addItemRow(itemsContainer);
        
        // Cacher et réinitialiser les frais d'expédition
        isExpeditionCheckbox.checked = false;
        expeditionFeeContainer.style.display = 'none';
        if (expeditionFeeInput) expeditionFeeInput.value = 0;
        
        // S'assurer que le label du premier article est visible
        if (itemsContainer.children.length > 0) {
            itemsContainer.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
        }
    };
    
    const addItemRow = (container, item = {}) => {
        const itemRow = document.createElement('div');
        itemRow.className = 'row g-2 item-row mb-2';
        const nameId = `itemName-${Date.now()}`;
        const quantityId = `itemQuantity-${Date.now()}`;
        const amountId = `itemAmount-${Date.now()}`;
        
        itemRow.innerHTML = `
            <div class="col-md-5">
                <label for="${nameId}" class="form-label mb-1">Nom article</label>
                <input type="text" class="form-control form-control-sm item-name-input" id="${nameId}" value="${item.item_name || ''}" placeholder="Ex: T-shirt" required>
            </div>
            <div class="col-md-3">
                <label for="${quantityId}" class="form-label mb-1">Qté</label>
                <input type="number" class="form-control form-control-sm item-quantity-input" id="${quantityId}" value="${item.quantity || 1}" min="1" required>
            </div>
            <div class="col-md-4">
                <label for="${amountId}" class="form-label mb-1">Montant</label>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control item-amount-input" id="${amountId}" value="${item.amount || 0}" min="0" required>
                    <button class="btn btn-outline-danger remove-item-btn" type="button"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(itemRow);
        
        if (container.children.length > 1) {
            // Cacher les labels des lignes suivantes
            itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
        } else {
             // S'assurer que le label de la première ligne (si c'est la seule) est visible
             itemRow.querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
        }
    };

    const handleRemoveItem = (container) => {
        container.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn') && container.children.length > 1) {
                const rowToRemove = e.target.closest('.item-row');
                rowToRemove.remove();
                
                // Rendre le label de la nouvelle première ligne visible si elle redevient la seule
                if (container.children.length === 1) {
                     container.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
                }
            }
        });
    };
    
    if (isExpeditionCheckbox) {
        isExpeditionCheckbox.addEventListener('change', () => {
            expeditionFeeContainer.style.display = isExpeditionCheckbox.checked ? 'block' : 'none';
            if (!isExpeditionCheckbox.checked) expeditionFeeInput.value = 0;
        });
    }

    if (editIsExpeditionCheckbox) {
        editIsExpeditionCheckbox.addEventListener('change', () => {
            editExpeditionFeeContainer.style.display = editIsExpeditionCheckbox.checked ? 'block' : 'none';
            if (!editIsExpeditionCheckbox.checked) editExpeditionFeeInput.value = 0;
        });
    }

    addShopForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shopData = {
            name: document.getElementById('newShopName').value,
            phone_number: document.getElementById('newShopPhone').value,
            bill_packaging: document.getElementById('newBillPackaging').checked,
            bill_storage: document.getElementById('newBillStorage').checked,
            packaging_price: parseFloat(document.getElementById('newPackagingPrice').value),
            storage_price: parseFloat(document.getElementById('newStoragePrice').value),
            created_by: AuthManager.getUserId()
        };
        try {
            const response = await axios.post(`${API_BASE_URL}/shops`, shopData);
            showNotification('Marchand créé avec succès !');
            await fetchShops();
            const newShop = shopsCache.find(s => s.id === response.data.shopId);
            if(newShop){
                addShopSearchInput.value = newShop.name;
                addSelectedShopIdInput.value = newShop.id;
            }
            addShopModal.hide();
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/shops`, method: 'POST', payload: shopData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Action mise en file d'attente.", 'info');
                addShopModal.hide();
            } else {
                console.error("Erreur détaillée (création marchand):", error);
                showNotification(error.response?.data?.message || "Erreur lors de la création.", 'danger');
            }
        }
    });

    addOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));
        
        if (items.length === 0 || !items[0].item_name) {
             showNotification('Veuillez ajouter au moins un article.', 'danger');
             return;
        }

        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const orderData = {
            shop_id: addSelectedShopIdInput.value,
            customer_name: document.getElementById('customerName').value,
            customer_phone: document.getElementById('customerPhone').value,
            delivery_location: document.getElementById('deliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('deliveryFee').value,
            expedition_fee: isExpeditionCheckbox.checked ? parseFloat(expeditionFeeInput.value) : 0,
            created_by: AuthManager.getUserId(),
            items: items
        };
        
        try {
            await axios.post(`${API_BASE_URL}/orders`, orderData);
            showNotification('Commande créée avec succès !');
            addOrderModal.hide();
            await fetchAllData();
            resetAddOrderForm(); // <-- MISE À JOUR: Réinitialisation après succès
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/orders`, method: 'POST', payload: orderData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Commande mise en file d'attente. Elle sera synchronisée plus tard.", 'info');
                addOrderModal.hide();
                resetAddOrderForm(); // <-- MISE À JOUR: Réinitialisation après mise en file d'attente
            } else {
                console.error("Erreur détaillée (ajout commande):", error);
                showNotification('Erreur lors de la création de la commande.', 'danger');
            }
        }
    });

    editOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = editOrderIdInput.value;
        const items = Array.from(editItemsContainer.querySelectorAll('.item-row')).map(row => ({
            item_name: row.querySelector('.item-name-input').value,
            quantity: parseInt(row.querySelector('.item-quantity-input').value),
            amount: parseFloat(row.querySelector('.item-amount-input').value)
        }));
        
        const totalArticleAmount = items.reduce((sum, item) => sum + item.amount, 0);
        const expeditionFee = editIsExpeditionCheckbox.checked ? parseFloat(editExpeditionFeeInput.value) : 0;

        const updatedData = {
            shop_id: editSelectedShopIdInput.value,
            customer_name: document.getElementById('editCustomerName').value,
            customer_phone: document.getElementById('editCustomerPhone').value,
            delivery_location: document.getElementById('editDeliveryLocation').value,
            article_amount: totalArticleAmount,
            delivery_fee: document.getElementById('editDeliveryFee').value,
            expedition_fee: expeditionFee,
            items: items,
            deliveryman_id: editDeliverymanIdInput.value || null,
            created_at: editCreatedAtInput.value,
            updated_by: AuthManager.getUserId()
        };
        
        try {
            await axios.put(`${API_BASE_URL}/orders/${orderId}`, updatedData);
            showNotification('Commande modifiée avec succès !');
            editOrderModal.hide();
            await fetchAllData();
        } catch (error) {
            if (!navigator.onLine && window.syncManager) {
                const request = { url: `${API_BASE_URL}/orders/${orderId}`, method: 'PUT', payload: updatedData, token: AuthManager.getToken() };
                await window.syncManager.put(request);
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                showNotification("Modification mise en file d'attente.", 'info');
                editOrderModal.hide();
            } else {
                console.error("Erreur détaillée (modif commande):", error);
                showNotification('Erreur lors de la modification de la commande.', 'danger');
            }
        }
    });
    
    // Fonction unifiée pour la mise à jour de statut (individuel ou groupé)
    const updateOrderStatus = async (orderIds, status, paymentStatus = null, amountReceived = 0) => {
        const userId = AuthManager.getUserId();
        const promises = orderIds.map(id => {
            const payload = { status, payment_status: paymentStatus, amount_received: amountReceived, userId };
            const url = `${API_BASE_URL}/orders/${id}/status`;
            return axios.put(url, payload).catch(async (error) => {
                if (!navigator.onLine && window.syncManager) {
                    const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                    await window.syncManager.put(request);
                    return Promise.resolve({ offline: true }); // Pour indiquer que la requête a été mise en file d'attente
                }
                return Promise.reject(error); // Renvoyer l'erreur si ce n'est pas un problème de connexion
            });
        });
    
        try {
            const results = await Promise.all(promises);
            const offlineCount = results.filter(r => r && r.offline).length;
    
            if (offlineCount > 0) {
                showNotification(`${offlineCount} action(s) ont été mise(s) en file d'attente.`, 'info');
                if (offlineCount < orderIds.length) {
                    showNotification(`${orderIds.length - offlineCount} commande(s) mise(s) à jour avec succès.`);
                }
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
            } else {
                showNotification(`${orderIds.length} commande(s) mise(s) à jour avec succès.`);
            }
        } catch (error) {
            console.error("Erreur détaillée (updateOrderStatus):", error);
            showNotification('Une erreur est survenue lors de la mise à jour du statut.', 'danger');
        } finally {
            await fetchAllData();
        }
    };


    ordersTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.dropdown-item');
        if (!target) return;

        const orderId = target.dataset.orderId;

        if (target.classList.contains('details-btn')) {
             try {
                const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
                const order = res.data;
                const shopName = order.shop_name || 'N/A';
                const deliverymanName = order.deliveryman_name || 'Non assigné';

                const itemsHtml = order.items.map(item => `
                    <li>${item.item_name} (x${item.quantity}) - ${item.amount.toLocaleString('fr-FR')} FCFA</li>
                `).join('');

                const historyHtml = order.history.map(hist => `
                    <div class="border-start border-3 ps-3 mb-2">
                        <small class="text-muted">${new Date(hist.created_at).toLocaleString()}</small>
                        <p class="mb-0">${hist.action}</p>
                        <small>Par: ${hist.user_name || 'N/A'}</small>
                    </div>
                `).join('');

                document.getElementById('orderDetailsContent').innerHTML = `
                    <h6>Détails de la commande #${order.id}</h6>
                    <ul class="list-unstyled">
                        <li><strong>Marchand:</strong> ${shopName}</li>
                        <li><strong>Client:</strong> ${order.customer_name} (${order.customer_phone})</li>
                        <li><strong>Lieu de livraison:</strong> ${order.delivery_location}</li>
                        <li><strong>Montant article:</strong> ${order.article_amount.toLocaleString('fr-FR')} FCFA</li>
                        <li><strong>Frais de livraison:</strong> ${order.delivery_fee.toLocaleString('fr-FR')} FCFA</li>
                        <li><strong>Statut:</strong> <span class="badge bg-secondary">${statusTranslations[order.status] || 'Non spécifié'}</span></li>
                        <li><strong>Paiement:</strong> <span class="badge bg-secondary">${paymentTranslations[order.payment_status] || 'Non spécifié'}</span></li>
                        <li><strong>Livreur:</strong> ${deliverymanName}</li>
                        <li><strong>Date de création:</strong> ${new Date(order.created_at).toLocaleString()}</li>
                    </ul>
                    <hr>
                    <h6>Articles commandés</h6>
                    <ul class="list-unstyled">
                        ${itemsHtml}
                    </ul>
                    <hr>
                    <h6>Historique</h6>
                    ${historyHtml.length > 0 ? historyHtml : '<p>Aucun historique disponible.</p>'}
                `;
                orderDetailsModal.show();
            } catch (error) {
                console.error("Erreur détaillée (détails commande):", error);
                showNotification("Impossible de charger les données de la commande.", 'danger');
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette commande ?")) {
                const url = `${API_BASE_URL}/orders/${orderId}`;
                try {
                    await axios.delete(url);
                    showNotification('Commande supprimée avec succès.');
                    await fetchAllData();
                } catch (error) {
                    if (!navigator.onLine && window.syncManager) {
                        const request = { url, method: 'DELETE', payload: {}, token: AuthManager.getToken() };
                        await window.syncManager.put(request);
                        navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                        showNotification("Suppression mise en file d'attente.", 'info');
                    } else {
                        console.error("Erreur détaillée (suppression):", error);
                        showNotification('Erreur lors de la suppression de la commande.', 'danger');
                    }
                }
            }
        } else if (target.classList.contains('status-delivered-btn')) {
            document.getElementById('statusActionModalLabel').textContent = `Paiement pour Commande #${orderId}`;
            deliveredPaymentForm.classList.remove('d-none');
            failedDeliveryForm.classList.add('d-none');
            statusActionModal.show();
            
            document.getElementById('paymentCashBtn').onclick = () => {
                updateOrderStatus([orderId], 'delivered', 'cash');
                statusActionModal.hide();
            };

            document.getElementById('paymentSupplierBtn').onclick = () => {
                updateOrderStatus([orderId], 'delivered', 'paid_to_supplier');
                statusActionModal.hide();
            };

        } else if (target.classList.contains('status-failed-btn')) {
            document.getElementById('statusActionModalLabel').textContent = `Livraison ratée pour Commande #${orderId}`;
            deliveredPaymentForm.classList.add('d-none');
            failedDeliveryForm.classList.remove('d-none');
            statusActionModal.show();

            document.getElementById('amountReceived').value = 0;
            failedDeliveryForm.onsubmit = (e) => {
                e.preventDefault();
                const amountReceived = document.getElementById('amountReceived').value;
                updateOrderStatus([orderId], 'failed_delivery', null, amountReceived);
                statusActionModal.hide();
            };

        } else if (target.classList.contains('status-reported-btn')) {
            updateOrderStatus([orderId], 'reported', 'pending');
        } else if (target.classList.contains('status-cancelled-btn')) {
            updateOrderStatus([orderId], 'cancelled', 'cancelled');
        } else if (target.classList.contains('assign-btn')) {
            currentOrdersToAssign = [orderId];
            assignDeliveryModal.show();
            deliverymanSearchInput.value = '';
            assignDeliverymanIdInput.value = '';
        } else if (target.classList.contains('edit-btn')) {
            try {
                const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
                const order = res.data;
                const shop = shopsCache.find(s => s.id === order.shop_id);
                
                editOrderIdInput.value = order.id;
                editShopSearchInput.value = shop?.name || '';
                editSelectedShopIdInput.value = order.shop_id;
                document.getElementById('editCustomerName').value = order.customer_name;
                document.getElementById('editCustomerPhone').value = order.customer_phone;
                document.getElementById('editDeliveryLocation').value = order.delivery_location;
                document.getElementById('editDeliveryFee').value = order.delivery_fee;
                editDeliverymanIdInput.value = order.deliveryman_id || '';
                
                const expeditionFee = parseFloat(order.expedition_fee || 0);
                editIsExpeditionCheckbox.checked = expeditionFee > 0;
                editExpeditionFeeContainer.style.display = expeditionFee > 0 ? 'block' : 'none';
                editExpeditionFeeInput.value = expeditionFee;
                
                const formattedDate = new Date(order.created_at).toISOString().slice(0, 16);
                editCreatedAtInput.value = formattedDate;

                editItemsContainer.innerHTML = '';
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => addItemRow(editItemsContainer, item));
                } else {
                    addItemRow(editItemsContainer);
                }
                editOrderModal.show();
            } catch (error) {
                console.error("Erreur détaillée (chargement modif):", error);
                showNotification("Impossible de charger les données.", 'danger');
            }
        }
    });

    selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = e.target.checked);
        const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.dataset.orderId);
        selectedOrdersIdsSpan.textContent = selectedIds.join(', ') || 'Aucune';
    });

    ordersTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('order-checkbox')) {
            const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.dataset.orderId);
            selectedOrdersIdsSpan.textContent = selectedIds.join(', ') || 'Aucune';
        }
    });

    bulkActionsDropdown.addEventListener('click', async (e) => {
        const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.dataset.orderId);
        
        if (selectedIds.length === 0) {
            showNotification("Veuillez sélectionner au moins une commande.", 'warning');
            return;
        }

        const action = e.target.closest('.dropdown-item');
        if (!action) return;
        
        if (action.classList.contains('bulk-assign-btn')) {
            currentOrdersToAssign = selectedIds;
            assignDeliveryModal.show();
            deliverymanSearchInput.value = '';
            assignDeliverymanIdInput.value = '';
        } else if (action.classList.contains('bulk-status-delivered-btn')) {
            bulkStatusActionModal.show();
            bulkDeliveredPaymentForm.classList.remove('d-none');
            
            document.getElementById('bulkPaymentCashBtn').onclick = () => {
                updateOrderStatus(selectedIds, 'delivered', 'cash');
                bulkStatusActionModal.hide();
            };
            
            document.getElementById('bulkPaymentSupplierBtn').onclick = () => {
                updateOrderStatus(selectedIds, 'delivered', 'paid_to_supplier');
                bulkStatusActionModal.hide();
            };

        } else if (action.classList.contains('bulk-status-failed-btn')) {
            bulkFailedDeliveryModal.show();
            bulkFailedDeliveryForm.onsubmit = (e) => {
                e.preventDefault();
                const amountReceived = document.getElementById('bulkAmountReceived').value;
                updateOrderStatus(selectedIds, 'failed_delivery', null, amountReceived);
                bulkFailedDeliveryModal.hide();
            };
        } else if (action.classList.contains('bulk-status-reported-btn')) {
            updateOrderStatus(selectedIds, 'reported', 'pending');
        } else if (action.classList.contains('bulk-status-cancel-btn')) {
            if (confirm(`Voulez-vous vraiment annuler ${selectedIds.length} commande(s) ?`)) {
                updateOrderStatus(selectedIds, 'cancelled', 'cancelled');
            }
        } else if (action.classList.contains('bulk-delete-btn')) {
            if (confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} commande(s) ?`)) {
                const promises = selectedIds.map(id => {
                    const url = `${API_BASE_URL}/orders/${id}`;
                    return axios.delete(url).catch(async (error) => {
                        if (!navigator.onLine && window.syncManager) {
                            const request = { url, method: 'DELETE', payload: {}, token: AuthManager.getToken() };
                            await window.syncManager.put(request);
                            return Promise.resolve({ offline: true });
                        }
                        return Promise.reject(error);
                    });
                });
                
                try {
                    const results = await Promise.all(promises);
                    const offlineCount = results.filter(r => r && r.offline).length;
                    if (offlineCount > 0) {
                         showNotification(`${offlineCount} suppression(s) mise(s) en file d'attente.`, 'info');
                         navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
                    }
                    if (offlineCount < selectedIds.length) {
                        showNotification(`${selectedIds.length - offlineCount} commande(s) supprimée(s).`);
                    }
                } catch(err) {
                    showNotification("Une erreur est survenue.", 'danger');
                } finally {
                    await fetchAllData();
                }
            }
        }
    });

    assignDeliveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deliverymanId = assignDeliverymanIdInput.value;
        if (!deliverymanId) return showNotification('Veuillez sélectionner un livreur.', 'warning');
        if (currentOrdersToAssign.length === 0) return showNotification('Aucune commande à assigner.', 'warning');

        const promises = currentOrdersToAssign.map(orderId => {
            const url = `${API_BASE_URL}/orders/${orderId}/assign`;
            const payload = { deliverymanId, userId: AuthManager.getUserId() };
            return axios.put(url, payload).catch(async (error) => {
                if (!navigator.onLine && window.syncManager) {
                    const request = { url, method: 'PUT', payload, token: AuthManager.getToken() };
                    await window.syncManager.put(request);
                    return Promise.resolve({ offline: true });
                }
                return Promise.reject(error);
            });
        });

        try {
            const results = await Promise.all(promises);
            const offlineCount = results.filter(r => r && r.offline).length;
            if(offlineCount > 0){
                 showNotification(`${offlineCount} assignation(s) mise(s) en file d'attente.`, 'info');
                 navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-failed-requests'));
            }
            if(offlineCount < currentOrdersToAssign.length){
                showNotification(`${currentOrdersToAssign.length - offlineCount} commande(s) assignée(s) avec succès.`);
            }
        } catch(err) {
            showNotification("Erreur lors de l'assignation.", 'danger');
        } finally {
            assignDeliveryModal.hide();
            currentOrdersToAssign = [];
            await fetchAllData();
        }
    });

    const setupShopSearch = (searchInputId, resultsContainerId, selectedIdInputId) => {
        const input = document.getElementById(searchInputId);
        const resultsContainer = document.getElementById(resultsContainerId);
        const hiddenInput = document.getElementById(selectedIdInputId);

        input.addEventListener('input', () => {
            const searchTerm = input.value.toLowerCase();
            resultsContainer.innerHTML = '';
            if (searchTerm.length > 1) {
                const filteredShops = shopsCache.filter(shop => shop.name.toLowerCase().includes(searchTerm));
                if (filteredShops.length > 0) {
                    filteredShops.forEach(shop => {
                        const div = document.createElement('div');
                        div.className = 'p-2 dropdown-item';
                        div.textContent = shop.name;
                        div.dataset.id = shop.id;
                        div.addEventListener('click', () => {
                            input.value = shop.name;
                            hiddenInput.value = shop.id;
                            resultsContainer.classList.add('d-none');
                        });
                        resultsContainer.appendChild(div);
                    });
                    resultsContainer.classList.remove('d-none');
                } else {
                    resultsContainer.innerHTML = '<div class="p-2 text-muted">Aucun résultat.</div>';
                    resultsContainer.classList.remove('d-none');
                }
            } else {
                resultsContainer.classList.add('d-none');
            }
        });
    };
    
    const setupDeliverymanSearch = () => {
        deliverymanSearchInput.addEventListener('input', () => {
            const searchTerm = deliverymanSearchInput.value.toLowerCase();
            deliverymanSearchResultsContainer.innerHTML = '';
            if (searchTerm.length > 1) {
                const filteredDeliverymen = deliverymenCache.filter(dm => dm.name.toLowerCase().includes(searchTerm));
                if (filteredDeliverymen.length > 0) {
                    filteredDeliverymen.forEach(dm => {
                        const div = document.createElement('div');
                        div.className = 'p-2 dropdown-item';
                        div.textContent = dm.name;
                        div.dataset.id = dm.id;
                        div.addEventListener('click', () => {
                            deliverymanSearchInput.value = dm.name;
                            assignDeliverymanIdInput.value = dm.id;
                            deliverymanSearchResultsContainer.classList.add('d-none');
                        });
                        deliverymanSearchResultsContainer.appendChild(div);
                    });
                    deliverymanSearchResultsContainer.classList.remove('d-none');
                } else {
                    deliverymanSearchResultsContainer.innerHTML = '<div class="p-2 text-muted">Aucun résultat.</div>';
                    deliverymanSearchResultsContainer.classList.remove('d-none');
                }
            } else {
                deliverymanSearchResultsContainer.classList.add('d-none');
            }
        });
    };
    
    const today = new Date().toISOString().slice(0, 10);
    startDateFilter.value = today;
    endDateFilter.value = today;

    searchInput.addEventListener('input', applyFilters);
    startDateFilter.addEventListener('change', applyFilters);
    endDateFilter.addEventListener('change', applyFilters);
    
    statusFilterMenu.addEventListener('click', (e) => {
        const option = e.target.closest('.status-filter-option');
        if (option) {
            selectedStatusFilter = option.dataset.status;
            statusFilterBtn.textContent = `Statut : ${option.textContent}`;
            applyFilters();
        }
    });
    
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderPaginatedTable();
    });
    
    firstPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
    prevPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
    nextPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
    lastPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(filteredOrders.length / itemsPerPage)); });
    
    await Promise.all([fetchShops(), fetchDeliverymen()]);
    itemsPerPage = parseInt(itemsPerPageSelect.value); 
    await fetchAllData();
    setupShopSearch('shopSearchInput', 'searchResults', 'selectedShopId');
    setupShopSearch('editShopSearchInput', 'editSearchResults', 'editSelectedShopId');
    setupDeliverymanSearch();
    addItemBtn.addEventListener('click', () => addItemRow(itemsContainer));
    editAddItemBtn.addEventListener('click', () => addItemRow(editItemsContainer));
    handleRemoveItem(itemsContainer);
    handleRemoveItem(editItemsContainer);
    filterBtn.addEventListener('click', applyFilters);
    
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const sidebarToggler = document.getElementById('sidebar-toggler');
    const mainContent = document.getElementById('main-content');
    
    if (sidebarToggler) {
        sidebarToggler.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn){
        logoutBtn.addEventListener('click', () => {
            AuthManager.logout();
        });
    }
});