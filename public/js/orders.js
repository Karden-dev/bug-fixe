// js/orders.js

document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = 'http://localhost:3000';
  const CURRENT_USER_ID = 1; // À adapter en fonction de l'utilisateur connecté

  // --- ÉLÉMENTS DU DOM ---
  const ordersTableBody = document.getElementById('ordersTableBody');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const bulkActionsDropdown = document.getElementById('bulkActionsDropdown');
  const itemsPerPageSelect = document.getElementById('itemsPerPage');
  const paginationInfo = document.getElementById('paginationInfo');
  const firstPageBtn = document.getElementById('firstPage');
  const prevPageBtn = document.getElementById('prevPage');
  const currentPageDisplay = document.getElementById('currentPageDisplay');
  const nextPageBtn = document.getElementById('nextPage');
  const lastPageBtn = document.getElementById('lastPage');

  // Modals
  const addOrderModal = new bootstrap.Modal(document.getElementById('addOrderModal'));
  const addShopModal = new bootstrap.Modal(document.getElementById('addShopModal'));
  const editOrderModal = new bootstrap.Modal(document.getElementById('editOrderModal'));
  const statusActionModal = new bootstrap.Modal(document.getElementById('statusActionModal'));
  const assignDeliveryModal = new bootstrap.Modal(document.getElementById('assignDeliveryModal'));
  const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
  const bulkStatusActionModal = new bootstrap.Modal(document.getElementById('bulkStatusActionModal'));
  const bulkFailedDeliveryModal = new bootstrap.Modal(document.getElementById('bulkFailedDeliveryModal'));

  // Forms and Inputs
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

  // --- ÉTAT GLOBAL ---
  let allOrders = [];
  let paginatedOrders = [];
  let shopsCache = [];
  let deliverymenCache = [];
  let selectedStatusFilter = '';
  let currentOrdersToAssign = [];
  let currentPage = 1;
  let itemsPerPage = 25;

  // --- CONSTANTES DE TRADUCTION ET STYLES ---
  const statusTranslations = {
    pending: 'En attente',
    in_progress: 'En cours',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    failed_delivery: 'Livraison ratée',
    reported: 'À relancer',
  };
  const paymentTranslations = {
    pending: 'En attente',
    cash: 'En espèces',
    paid_to_supplier: 'Payé au marchand',
    cancelled: 'Annulé',
  };
  const statusColors = {
    pending: 'status-pending',
    in_progress: 'status-in_progress',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled',
    failed_delivery: 'status-failed_delivery',
    reported: 'status-reported',
  };
  const paymentColors = {
    pending: 'payment-pending',
    cash: 'payment-cash',
    paid_to_supplier: 'payment-supplier_paid',
    cancelled: 'payment-cancelled',
  };

  /**
   * Affiche une notification toast stylisée.
   * La notification s'affiche en haut à droite et disparaît après 4 secondes.
   * @param {string} message - Le message à afficher.
   * @param {string} [type='success'] - Le type d'alerte (success, danger, warning, info).
   */
  const showNotification = (message, type = 'success') => {
    const container = document.getElementById('notification-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    container.appendChild(alert);
    
    // Fermeture automatique pour l'effet "toast"
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
    }, 4000); 
  };

  /**
   * Affiche un indicateur de chargement dans le tableau.
   * @param {HTMLElement} element - Le corps du tableau (tbody) où afficher le chargement.
   */
  const showLoading = (element) => {
    element.innerHTML = '<tr><td colspan="12" class="text-center p-4"><div class="spinner-border text-primary-custom" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
  };
  
  /**
   * Formate un montant en FCFA avec séparateur de milliers.
   * @param {number|string} amount - Le montant à formater.
   * @returns {string} Le montant formaté.
   */
  const formatAmount = (amount) => {
      return parseFloat(amount || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  /**
   * Récupère la liste des marchands actifs depuis l'API.
   */
  const fetchShops = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/shops?status=actif`);
      shopsCache = res.data;
    } catch (error) {
      console.error('Erreur lors du chargement des marchands:', error);
    }
  };

  /**
   * Récupère la liste des livreurs actifs depuis l'API.
   */
  const fetchDeliverymen = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users?role=livreur&status=actif`);
      deliverymenCache = res.data;
    } catch (error) {
      console.error('Erreur lors du chargement des livreurs:', error);
    }
  };

  /**
   * Récupère toutes les données des commandes et les affiche après filtrage.
   */
  const fetchAllData = async () => {
    showLoading(ordersTableBody);
    await applyFilters();
  };

  /**
   * Applique les filtres (date, recherche, statut) et met à jour le tableau.
   */
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
      
      currentPage = 1; // Réinitialiser la pagination après un nouveau filtre
      applyPaginationAndRender();
    } catch (error) {
      console.error("Erreur lors de l'application des filtres:", error);
      ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-danger p-4">Erreur lors du filtrage des données.</td></tr>`;
    }
  };
  
  /**
   * Applique la pagination aux commandes filtrées et lance le rendu du tableau.
   */
  const applyPaginationAndRender = () => {
      const totalItems = allOrders.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      
      paginatedOrders = allOrders.slice(startIndex, endIndex);
      renderOrdersTable(paginatedOrders);
      updatePaginationControls(totalItems, totalPages);
  };
  
  /**
   * Met à jour les contrôles et les informations de la pagination.
   * @param {number} totalItems - Nombre total d'éléments.
   * @param {number} totalPages - Nombre total de pages.
   */
  const updatePaginationControls = (totalItems, totalPages) => {
      paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} entrées)`;
      currentPageDisplay.textContent = currentPage;
      
      firstPageBtn.classList.toggle('disabled', currentPage === 1);
      prevPageBtn.classList.toggle('disabled', currentPage === 1);
      nextPageBtn.classList.toggle('disabled', currentPage >= totalPages);
      lastPageBtn.classList.toggle('disabled', currentPage >= totalPages);
  };
  
  /**
   * Gère le changement de page.
   * @param {number} newPage - La nouvelle page à afficher.
   */
  const handlePageChange = (newPage) => {
      const totalPages = Math.ceil(allOrders.length / itemsPerPage);
      if (newPage < 1 || newPage > totalPages) return;
      currentPage = newPage;
      applyPaginationAndRender();
  };

  /**
   * Rend les lignes du tableau des commandes.
   * @param {Array<Object>} orders - Liste des commandes à afficher.
   */
  const renderOrdersTable = (orders) => {
    ordersTableBody.innerHTML = '';
    if (!orders || orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="12" class="text-center p-3">Aucune commande trouvée.</td></tr>`;
      return;
    }

    orders.forEach((order) => {
      const row = document.createElement('tr');
      const totalArticleAmount = parseFloat(order.article_amount || 0);
      const deliveryFee = parseFloat(order.delivery_fee || 0);
      const expeditionFee = parseFloat(order.expedition_fee || 0);
      const deliverymanName = order.deliveryman_name || 'Non assigné';
      const shopName = order.shop_name || 'N/A';

      let payoutAmount = 0;
      // Logique de calcul du montant à verser
      if (order.status === 'delivered') {
        if (order.payment_status === 'cash') {
          payoutAmount = totalArticleAmount - deliveryFee - expeditionFee;
        } else if (order.payment_status === 'paid_to_supplier') {
          payoutAmount = -deliveryFee - expeditionFee;
        }
      } else if (order.status === 'failed_delivery') {
        const amountReceived = parseFloat(order.amount_received || 0);
        payoutAmount = amountReceived - deliveryFee - expeditionFee;
      } else {
        payoutAmount = 0;
      }

      const displayStatus = statusTranslations[order.status] || 'Non spécifié';
      const displayPaymentStatus = paymentTranslations[order.payment_status] || 'Non spécifié';
      const statusClass = statusColors[order.status] || 'bg-secondary text-white';
      const paymentClass = paymentColors[order.payment_status] || 'bg-secondary text-white';

      const itemTooltip =
        order.items && order.items.length > 0
          ? order.items
              .map(
                (item) =>
                  `Article: ${item.quantity} x ${item.item_name}<br>Montant: ${formatAmount(item.amount)}`
              )
              .join('<br>')
          : 'N/A';

      row.innerHTML = `
                <td class="col-checkbox"><input type="checkbox" class="order-checkbox" data-order-id="${order.id}"></td>
                <td class="col-shop">${shopName}</td>
                <td class="col-client"><span data-bs-toggle="tooltip" data-bs-html="true" title="Client: ${order.customer_name || 'N/A'}">${order.customer_phone}</span></td>
                <td class="col-location">${order.delivery_location}</td>
                <td class="col-product"><span data-bs-toggle="tooltip" data-bs-html="true" title="${itemTooltip}">${
                  order.items && order.items.length > 0 ? order.items[0].item_name : 'N/A'
                }</span></td>
                <td class="col-amount-article text-end">${formatAmount(totalArticleAmount)}</td>
                <td class="col-delivery-fee text-end">${formatAmount(deliveryFee)}</td>
                <td class="col-payout text-end">${formatAmount(payoutAmount)}</td>
                <td class="col-payment"><div class="payment-container"><i class="bi bi-circle-fill ${paymentClass}"></i>${displayPaymentStatus}</div></td>
                <td class="col-status"><div class="status-container"><i class="bi bi-circle-fill ${statusClass}"></i>${displayStatus}</div></td>
                <td class="col-deliveryman">${deliverymanName}</td>
                <td class="col-actions">
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

    // Initialisation des tooltips après le rendu
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));
  };

  /**
   * Ajoute une ligne pour un article dans les formulaires de commande (ajout/édition).
   * @param {HTMLElement} container - Le conteneur (div) des articles.
   * @param {Object} [item={}] - Les données de l'article pour pré-remplissage.
   */
  const addItemRow = (container, item = {}) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'row g-2 item-row mb-2';
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
    const nameId = `itemName-${uniqueId}`;
    const quantityId = `itemQuantity-${uniqueId}`;
    const amountId = `itemAmount-${uniqueId}`;

    itemRow.innerHTML = `
            <div class="col-md-5">
                <label for="${nameId}" class="form-label mb-1 visually-hidden">Nom article</label>
                <input type="text" class="form-control form-control-sm item-name-input" id="${nameId}" value="${item.item_name || ''}" placeholder="Nom article" required>
            </div>
            <div class="col-md-3">
                <label for="${quantityId}" class="form-label mb-1 visually-hidden">Qté</label>
                <input type="number" class="form-control form-control-sm item-quantity-input" id="${quantityId}" value="${item.quantity || 1}" min="1" required>
            </div>
            <div class="col-md-4">
                <label for="${amountId}" class="form-label mb-1 visually-hidden">Montant</label>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control item-amount-input" id="${amountId}" value="${item.amount || 0}" min="0" required>
                    <button class="btn btn-outline-danger remove-item-btn" type="button"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `;
    container.appendChild(itemRow);

    // Cache les labels des lignes suivantes pour un affichage plus compact
    if (container.children.length > 1) {
      itemRow.querySelectorAll('label').forEach((label) => label.classList.add('visually-hidden'));
    } else {
        itemRow.querySelectorAll('label').forEach((label) => label.classList.remove('visually-hidden'));
    }
  };

  /**
   * Configure le gestionnaire pour la suppression des lignes d'articles.
   * @param {HTMLElement} container - Le conteneur des articles.
   */
  const handleRemoveItem = (container) => {
    container.addEventListener('click', (e) => {
      if (e.target.closest('.remove-item-btn')) {
        const itemRow = e.target.closest('.item-row');
        if (container.children.length > 1) {
          itemRow.remove();
        } else {
            showNotification("Une commande doit avoir au moins un article.", "warning");
        }
      }
    });
  };

  /**
   * Configure la recherche dynamique pour les marchands dans un champ de formulaire.
   * @param {string} searchInputId - ID du champ de recherche.
   * @param {string} resultsContainerId - ID du conteneur des résultats.
   * @param {string} selectedIdInputId - ID du champ caché pour l'ID du marchand.
   */
  const setupShopSearch = (searchInputId, resultsContainerId, selectedIdInputId) => {
    const input = document.getElementById(searchInputId);
    const resultsContainer = document.getElementById(resultsContainerId);
    const hiddenInput = document.getElementById(selectedIdInputId);

    input.addEventListener('input', () => {
      const searchTerm = input.value.toLowerCase();
      resultsContainer.innerHTML = '';
      if (searchTerm.length > 1) {
        const filteredShops = shopsCache.filter((shop) =>
          shop.name.toLowerCase().includes(searchTerm)
        );
        if (filteredShops.length > 0) {
          filteredShops.forEach((shop) => {
            const div = document.createElement('div');
            div.className = 'p-2';
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

    // Cacher les résultats si l'utilisateur clique en dehors
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        resultsContainer.classList.add('d-none');
      }
    });
  };

  /**
   * Configure la recherche dynamique pour les livreurs.
   */
  const setupDeliverymanSearch = () => {
    const searchHandler = () => {
      const searchTerm = deliverymanSearchInput.value.toLowerCase();
      deliverymanSearchResultsContainer.innerHTML = '';
      if (searchTerm.length > 1) {
        const filteredDeliverymen = deliverymenCache.filter((dm) =>
          dm.name.toLowerCase().includes(searchTerm)
        );
        if (filteredDeliverymen.length > 0) {
          filteredDeliverymen.forEach((dm) => {
            const div = document.createElement('div');
            div.className = 'p-2';
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
          deliverymanSearchResultsContainer.innerHTML =
            '<div class="p-2 text-muted">Aucun résultat.</div>';
          deliverymanSearchResultsContainer.classList.remove('d-none');
        }
      } else {
        deliverymanSearchResultsContainer.classList.add('d-none');
      }
    };
    
    deliverymanSearchInput.addEventListener('input', searchHandler);

    deliverymanSearchResultsContainer.addEventListener('click', (e) => {
      if (e.target.dataset.id) {
        deliverymanSearchInput.value = e.target.textContent;
        assignDeliverymanIdInput.value = e.target.dataset.id;
        deliverymanSearchResultsContainer.classList.add('d-none');
      }
    });
  };

  // --- Initialisation et Événements ---

  /**
   * Configure les écouteurs d'événements principaux pour la page.
   */
  const setupEventListeners = () => {
    // Menu et déconnexion
    document.getElementById('sidebar-toggler').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('main-content').classList.toggle('expanded');
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
        // Logique de déconnexion (nettoyage du stockage local/session)
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    });
    
    // Pagination
    firstPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
    prevPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
    nextPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
    lastPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(allOrders.length / itemsPerPage)); });
    itemsPerPageSelect.addEventListener('change', (e) => { 
        itemsPerPage = parseInt(e.target.value); 
        applyPaginationAndRender(); 
    });

    // Filtres
    filterBtn.addEventListener('click', applyFilters);
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

    // Gestion des articles dans les modales
    addItemBtn.addEventListener('click', () => addItemRow(itemsContainer));
    editAddItemBtn.addEventListener('click', () => addItemRow(editItemsContainer));
    handleRemoveItem(itemsContainer);
    handleRemoveItem(editItemsContainer);
    
    // Checkbox expédition
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

    // Sélection de ligne (checkbox)
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.order-checkbox');
      checkboxes.forEach((cb) => {
        cb.checked = e.target.checked;
      });
      updateSelectedOrdersIds();
    });

    ordersTableBody.addEventListener('change', (e) => {
      if (e.target.classList.contains('order-checkbox')) {
        updateSelectedOrdersIds();
      }
    });
    
    // Soumissions de formulaires
    addShopForm.addEventListener('submit', handleAddShopSubmit);
    addOrderForm.addEventListener('submit', handleAddOrderSubmit);
    editOrderForm.addEventListener('submit', handleEditOrderSubmit);
    assignDeliveryForm.addEventListener('submit', handleAssignDeliverySubmit);
    
    // Actions sur le tableau et les boutons groupés
    ordersTableBody.addEventListener('click', handleTableActions);
    bulkActionsDropdown.addEventListener('click', handleBulkActions);
  };
  
  /**
   * Met à jour l'affichage des ID des commandes sélectionnées.
   */
  const updateSelectedOrdersIds = () => {
      const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked'))
          .map((cb) => cb.dataset.orderId);
      selectedOrdersIdsSpan.textContent = selectedIds.join(', ') || 'Aucune';
  };

  /**
   * Gère la soumission du formulaire d'ajout de marchand.
   * @param {Event} e - L'événement de soumission.
   */
  const handleAddShopSubmit = async (e) => {
    e.preventDefault();
    const shopData = {
      name: document.getElementById('newShopName').value,
      phone_number: document.getElementById('newShopPhone').value,
      bill_packaging: document.getElementById('newBillPackaging').checked,
      bill_storage: document.getElementById('newBillStorage').checked,
      packaging_price: parseFloat(document.getElementById('newPackagingPrice').value),
      storage_price: parseFloat(document.getElementById('newStoragePrice').value),
      created_by: CURRENT_USER_ID,
    };
    try {
      const response = await axios.post(`${API_BASE_URL}/shops`, shopData);
      showNotification('Marchand créé avec succès !');
      await fetchShops();
      const newShop = shopsCache.find((s) => s.id === response.data.shopId);
      if (newShop) {
        addShopSearchInput.value = newShop.name;
        addSelectedShopIdInput.value = newShop.id;
      }
      addShopModal.hide();
    } catch (error) {
      console.error('Erreur lors de la création du marchand:', error);
      showNotification(
        error.response?.data?.message || 'Erreur lors de la création du marchand.',
        'danger'
      );
    }
  };

  /**
   * Gère la soumission du formulaire d'ajout de commande.
   * @param {Event} e - L'événement de soumission.
   */
  const handleAddOrderSubmit = async (e) => {
    e.preventDefault();

    const items = Array.from(itemsContainer.querySelectorAll('.item-row')).map((row) => ({
      item_name: row.querySelector('.item-name-input').value,
      quantity: parseInt(row.querySelector('.item-quantity-input').value),
      amount: parseFloat(row.querySelector('.item-amount-input').value),
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
      created_by: CURRENT_USER_ID,
      items: items,
    };

    try {
      await axios.post(`${API_BASE_URL}/orders`, orderData);
      showNotification('Commande créée avec succès !');
      addOrderModal.hide();
      
      // Réinitialisation complète du formulaire après succès
      addOrderForm.reset(); 
      itemsContainer.innerHTML = '';
      addItemRow(itemsContainer); 
      
      await fetchAllData();
    } catch (error) {
      console.error('Erreur (ajout commande):', error);
      showNotification(error.response?.data?.message || 'Erreur lors de la création de la commande.', 'danger');
    }
  };

  /**
   * Gère la soumission du formulaire d'édition de commande.
   * @param {Event} e - L'événement de soumission.
   */
  const handleEditOrderSubmit = async (e) => {
    e.preventDefault();
    const orderId = editOrderIdInput.value;
    
    const items = Array.from(editItemsContainer.querySelectorAll('.item-row')).map((row) => ({
      item_name: row.querySelector('.item-name-input').value,
      quantity: parseInt(row.querySelector('.item-quantity-input').value),
      amount: parseFloat(row.querySelector('.item-amount-input').value),
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
      updated_by: CURRENT_USER_ID,
    };

    try {
      await axios.put(`${API_BASE_URL}/orders/${orderId}`, updatedData);
      showNotification('Commande modifiée avec succès !');
      editOrderModal.hide();
      await fetchAllData();
    } catch (error) {
      console.error('Erreur (modif commande):', error);
      showNotification(error.response?.data?.message || 'Erreur lors de la modification de la commande.', 'danger');
    }
  };

  /**
   * Gère la soumission du formulaire d'assignation de livreur.
   * @param {Event} e - L'événement de soumission.
   */
  const handleAssignDeliverySubmit = async (e) => {
    e.preventDefault();
    const deliverymanId = assignDeliverymanIdInput.value;

    if (!deliverymanId) {
      showNotification('Veuillez sélectionner un livreur valide.', 'warning');
      return;
    }

    if (currentOrdersToAssign.length === 0) {
      showNotification('Aucune commande à assigner.', 'warning');
      return;
    }

    try {
      const promises = currentOrdersToAssign.map((orderId) =>
        axios.put(`${API_BASE_URL}/orders/${orderId}/assign`, {
          deliverymanId,
          userId: CURRENT_USER_ID,
        })
      );
      await Promise.all(promises);

      showNotification(`${currentOrdersToAssign.length} commande(s) assignée(s) avec succès.`);
    } catch (error) {
      console.error(error);
      showNotification('Erreur lors de l\'assignation du livreur.', 'danger');
    } finally {
      assignDeliveryModal.hide();
      currentOrdersToAssign = [];
      await fetchAllData();
    }
  };

  /**
   * Gère les actions effectuées directement sur les lignes du tableau (boutons d'action).
   * @param {Event} e - L'événement de clic.
   */
  const handleTableActions = async (e) => {
    const target = e.target.closest('.dropdown-item');
    if (!target) return;

    const orderId = target.dataset.orderId;

    if (target.classList.contains('details-btn')) {
        await handleShowDetails(orderId);
    } else if (target.classList.contains('delete-btn')) {
        await handleDeleteOrder(orderId);
    } else if (target.classList.contains('status-delivered-btn')) {
        handleDeliveredStatusAction(orderId);
    } else if (target.classList.contains('status-failed-btn')) {
        handleFailedStatusAction(orderId);
    } else if (target.classList.contains('status-reported-btn')) {
        await handleUpdateStatus(orderId, 'reported', 'pending');
    } else if (target.classList.contains('status-cancelled-btn')) {
        await handleUpdateStatus(orderId, 'cancelled', 'cancelled');
    } else if (target.classList.contains('assign-btn')) {
        currentOrdersToAssign = [orderId];
        assignDeliveryModal.show();
        deliverymanSearchInput.value = '';
        assignDeliverymanIdInput.value = '';
    } else if (target.classList.contains('edit-btn')) {
        await handleEditOrder(orderId);
    }
  };
  
  /**
   * Gère l'affichage de la modale de détails.
   * @param {string} orderId - L'ID de la commande.
   */
  const handleShowDetails = async (orderId) => {
    try {
        const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
        const order = res.data;
        const shopName = order.shop_name || 'N/A';
        const deliverymanName = order.deliveryman_name || 'Non assigné';

        const itemsHtml = order.items.map(item => `
            <li>${item.item_name} (x${item.quantity}) - ${formatAmount(item.amount)}</li>
        `).join('');

        const historyHtml = order.history.map(hist => {
            let actionText = hist.action;
            // Tente de trouver le nom du livreur si c'est une action d'assignation
            if (hist.action.includes("Assignée")) {
                const assignedDeliveryman = deliverymenCache.find(dm => dm.id === hist.deliveryman_id);
                if (assignedDeliveryman) {
                    actionText = `Assignée au livreur : ${assignedDeliveryman.name}`;
                }
            }
            return `
                <div class="border-start border-3 ps-3 mb-2">
                    <small class="text-muted">${new Date(hist.created_at).toLocaleString()}</small>
                    <p class="mb-0">${actionText}</p>
                    <small>Par: ${hist.user_name || 'N/A'}</small>
                </div>
            `;
        }).join('');

        document.getElementById('orderDetailsContent').innerHTML = `
            <h6>Détails de la commande #${order.id}</h6>
            <ul class="list-unstyled">
                <li><strong>Marchand:</strong> ${shopName}</li>
                <li><strong>Client:</strong> ${order.customer_name} (${order.customer_phone})</li>
                <li><strong>Lieu de livraison:</strong> ${order.delivery_location}</li>
                <li><strong>Montant article:</strong> ${formatAmount(order.article_amount)}</li>
                <li><strong>Frais de livraison:</strong> ${formatAmount(order.delivery_fee)}</li>
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
        console.error("Erreur lors de la récupération des détails:", error);
        showNotification("Impossible de charger les données de la commande.", 'danger');
    }
  };

  /**
   * Gère la suppression d'une commande.
   * @param {string} orderId - L'ID de la commande.
   */
  const handleDeleteOrder = async (orderId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
        try {
            await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
            showNotification('Commande supprimée avec succès.');
            await fetchAllData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de la suppression de la commande.', 'danger');
        }
    }
  };

  /**
   * Ouvre la modale pour l'édition d'une commande.
   * @param {string} orderId - L'ID de la commande.
   */
  const handleEditOrder = async (orderId) => {
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
        
        const expeditionFeeValue = parseFloat(order.expedition_fee || 0);
        editIsExpeditionCheckbox.checked = expeditionFeeValue > 0;
        editExpeditionFeeContainer.style.display = expeditionFeeValue > 0 ? 'block' : 'none';
        editExpeditionFeeInput.value = expeditionFeeValue;
        
        const formattedDate = new Date(order.created_at).toISOString().slice(0, 16);
        editCreatedAtInput.value = formattedDate;

        editItemsContainer.innerHTML = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => addItemRow(editItemsContainer, item));
        } else {
            addItemRow(editItemsContainer); // Garantir au moins une ligne vide
        }
        editOrderModal.show();
    } catch (error) {
        console.error("Erreur lors de la récupération des données de modification:", error);
        showNotification("Impossible de charger les données de la commande.", 'danger');
    }
  };

  /**
   * Gère la mise à jour du statut d'une commande (simple mise à jour API).
   * @param {string} orderId - L'ID de la commande.
   * @param {string} status - Le nouveau statut.
   * @param {string} paymentStatus - Le nouveau statut de paiement.
   */
  const handleUpdateStatus = async (orderId, status, paymentStatus) => {
    try {
        await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { 
            status, 
            payment_status: paymentStatus, 
            userId: CURRENT_USER_ID 
        });
        showNotification(`Statut mis à jour en ${statusTranslations[status]}.`);
        await fetchAllData();
    } catch (error) {
        console.error(error);
        showNotification('Erreur lors de la mise à jour du statut.', 'danger');
    }
  };

  /**
   * Gère l'action "Livrée" (ouvre la modale de sélection de paiement).
   * @param {string} orderId - L'ID de la commande.
   */
  const handleDeliveredStatusAction = (orderId) => {
    document.getElementById('statusActionModalLabel').textContent = `Paiement pour Commande #${orderId}`;
    deliveredPaymentForm.classList.remove('d-none');
    failedDeliveryForm.classList.add('d-none');
    statusActionModal.show();

    // Nettoyage des anciens écouteurs (très important pour éviter les multiples appels)
    const paymentCashBtn = document.getElementById('paymentCashBtn');
    const paymentSupplierBtn = document.getElementById('paymentSupplierBtn');
    const newPaymentCashBtn = paymentCashBtn.cloneNode(true);
    const newPaymentSupplierBtn = paymentSupplierBtn.cloneNode(true);
    paymentCashBtn.parentNode.replaceChild(newPaymentCashBtn, paymentCashBtn);
    paymentSupplierBtn.parentNode.replaceChild(newPaymentSupplierBtn, paymentSupplierBtn);

    newPaymentCashBtn.onclick = async () => {
        await handleUpdateStatus(orderId, 'delivered', 'cash');
        statusActionModal.hide();
    };

    newPaymentSupplierBtn.onclick = async () => {
        await handleUpdateStatus(orderId, 'delivered', 'paid_to_supplier');
        statusActionModal.hide();
    };
  };

  /**
   * Gère l'action "Livraison ratée" (ouvre la modale de montant partiel).
   * @param {string} orderId - L'ID de la commande.
   */
  const handleFailedStatusAction = (orderId) => {
    document.getElementById('statusActionModalLabel').textContent = `Livraison ratée pour Commande #${orderId}`;
    deliveredPaymentForm.classList.add('d-none');
    failedDeliveryForm.classList.remove('d-none');
    statusActionModal.show();

    document.getElementById('amountReceived').value = 0;
    
    // Nettoyage des anciens écouteurs (très important)
    const newFailedDeliveryForm = failedDeliveryForm.cloneNode(true);
    failedDeliveryForm.parentNode.replaceChild(newFailedDeliveryForm, failedDeliveryForm);
    
    newFailedDeliveryForm.onsubmit = async (e) => {
        e.preventDefault();
        const amountReceived = document.getElementById('amountReceived').value;
        try {
            await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { 
                status: 'failed_delivery', 
                amount_received: amountReceived, 
                userId: CURRENT_USER_ID 
            });
            showNotification('Statut mis à jour en Livraison ratée.');
            statusActionModal.hide();
            await fetchAllData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de la mise à jour du statut.', 'danger');
        }
    };
  };

  /**
   * Gère les actions groupées (depuis le dropdown "Actions groupées").
   * @param {Event} e - L'événement de clic.
   */
  const handleBulkActions = async (e) => {
    const selectedIds = Array.from(document.querySelectorAll('.order-checkbox:checked')).map((cb) => cb.dataset.orderId);

    if (selectedIds.length === 0) {
      showNotification('Veuillez sélectionner au moins une commande.', 'warning');
      return;
    }

    const action = e.target.closest('.dropdown-item');
    if (!action) return;

    try {
      if (action.classList.contains('bulk-assign-btn')) {
        currentOrdersToAssign = selectedIds;
        assignDeliveryModal.show();
        deliverymanSearchInput.value = '';
        assignDeliverymanIdInput.value = '';
      } else if (action.classList.contains('bulk-delete-btn')) {
        if (confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} commande(s) ?`)) {
          const promises = selectedIds.map((id) => axios.delete(`${API_BASE_URL}/orders/${id}`));
          await Promise.all(promises);
          showNotification(`${selectedIds.length} commande(s) supprimée(s).`);
          await fetchAllData();
        }
      } else if (action.classList.contains('bulk-status-delivered-btn')) {
        // Logique de la modale de paiement groupé
        handleBulkDeliveredStatusAction(selectedIds);
      } else if (action.classList.contains('bulk-status-failed-btn')) {
        // Logique de la modale de livraison ratée groupée
        handleBulkFailedStatusAction(selectedIds);
      } else if (action.classList.contains('bulk-status-reported-btn')) {
        await handleBulkStatusUpdate(selectedIds, 'reported', 'pending', 'À relancer');
      } else if (action.classList.contains('bulk-status-cancel-btn')) {
        if (confirm(`Voulez-vous vraiment annuler ${selectedIds.length} commande(s) ?`)) {
          await handleBulkStatusUpdate(selectedIds, 'cancelled', 'cancelled', 'Annulée(s)');
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('Une erreur inattendue est survenue.', 'danger');
      await fetchAllData();
    }
  };
  
  /**
   * Gère l'action groupée "Livrée" (modale de sélection de paiement).
   * @param {Array<string>} selectedIds - Les ID des commandes sélectionnées.
   */
  const handleBulkDeliveredStatusAction = (selectedIds) => {
    bulkStatusActionModal.show();
    
    // Nettoyage et ré-attachement des écouteurs de la modale groupée
    const bulkPaymentCashBtn = document.getElementById('bulkPaymentCashBtn');
    const bulkPaymentSupplierBtn = document.getElementById('bulkPaymentSupplierBtn');
    const newBulkPaymentCashBtn = bulkPaymentCashBtn.cloneNode(true);
    const newBulkPaymentSupplierBtn = bulkPaymentSupplierBtn.cloneNode(true);
    bulkPaymentCashBtn.parentNode.replaceChild(newBulkPaymentCashBtn, bulkPaymentCashBtn);
    bulkPaymentSupplierBtn.parentNode.replaceChild(newBulkPaymentSupplierBtn, bulkPaymentSupplierBtn);
    
    newBulkPaymentCashBtn.onclick = async () => {
        await handleBulkStatusUpdate(selectedIds, 'delivered', 'cash', 'livrée(s) (cash)');
        bulkStatusActionModal.hide();
    };
    
    newBulkPaymentSupplierBtn.onclick = async () => {
        await handleBulkStatusUpdate(selectedIds, 'delivered', 'paid_to_supplier', 'livrée(s) (paiement marchand)');
        bulkStatusActionModal.hide();
    };
  };
  
  /**
   * Gère l'action groupée "Livraison ratée".
   * @param {Array<string>} selectedIds - Les ID des commandes sélectionnées.
   */
  const handleBulkFailedStatusAction = (selectedIds) => {
    bulkFailedDeliveryModal.show();
    
    // Nettoyage et ré-attachement de la soumission du formulaire
    const bulkFailedDeliveryForm = document.getElementById('bulkFailedDeliveryForm');
    const newBulkFailedDeliveryForm = bulkFailedDeliveryForm.cloneNode(true);
    bulkFailedDeliveryForm.parentNode.replaceChild(newBulkFailedDeliveryForm, bulkFailedDeliveryForm);
    
    newBulkFailedDeliveryForm.onsubmit = async (e) => {
        e.preventDefault();
        const amountReceived = document.getElementById('bulkAmountReceived').value;
        try {
            const promises = selectedIds.map(id =>
                axios.put(`${API_BASE_URL}/orders/${id}/status`, { 
                    status: 'failed_delivery', 
                    amount_received: amountReceived, 
                    userId: CURRENT_USER_ID 
                })
            );
            await Promise.all(promises);
            showNotification(`${selectedIds.length} commande(s) mise(s) à jour en Livraison ratée.`);
        } catch (error) {
            showNotification('Erreur lors de la mise à jour des statuts.', 'danger');
        } finally {
            bulkFailedDeliveryModal.hide();
            await fetchAllData();
        }
    };
  };

  /**
   * Met à jour le statut de plusieurs commandes via un appel API groupé.
   * @param {Array<string>} ids - Les ID des commandes.
   * @param {string} status - Le nouveau statut.
   * @param {string} paymentStatus - Le nouveau statut de paiement.
   * @param {string} successMessage - Le message de succès à afficher.
   */
  const handleBulkStatusUpdate = async (ids, status, paymentStatus, successMessage) => {
    try {
      const promises = ids.map((id) =>
        axios.put(`${API_BASE_URL}/orders/${id}/status`, {
          status: status,
          payment_status: paymentStatus,
          userId: CURRENT_USER_ID,
        })
      );
      await Promise.all(promises);
      showNotification(`${ids.length} commande(s) ${successMessage} avec succès.`);
    } catch (error) {
      showNotification(`Erreur lors de la mise à jour des statuts: ${error.message}`, 'danger');
    } finally {
      await fetchAllData();
    }
  };


  // --- INITIALISATION ---

  /**
   * Fonction principale d'initialisation de la page.
   */
  const initialize = async () => {
    // Définir les dates par défaut (aujourd'hui)
    const today = new Date().toISOString().slice(0, 10);
    startDateFilter.value = today;
    endDateFilter.value = today;
    
    // Rendre actif le lien de la sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === 'orders.html') {
            link.classList.add('active');
        }
    });

    setupEventListeners();
    
    // Charger les données de base (marchands, livreurs)
    await Promise.all([fetchShops(), fetchDeliverymen()]);
    
    // Charger et afficher les commandes
    await fetchAllData(); 

    // Configuration des recherches dynamiques
    setupShopSearch('shopSearchInput', 'searchResults', 'selectedShopId');
    setupShopSearch('editShopSearchInput', 'editSearchResults', 'editSelectedShopId');
    setupDeliverymanSearch();
    
  };

  initialize();
});