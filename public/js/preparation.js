// public/js/preparation.js
/**
 * Module de gestion de la logistique Hub (Préparation des colis et Gestion des retours).
 */
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = '/api';
  let currentUser = null;
  let deliverymenCache = [];

  // --- Références DOM ---
  const userNameDisplay = document.getElementById('userName');

  // Onglet Préparation
  const preparationContainer = document.getElementById('preparation-container');
  const prepCountSpan = document.getElementById('prepCount');
  const refreshPrepBtn = document.getElementById('refreshPrepBtn');
  const hubNotificationBadge = document.getElementById('hubNotificationBadge');
  const hubNotificationList = document.getElementById('hubNotificationList');
  const notificationModalEl = document.getElementById('notificationModal');
  const notificationModal = notificationModalEl ? new bootstrap.Modal(notificationModalEl) : null;


  // Onglet Retours
  const returnsContainer = document.getElementById('returnsContainer');
  const returnCountSpan = document.getElementById('returnCount');
  const returnFiltersForm = document.getElementById('returnFiltersForm');
  const returnDeliverymanFilter = document.getElementById('returnDeliverymanFilter');
  const returnStartDateInput = document.getElementById('returnStartDate');
  const returnEndDateInput = document.getElementById('returnEndDate');
  const refreshReturnsBtn = document.getElementById('refreshReturnsBtn');
  const returnToShopModalEl = document.getElementById('returnToShopModal');
  const returnToShopModal = returnToShopModalEl ? new bootstrap.Modal(returnToShopModalEl) : null;
  const returnShopTrackingIdSpan = document.getElementById('returnShopTrackingId');
  const confirmReturnTrackingIdHidden = document.getElementById('confirmReturnTrackingIdHidden');
  const confirmReturnToShopBtn = document.getElementById('confirmReturnToShopBtn');


  // Modale Édition Articles
  const editItemsModalEl = document.getElementById('editItemsModal');
  const editItemsModal = editItemsModalEl ? new bootstrap.Modal(editItemsModalEl) : null;
  const editItemsForm = document.getElementById('editItemsForm');
  const editItemsOrderIdSpan = document.getElementById('editItemsOrderId');
  const editItemsOrderIdHidden = document.getElementById('editItems_OrderId_Hidden');
  const originalArticleAmountHidden = document.getElementById('originalArticleAmountHidden');
  const modalItemsContainer = document.getElementById('modalItemsContainer');
  const modalAddItemBtn = document.getElementById('modalAddItemBtn');
  const saveItemsAndMarkReadyBtn = document.getElementById('saveItemsAndMarkReadyBtn');
  const editAlert = document.getElementById('editAlert');


  // --- Constantes ---
  const statusReturnTranslations = {
    'pending_return_to_hub': 'En attente Hub',
    'received_at_hub': 'Confirmé Hub',
    'returned_to_shop': 'Retourné Marchand'
  };

  // --- Fonctions Utilitaires ---

  /**
   * Affiche une notification toast stylisée.
   * @param {string} message - Le message à afficher.
   * @param {string} [type='success'] - Le type d'alerte.
   */
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
    }, 5000);
  };

  /**
   * Récupère l'en-tête d'authentification.
   * @returns {Object|null} L'objet header.
   */
  const getAuthHeader = () => {
    if (typeof AuthManager === 'undefined' || !AuthManager.getToken) { return null; }
    const token = AuthManager.getToken();
    if (!token) { AuthManager.logout(); return null; }
    return { 'Authorization': `Bearer ${token}` };
  };

  /**
   * Affiche ou masque l'état de chargement dans un élément.
   * @param {HTMLElement} element - L'élément à modifier.
   * @param {boolean} isLoading - Si l'état de chargement doit être affiché.
   */
  const showLoadingState = (element, isLoading) => {
    if (!element) return;
    if (element.id === 'preparation-container' || element.id === 'returnsContainer') {
      const loadingIndicatorId = element.id === 'preparation-container' ? 'loading-prep' : 'loading-returns';
      let loadingIndicator = element.querySelector(`#${loadingIndicatorId}`);

      if (isLoading) {
        if (!loadingIndicator) {
          loadingIndicator = document.createElement('p');
          loadingIndicator.id = loadingIndicatorId;
          loadingIndicator.className = 'text-center text-muted p-5';
          loadingIndicator.innerHTML = `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div>`;
          element.innerHTML = '';
          element.appendChild(loadingIndicator);
        }
      } else if (loadingIndicator) {
        loadingIndicator.remove();
      }
    }
  };


  /**
   * Récupère la liste des livreurs actifs pour les filtres.
   */
  const fetchDeliverymen = async () => {
    const headers = getAuthHeader();
    if (!headers) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/deliverymen?status=all`, { headers });
      deliverymenCache = res.data;
      renderDeliverymanFilterOptions();
    } catch (error) {
      console.error("Erreur chargement livreurs:", error);
    }
  };

  /**
   * Rend les options pour le filtre des livreurs dans l'onglet Retours.
   */
  const renderDeliverymanFilterOptions = () => {
    if (!returnDeliverymanFilter) return;
    returnDeliverymanFilter.innerHTML = '<option value="">Tous les livreurs</option>';
    deliverymenCache.forEach(dm => {
      const option = document.createElement('option');
      option.value = dm.id;
      option.textContent = dm.name;
      returnDeliverymanFilter.appendChild(option);
    });
  };

  /**
   * Formate un montant en FCFA.
   * @param {number|string} amount - Le montant.
   * @returns {string} Le montant formaté.
   */
  const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

  // --- Fonctions PRÉPARATION ---

  /**
   * Récupère les commandes en attente de préparation ou déjà prêtes.
   */
  const fetchOrdersToPrepare = async () => {
    showLoadingState(preparationContainer, true);
    const headers = getAuthHeader();
    if (!headers) { showNotification("Erreur d'authentification.", "danger"); showLoadingState(preparationContainer, false); return; }

    try {
      const response = await axios.get(`${API_BASE_URL}/orders/pending-preparation`, { headers });
      const orders = response.data || [];
      const ordersToRender = orders.filter(order => !order.picked_up_by_rider_at);
      renderOrders(ordersToRender);
      if (prepCountSpan) prepCountSpan.textContent = ordersToRender.length;
    } catch (error) {
      console.error("Erreur fetchOrdersToPrepare:", error);
      showNotification("Erreur lors du chargement des commandes à préparer.", "danger");
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
      showLoadingState(preparationContainer, false);
    }
  };

  /**
   * Affiche les commandes groupées par livreur pour la préparation.
   * @param {Array<Object>} orders - Liste des commandes.
   */
  const renderOrders = (orders) => {
    if (!preparationContainer) return;
    preparationContainer.innerHTML = '';

    const groupedByDeliveryman = orders.reduce((acc, order) => {
      const deliverymanId = order.deliveryman_id || 0;
      const deliverymanName = order.deliveryman_name || 'Non Assigné';
      if (!acc[deliverymanId]) acc[deliverymanId] = { name: deliverymanName, orders: [] };
      acc[deliverymanId].orders.push(order);
      return acc;
    }, {});

    const sortedGroupIds = Object.keys(groupedByDeliveryman).sort((a, b) => {
      if (a === '0') return -1; if (b === '0') return 1;
      return groupedByDeliveryman[a].name.localeCompare(groupedByDeliveryman[b].name);
    });

    if (sortedGroupIds.length === 0) {
      preparationContainer.innerHTML = '<div class="alert alert-secondary text-center">Aucune commande à préparer actuellement.</div>';
      return;
    }

    sortedGroupIds.forEach(deliverymanId => {
      const group = groupedByDeliveryman[deliverymanId];
      const groupSection = document.createElement('section');

      const readyCount = group.orders.filter(o => o.status === 'ready_for_pickup').length;
      const inProgressCount = group.orders.filter(o => o.status === 'in_progress').length;

      const groupHeader = document.createElement('header');
      groupHeader.className = 'deliveryman-header';
      groupHeader.innerHTML = `<i class="bi bi-person-fill me-2"></i>${group.name}
             <span class="badge text-bg-info ms-2">${readyCount} Prêt(s)</span>
             <span class="badge text-bg-warning ms-2">${inProgressCount} En cours</span>`;
      groupSection.appendChild(groupHeader);

      const gridDiv = document.createElement('div');
      gridDiv.className = 'orders-grid';

      group.orders.sort((a, b) => {
        if (a.status === 'in_progress' && b.status === 'ready_for_pickup') return -1;
        if (a.status === 'ready_for_pickup' && b.status === 'in_progress') return 1;
        return moment(a.created_at).diff(moment(b.created_at));
      });

      group.orders.forEach(order => {
        const isReady = order.status === 'ready_for_pickup';
        if (!!order.picked_up_by_rider_at) return;

        const card = document.createElement('article');
        card.className = `order-card-prep ${isReady ? 'is-ready' : ''}`;
        card.dataset.orderId = order.id;
        card.dataset.orderData = JSON.stringify(order);

        const totalArticles = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.amount || 0) * parseFloat(item.quantity || 1)), 0);

        const itemsListHtml = (order.items && order.items.length > 0)
          ? `<ul class="items-list list-unstyled">${order.items.map(item => `<li>- ${item.quantity} x ${item.item_name || 'Article inconnu'}</li>`).join('')}</ul>`
          : '<p class="text-muted small">Aucun article détaillé.</p>';

        const actionButtonHtml = isReady
          ? `<button class="btn btn-sm btn-success btn-ready-action confirm-ready-btn" data-order-id="${order.id}" disabled>
               <i class="bi bi-check-circle-fill me-1"></i> Préparation Confirmée
             </button>`
          : `<button class="btn btn-sm btn-primary-custom btn-ready-action mark-ready-btn" data-order-id="${order.id}">
               <i class="bi bi-check-lg me-1"></i> Marquer comme Prête
             </button>`;

        card.innerHTML = `
          <button class="btn btn-sm btn-edit-items" data-order-id="${order.id}" title="Modifier Nom/Quantité Article">
            <i class="bi bi-pencil"></i>
          </button>
          <div class="order-id">#${order.id}</div>
          <div class="info-line"><i class="bi bi-shop"></i> <span>${order.shop_name || 'Marchand inconnu'}</span></div>
          <div class="info-line"><i class="bi bi-person"></i> <span>${order.customer_phone || 'Tél inconnu'}</span></div>
          <div class="info-line"><i class="bi bi-geo-alt"></i> <span>${order.delivery_location || 'Lieu inconnu'}</span></div>
          <h6>Articles (${formatAmount(totalArticles)}) :</h6>
          ${itemsListHtml}
          <div class="action-button-container">
            ${actionButtonHtml}
          </div>
          <small class="text-muted text-end mt-1">Assignée le ${moment(order.created_at).format('DD/MM HH:mm')}</small>
        `;
        gridDiv.appendChild(card);
      });

      groupSection.appendChild(gridDiv);
      preparationContainer.appendChild(groupSection);
    });

    attachButtonListeners();
  };

  /**
   * Ouvre la modale d'édition des articles d'une commande (Nom/Quantité seulement).
   * @param {Object} orderData - Les données de la commande.
   */
  const openEditItemsModal = (orderData) => {
    if (!editItemsModal || !orderData) return;

    const isPickedUp = !!orderData.picked_up_by_rider_at;
    const totalArticleAmountOriginal = (orderData.items || []).reduce((sum, item) => sum + (parseFloat(item.amount || 0) * parseFloat(item.quantity || 1)), 0);

    editItemsOrderIdSpan.textContent = orderData.id;
    editItemsOrderIdHidden.value = orderData.id;
    originalArticleAmountHidden.value = totalArticleAmountOriginal;

    modalItemsContainer.innerHTML = '';
    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach(item => addItemRowModal(modalItemsContainer, item, isPickedUp));
    } else {
      addItemRowModal(modalItemsContainer, {}, isPickedUp);
    }

    if (isPickedUp) {
      editItemsForm.querySelectorAll('input:not([readonly]), select, textarea, button:not([data-bs-dismiss])').forEach(el => el.disabled = true);
      saveItemsAndMarkReadyBtn.innerHTML = '<i class="bi bi-lock me-1"></i> Colis déjà récupéré (Non modifiable)';
      if (editAlert) {
        editAlert.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> **Mode lecture seule:** Colis récupéré le ${moment(orderData.picked_up_by_rider_at).format('DD/MM HH:mm')}.`;
        editAlert.classList.replace('alert-warning', 'alert-secondary');
      }

    } else {
      editItemsForm.querySelectorAll('input, select, textarea, button:not([data-bs-dismiss])').forEach(el => {
        if (!el.readOnly && !el.closest('.d-none')) el.disabled = false;
      });
      saveItemsAndMarkReadyBtn.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications';

      if (editAlert) {
        editAlert.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Modifiez ici le **nom** et/ou la **quantité** des articles.';
        editAlert.classList.replace('alert-secondary', 'alert-warning');
      }
    }

    editItemsModal.show();
  };

  /**
   * Ajout/Suppression d'une ligne d'article dans la modale d'édition (Nom/Qté).
   * @param {HTMLElement} container - Le conteneur des articles.
   * @param {Object} [item={}] - L'objet article.
   * @param {boolean} [isReadOnly=false] - Indique si les champs doivent être en lecture seule.
   */
  const addItemRowModal = (container, item = {}, isReadOnly = false) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'row g-2 item-row-modal mb-2';
    const isFirst = container.children.length === 0;
    const labelHiddenClass = !isFirst ? 'visually-hidden' : '';
    const originalAmountAttr = item.amount !== undefined ? `data-original-amount="${item.amount}"` : '';

    itemRow.innerHTML = `
      <div class="col-md-5">
        <label class="form-label mb-1 ${labelHiddenClass}">Nom article</label>
        <input type="text" class="form-control form-control-sm item-name-input" value="${item.item_name || ''}" placeholder="Article" required ${isReadOnly ? 'readonly' : ''} ${originalAmountAttr}>
        <input type="hidden" class="item-id-input" value="${item.id || ''}">
      </div>
      <div class="col-md-3">
        <label class="form-label mb-1 ${labelHiddenClass}">Qté</label>
        <input type="number" class="form-control form-control-sm item-quantity-input" value="${item.quantity || 1}" min="1" required ${isReadOnly ? 'readonly' : ''}>
      </div>
      <div class="col-md-4">
        <input type="hidden" class="form-control item-amount-input" value="${item.amount || 0}" min="0">
        <button class="btn btn-outline-danger remove-item-btn-modal ms-auto" type="button" ${isReadOnly ? 'disabled' : ''}><i class="bi bi-trash"></i></button>
      </div>`;
    container.appendChild(itemRow);

    if (container.children.length > 1) {
      itemRow.querySelectorAll('label').forEach(label => label.classList.add('visually-hidden'));
    } else {
      itemRow.querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
    }
  };


  /**
   * Gère la soumission du formulaire d'édition d'articles (Nom/Qté seulement).
   * @param {Event} event - L'événement de soumission.
   */
  const handleEditItemsSubmit = async (event) => {
    event.preventDefault();
    const headers = getAuthHeader();
    if (!headers) return;

    const orderId = editItemsOrderIdHidden.value;
    const button = saveItemsAndMarkReadyBtn;

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sauvegarde...';

    const items = Array.from(modalItemsContainer.querySelectorAll('.item-row-modal')).map(row => {
      const nameInput = row.querySelector('.item-name-input');
      const quantityInput = row.querySelector('.item-quantity-input');

      // Récupérer le montant original s'il existe dans le data attribute
      const originalAmount = nameInput.dataset.originalAmount !== undefined ? parseFloat(nameInput.dataset.originalAmount) : null;

      return {
        item_name: nameInput.value,
        quantity: parseInt(quantityInput.value),
        amount: originalAmount // Envoyer le montant original (Non édité par le Hub)
      };
    });

    if (items.some(item => !item.item_name || item.quantity <= 0)) {
      showNotification("Veuillez vérifier que le nom et la quantité sont valides.", "warning");
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications';
      return;
    }

    try {
      // Utiliser PUT /api/orders/:orderId/items pour ne modifier que les items (Nom et Qté)
      await axios.put(`${API_BASE_URL}/orders/${orderId}/items`, { items: items }, { headers });

      showNotification(`Articles de la commande #${orderId} modifiés !`, 'success');
      editItemsModal.hide();
      fetchOrdersToPrepare();

    } catch (error) {
      console.error(`Erreur sauvegarde articles Cde ${orderId}:`, error);
      showNotification(error.response?.data?.message || `Échec de la sauvegarde des modifications.`, 'danger');
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-save me-1"></i> Sauvegarder les Modifications';
    }
  };

  /**
   * Marque une commande comme prête (appel API séparé).
   * @param {string} orderId - ID de la commande.
   */
  const markOrderAsReady = async (orderId) => {
    const headers = getAuthHeader();
    if (!headers) return;

    const button = preparationContainer?.querySelector(`.mark-ready-btn[data-order-id="${orderId}"]`);
    if (button) button.disabled = true;

    try {
      await axios.put(`${API_BASE_URL}/orders/${orderId}/ready`, {}, { headers });
      showNotification(`Commande #${orderId} marquée comme prête !`, 'success');
      fetchOrdersToPrepare();
    } catch (error) {
      console.error(`Erreur marquage prête Cde ${orderId}:`, error);
      showNotification(error.response?.data?.message || `Échec marquage comme prête.`, 'danger');
      if (button) button.disabled = false;
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
    }
  };


  // --- RETOURS (Onglet 2) ---

  /**
   * Récupère la liste des retours en attente de gestion (Admin).
   */
  const fetchPendingReturns = async () => {
    showLoadingState(returnsContainer, true);

    const headers = getAuthHeader();
    if (!headers) { showLoadingState(returnsContainer, false); return; }

    const filters = {
      status: document.getElementById('returnStatusFilter').value,
      deliverymanId: returnDeliverymanFilter.value,
      startDate: returnStartDateInput.value,
      endDate: returnEndDateInput.value
    };

    try {
      const response = await axios.get(`${API_BASE_URL}/returns/pending-hub`, { params: filters, headers });
      const returns = response.data || [];
      renderReturnsCards(returns);
      const pendingToHubCount = returns.filter(r => r.return_status === 'pending_return_to_hub').length;
      if (returnCountSpan) returnCountSpan.textContent = pendingToHubCount;

      if (hubNotificationBadge) {
        hubNotificationBadge.textContent = pendingToHubCount;
        hubNotificationBadge.classList.toggle('d-none', pendingToHubCount === 0);
      }

    } catch (error) {
      console.error("Erreur fetchPendingReturns:", error);
      returnsContainer.innerHTML = `<p class="text-center text-danger p-3">Erreur lors du chargement des retours.</p>`;
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
    }
  };

  /**
   * Affiche les retours sous forme de cartes.
   * @param {Array<Object>} returns - Liste des objets de retour.
   */
  const renderReturnsCards = (returns) => {
    if (!returnsContainer) return;
    showLoadingState(returnsContainer, false); // Supprime le spinner

    if (returns.length === 0) {
      returnsContainer.innerHTML = `<p class="text-center p-3 text-muted">Aucun retour trouvé pour ces filtres.</p>`;
      return;
    }

    returns.forEach(returnItem => {
      const isConfirmedHub = returnItem.return_status === 'received_at_hub';
      const isReturnedToShop = returnItem.return_status === 'returned_to_shop';

      const card = document.createElement('article');
      card.className = `return-card status-${returnItem.return_status}`;
      card.dataset.trackingId = returnItem.tracking_id;

      const statusText = statusReturnTranslations[returnItem.return_status] || returnItem.return_status;
      const statusClass = isConfirmedHub ? 'bg-success' : (isReturnedToShop ? 'bg-info' : 'bg-warning text-dark');

      let dropdownItemsHtml = '';
      if (!isConfirmedHub && !isReturnedToShop) {
        dropdownItemsHtml += `<li><a class="dropdown-item btn-confirm-return" href="#" data-tracking-id="${returnItem.tracking_id}"><i class="bi bi-box-arrow-in-down me-2"></i> Confirmer Réception Hub</a></li>`;
      }
      if (isConfirmedHub && !isReturnedToShop) {
        dropdownItemsHtml += `<li><a class="dropdown-item btn-return-to-shop" href="#" data-tracking-id="${returnItem.tracking_id}"><i class="bi bi-shop me-2"></i> Remettre au Marchand</a></li>`;
      }
      if (!dropdownItemsHtml) {
        dropdownItemsHtml = `<li><span class="dropdown-item-text text-muted">Aucune action disponible</span></li>`;
      }

      const commentTooltip = returnItem.comment ? `data-bs-toggle="tooltip" title="${returnItem.comment}"` : `data-bs-toggle="tooltip" title="Aucun commentaire"`;
      const orderIdTooltip = `Cliquer pour voir le détail de la commande #${returnItem.order_id}`;

      card.innerHTML = `
        <div class="return-header">
          <h6 class="tracking-id mb-0">Retour #${returnItem.tracking_id}</h6>
          <div class="dropdown return-actions">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              ${dropdownItemsHtml}
            </ul>
          </div>
        </div>
        <hr class="my-2">
        <div class="return-details">
          <p class="info-line"><i class="bi bi-box-seam"></i> <span><a href="orders.html?search=#${returnItem.order_id}" target="_blank" data-bs-toggle="tooltip" title="${orderIdTooltip}">Cde #${returnItem.order_id}</a></span></p>
          <p class="info-line"><i class="bi bi-person"></i> <span>${returnItem.deliveryman_name || 'N/A'}</span></p>
          <p class="info-line"><i class="bi bi-shop"></i> <span>${returnItem.shop_name || 'N/A'}</span></p>
          <p class="info-line"><i class="bi bi-calendar-event"></i> <span>Déclaré le ${moment(returnItem.declaration_date).format('DD/MM HH:mm')}</span> <i class="bi bi-chat-left-text text-muted ms-2" ${commentTooltip}></i></p>
          <p class="info-line"><i class="bi bi-flag"></i> <span>Statut: <span class="badge ${statusClass} ms-1">${statusText}</span></span></p>
        </div>
      `;
      returnsContainer.appendChild(card);
    });

    // Réinitialiser les tooltips Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
      if (existingTooltip) existingTooltip.dispose();
      new bootstrap.Tooltip(tooltipTriggerEl);
    });

    attachButtonListeners();
  };

  /**
   * Gère la confirmation de réception d'un retour au Hub (Admin).
   * @param {Event} event - L'événement de clic.
   */
  const handleConfirmHubReception = async (event) => {
    event.preventDefault();
    const link = event.currentTarget;
    const trackingId = link.dataset.trackingId;
    if (!trackingId || !confirm(`Confirmer la réception physique du retour #${trackingId} ?`)) return;

    const headers = getAuthHeader();
    if (!headers) return;

    try {
      await axios.put(`${API_BASE_URL}/returns/${trackingId}/confirm-hub`, {}, { headers });
      showNotification(`Retour #${trackingId} confirmé au Hub.`, 'success');
      fetchPendingReturns();
    } catch (error) {
      console.error(`Erreur confirmation retour ${trackingId}:`, error);
      showNotification(error.response?.data?.message || `Erreur lors de la confirmation.`, 'danger');
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
    }
  };

  /**
   * Ouvre la modale de confirmation pour le retour au marchand.
   * @param {string} trackingId - ID de suivi.
   */
  const handleOpenReturnToShopModal = (trackingId) => {
    if (!returnToShopModal) return;
    returnShopTrackingIdSpan.textContent = trackingId;
    confirmReturnTrackingIdHidden.value = trackingId;
    returnToShopModal.show();
  };

  /**
   * Confirme la remise physique du colis au marchand (étape finale).
   */
  const handleConfirmReturnToShop = async () => {
    const trackingId = confirmReturnTrackingIdHidden.value;
    const button = confirmReturnToShopBtn;
    if (!trackingId) return;

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Confirmation...';

    const headers = getAuthHeader();
    if (!headers) { button.disabled = false; return; }

    try {
      await axios.put(`${API_BASE_URL}/returns/${trackingId}/return-to-shop`, {}, { headers });
      showNotification(`Colis #${trackingId} remis au marchand confirmé !`, 'success');

      returnToShopModal.hide();
      fetchPendingReturns();
    } catch (error) {
      console.error(`Erreur remise au marchand ${trackingId}:`, error);
      showNotification(error.response?.data?.message || `Échec de la confirmation de remise.`, 'danger');
      if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="bi bi-check-circle me-2"></i> Confirmer la remise';
    }
  };

  // --- GESTION NOTIFICATIONS (Amélioration) ---

  /**
   * Récupère les notifications du Hub et met à jour la modale.
   */
  const fetchHubNotifications = async () => {
    const pendingReturns = parseInt(returnCountSpan?.textContent || '0');
    const ordersToPrepare = parseInt(prepCountSpan?.textContent || '0');

    const dismissedNotifications = JSON.parse(localStorage.getItem('dismissedHubNotifications') || '[]');
    const notifications = [];

    if (pendingReturns > 0) {
      const notifId = `return-${moment().format('YYYYMMDD')}`;
      if (!dismissedNotifications.includes(notifId)) {
        notifications.push({ id: notifId, type: 'danger', message: `${pendingReturns} retour(s) en attente de confirmation Hub.`, action: '#returns-panel' });
      }
    }
    if (ordersToPrepare > 0) {
      const notifId = `prep-${moment().format('YYYYMMDD')}`;
      if (!dismissedNotifications.includes(notifId)) {
        notifications.push({ id: notifId, type: 'warning', message: `${ordersToPrepare} commande(s) à vérifier/préparer.`, action: '#preparation-panel' });
      }
    }

    if (!hubNotificationList) return;
    hubNotificationList.innerHTML = '';

    if (notifications.length === 0) {
      hubNotificationList.innerHTML = '<li class="list-group-item text-center text-muted">Aucune nouvelle notification.</li>';
      return;
    }

    notifications.forEach(notif => {
      const item = document.createElement('li');
      item.className = `list-group-item list-group-item-${notif.type}`;
      item.dataset.notifId = notif.id;

      const content = `<a href="${notif.action}" class="d-flex align-items-center text-decoration-none text-dark">
                         <i class="bi bi-bell-fill me-2"></i> ${notif.message}
                       </a>`;
      const deleteBtn = `<button class="delete-notif-btn" data-notif-id="${notif.id}" title="Marquer comme lu/Supprimer">
                           <i class="bi bi-x-lg"></i>
                         </button>`;

      item.innerHTML = content + deleteBtn;
      item.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = document.querySelector(`button[data-bs-target="${notif.action}"]`);
        if (targetTab) {
          const tabInstance = bootstrap.Tab.getInstance(targetTab) || new bootstrap.Tab(targetTab);
          tabInstance.show();
        }
        notificationModal?.hide();
      });

      hubNotificationList.appendChild(item);
    });

    hubNotificationList.querySelectorAll('.delete-notif-btn').forEach(btn => {
      btn.addEventListener('click', handleDeleteNotification);
    });
  };

  /**
   * Marque une notification comme lue (la supprime de l'affichage et stocke son ID).
   * @param {Event} e - L'événement de clic.
   */
  const handleDeleteNotification = (e) => {
    const button = e.currentTarget;
    const notifItem = button.closest('li.list-group-item');
    const notifId = notifItem?.dataset.notifId;

    if (notifItem && notifId) {
      notifItem.remove();

      const dismissedNotifications = JSON.parse(localStorage.getItem('dismissedHubNotifications') || '[]');
      if (!dismissedNotifications.includes(notifId)) {
        dismissedNotifications.push(notifId);
        localStorage.setItem('dismissedHubNotifications', JSON.stringify(dismissedNotifications));
      }

      if (hubNotificationList.children.length === 0) {
        hubNotificationList.innerHTML = '<li class="list-group-item text-center text-muted">Aucune nouvelle notification.</li>';
      }
      fetchHubNotifications();
      showNotification("Notification marquée comme lue.", 'info');
    }
  };


  // --- Attachement des Listeners ---

  /**
   * Attache les écouteurs aux boutons générés dynamiquement.
   */
  function attachButtonListeners() {
    preparationContainer?.querySelectorAll('.btn-edit-items').forEach(button => {
      button.removeEventListener('click', openEditItemsModalFromButton);
      button.addEventListener('click', openEditItemsModalFromButton);
    });
    preparationContainer?.querySelectorAll('.mark-ready-btn').forEach(button => {
      button.removeEventListener('click', handleMarkReadyClick);
      button.addEventListener('click', handleMarkReadyClick);
    });

    returnsContainer?.querySelectorAll('.btn-confirm-return').forEach(link => {
      link.removeEventListener('click', handleConfirmHubReception);
      link.addEventListener('click', handleConfirmHubReception);

    });
    returnsContainer?.querySelectorAll('.btn-return-to-shop').forEach(link => {
      link.removeEventListener('click', handleOpenReturnToShopModalClick);
      link.addEventListener('click', handleOpenReturnToShopModalClick);
    });
  }

  /**
   * Handler pour le bouton "Marquer Prête".
   * @param {Event} event - L'événement de clic.
   */
  function handleMarkReadyClick(event) {
    const button = event.currentTarget;
    const orderId = button.dataset.orderId;
    if (orderId && confirm(`Marquer la commande #${orderId} comme prête pour la récupération ?`)) {
      markOrderAsReady(orderId);
    }
  }

  /**
   * Ouvre la modale d'édition depuis les boutons CRAYON.
   * @param {Event} event - L'événement de clic.
   */
  function openEditItemsModalFromButton(event) {
    const button = event.currentTarget;
    const card = button.closest('.order-card-prep');
    if (card && card.dataset.orderData) {
      try {
        const orderData = JSON.parse(card.dataset.orderData);
        openEditItemsModal(orderData);
      } catch (e) {
        console.error("Impossible de parser les données de la commande :", e);
        showNotification("Erreur de données de la commande.", "danger");
      }
    }
  }

  /**
   * Ouvre la modale de retour au marchand.
   * @param {Event} event - L'événement de clic.
   */
  function handleOpenReturnToShopModalClick(event) {
    event.preventDefault();
    const link = event.currentTarget;
    const trackingId = link.dataset.trackingId;
    if (trackingId) {
      handleOpenReturnToShopModal(trackingId);
    }
  }

  // --- Initialisation et Listeners ---
  const initializeApp = async () => {
    if (typeof AuthManager === 'undefined' || !AuthManager.getUser) {
      showNotification("Erreur critique d'initialisation.", "danger");
      return;
    }
    currentUser = AuthManager.getUser();
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name || '{{username}}';

    const today = moment().format('YYYY-MM-DD');
    if (returnStartDateInput) returnStartDateInput.value = today;
    if (returnEndDateInput) returnEndDateInput.value = today;

    await fetchDeliverymen();

    const sidebarToggler = document.getElementById('sidebar-toggler');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (sidebarToggler) {
      sidebarToggler.addEventListener('click', () => {
        if (window.innerWidth < 992) sidebar.classList.toggle('show');
        else { sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('expanded'); }
      });
    }

    refreshPrepBtn?.addEventListener('click', fetchOrdersToPrepare);
    returnFiltersForm?.addEventListener('submit', (e) => { e.preventDefault(); fetchPendingReturns(); });
    refreshReturnsBtn?.addEventListener('click', fetchPendingReturns);
    modalAddItemBtn?.addEventListener('click', () => addItemRowModal(modalItemsContainer));
    modalItemsContainer?.addEventListener('click', (e) => {
      const removeButton = e.target.closest('.remove-item-btn-modal');
      if (removeButton && !removeButton.disabled) {
        if (modalItemsContainer.children.length > 1) {
          removeButton.closest('.item-row-modal').remove();
          if (modalItemsContainer.children.length === 1) {
            modalItemsContainer.children[0].querySelectorAll('label').forEach(label => label.classList.remove('visually-hidden'));
          }
        } else showNotification("Vous devez avoir au moins un article.", "warning");
      }
    });
    editItemsForm?.addEventListener('submit', handleEditItemsSubmit);

    document.getElementById('notificationBtn')?.addEventListener('click', () => fetchHubNotifications());
    confirmReturnToShopBtn?.addEventListener('click', handleConfirmReturnToShop);
    document.getElementById('logoutBtn')?.addEventListener('click', () => AuthManager.logout());

    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tabEl => {
      tabEl.addEventListener('shown.bs.tab', (event) => {
        const targetId = event.target.getAttribute('data-bs-target');
        if (targetId === '#preparation-panel') fetchOrdersToPrepare();
        else if (targetId === '#returns-panel') fetchPendingReturns();
      });
    });

    fetchOrdersToPrepare();
    fetchPendingReturns();
  };

  if (typeof AuthManager !== 'undefined') {
    document.addEventListener('authManagerReady', initializeApp);
    setTimeout(() => { if (!currentUser && AuthManager.getUser()) initializeApp(); }, 100);
  }
});