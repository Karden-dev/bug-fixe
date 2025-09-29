// js/remittances.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = 'https://app.winkexpress.online';
    const CURRENT_USER_ID = 1; // À remplacer par l'ID de l'utilisateur connecté

    // --- CACHES & ÉTAT ---
    let allRemittances = [];
    let paginatedRemittances = [];
    let currentPage = 1;
    let itemsPerPage = 25;

    // --- RÉFÉRENCES DOM ---
    const remittanceTableBody = document.getElementById('remittanceTableBody');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const filterBtn = document.getElementById('filterBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const bulkPayBtn = document.getElementById('bulkPayBtn');
    const orangeMoneyTotal = document.getElementById('orangeMoneyTotal');
    const orangeMoneyTransactions = document.getElementById('orangeMoneyTransactions');
    const mtnMoneyTotal = document.getElementById('mtnMoneyTotal');
    const mtnMoneyTransactions = document.getElementById('mtnMoneyTransactions');
    const totalRemittanceAmount = document.getElementById('totalRemittanceAmount');
    const totalTransactions = document.getElementById('totalTransactions');
    const editPaymentModal = new bootstrap.Modal(document.getElementById('editPaymentModal'));
    const editPaymentForm = document.getElementById('editPaymentForm');
    const editShopIdInput = document.getElementById('editShopId');
    const paymentNameInput = document.getElementById('paymentNameInput');
    const phoneNumberInput = document.getElementById('phoneNumberInput');
    const paymentOperatorSelect = document.getElementById('paymentOperatorSelect');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    // --- TRADUCTIONS ET COULEURS ---
    const statusTranslations = { 'pending': 'En attente', 'paid': 'Payé' };
    const statusColors = { 'pending': 'status-pending', 'paid': 'status-paid' };
    const paymentOperatorsColors = {
        'Orange Money': 'bg-orange-money-dot', // Correction de la classe
        'MTN Mobile Money': 'bg-mtn-money-dot' // Correction de la classe
    };

    // --- FONCTIONS UTILITAIRES ---
    
    /**
     * Affiche une notification toast stylisée.
     * @param {string} message - Le message à afficher.
     * @param {string} [type='success'] - Le type d'alerte (success, danger, warning, info).
     */
    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(alert);
         
        // Fermeture automatique pour l'effet "toast"
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 4000); 
    };

    /**
     * Ajoute un écouteur d'événement de manière sécurisée (vérifie l'existence de l'élément).
     * @param {HTMLElement} element - L'élément DOM.
     * @param {string} event - Le nom de l'événement.
     * @param {Function} handler - La fonction de gestion de l'événement.
     * @param {string} elementId - L'ID de l'élément pour le logging.
     */
    const addSafeEventListener = (element, event, handler, elementId) => {
        if (element) {
            element.addEventListener(event, handler);
        } else {
            // console.warn(`WinkDev Assistant: L'élément avec l'ID '#${elementId}' n'a pas été trouvé.`);
        }
    };
     
    /**
     * Formate un montant en FCFA avec séparateur de milliers.
     * @param {number|string} amount - Le montant à formater.
     * @returns {string} Le montant formaté.
     */
    const formatAmount = (amount) => {
        return parseFloat(amount || 0).toLocaleString('fr-FR') + ' FCFA';
    };

    // --- FONCTIONS PRINCIPALES ---
     
    /**
     * Récupère les versements depuis l'API en appliquant les filtres.
     */
    const fetchRemittances = async () => {
        try {
            const params = {
                search: searchInput.value,
                status: statusFilter.value
            };
            if (startDateFilter.value) params.startDate = startDateFilter.value;
            if (endDateFilter.value) params.endDate = endDateFilter.value;

            // CORRECTION: Revert vers le chemin sans /api
            const response = await axios.get(`${API_BASE_URL}/remittances`, { params });
            allRemittances = response.data.remittances;
            updateStatsCards(response.data.stats);
             
            currentPage = 1; 
            applyPaginationAndRender();
        } catch (error) {
            console.error("Erreur fetchRemittances:", error);
            remittanceTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Erreur de chargement.</td></tr>`;
            showNotification("Erreur lors du chargement des versements.", "danger");
        }
    };

    /**
     * Applique les paramètres de pagination et lance le rendu du tableau.
     */
    const applyPaginationAndRender = () => {
        const totalItems = allRemittances.length;
        itemsPerPage = parseInt(itemsPerPageSelect.value);

        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
         
        const startIndex = (currentPage - 1) * itemsPerPage;
        paginatedRemittances = allRemittances.slice(startIndex, startIndex + itemsPerPage);
         
        renderRemittanceTable(paginatedRemittances);
        updatePaginationInfo();
    };

    /**
     * Génère et affiche les lignes du tableau des versements.
     * @param {Array<Object>} remittances - Liste des versements à afficher pour la page courante.
     */
    const renderRemittanceTable = (remittances) => {
        if (!remittanceTableBody) return;
        remittanceTableBody.innerHTML = '';
         
        if (remittances.length === 0) {
            remittanceTableBody.innerHTML = `<tr><td colspan="9" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
            return;
        }
         
        const startIndex = (currentPage - 1) * itemsPerPage;

        remittances.forEach((rem, index) => {
            const row = document.createElement('tr');
            const operatorColor = paymentOperatorsColors[rem.payment_operator] || 'bg-secondary';
            const statusColor = statusColors[rem.status] || 'bg-secondary';
            const isPending = rem.status === 'pending';

            const paymentDate = moment(rem.payment_date).isValid() ? moment(rem.payment_date).format('DD/MM/YYYY') : 'Date Inconnue';

            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${rem.shop_name}</td>
                <td>${rem.payment_name || 'N/A'}</td>
                <td>${rem.phone_number_for_payment || 'N/A'}</td>
                <td>${rem.payment_operator ? `<span class="operator-dot ${operatorColor}"></span>` : ''} ${rem.payment_operator || 'N/A'}</td>
                <td class="fw-bold">${formatAmount(rem.amount)}</td>
                <td>${paymentDate}</td>
                <td>
                    <span class="status-badge-container">
                        <span class="status-dot ${statusColor}"></span>
                        ${statusTranslations[rem.status]}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-btn" data-shop-id="${rem.shop_id}" title="Modifier infos de paiement"><i class="bi bi-pencil"></i></button>
                        ${isPending ? `<button class="btn btn-outline-success pay-btn" data-id="${rem.shop_id}" title="Marquer comme Payé"><i class="bi bi-check-circle"></i></button>` : ''}
                    </div>
                </td>
            `;
            remittanceTableBody.appendChild(row);
        });
    };

    /**
     * Met à jour les cartes de statistiques en haut de page.
     * @param {Object} stats - Les statistiques agrégées.
     */
    const updateStatsCards = (stats) => {
        if (orangeMoneyTotal) orangeMoneyTotal.textContent = formatAmount(stats.orangeMoneyTotal);
        if (orangeMoneyTransactions) orangeMoneyTransactions.textContent = `${stats.orangeMoneyTransactions} trans.`;
        if (mtnMoneyTotal) mtnMoneyTotal.textContent = formatAmount(stats.mtnMoneyTotal);
        if (mtnMoneyTransactions) mtnMoneyTransactions.textContent = `${stats.mtnMoneyTransactions} trans.`;
        if (totalRemittanceAmount) totalRemittanceAmount.textContent = formatAmount(stats.totalAmount);
         
        const pendingCount = allRemittances.filter(r => r.status === 'pending').length;
        if (totalTransactions) totalTransactions.textContent = `${pendingCount} trans. en attente`;
    };
     
    /**
     * Met à jour l'affichage des informations de pagination.
     */
    const updatePaginationInfo = () => {
        const totalItems = allRemittances.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
         
        if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} entrées)`;
        if (currentPageDisplay) currentPageDisplay.textContent = currentPage;
         
        firstPageBtn?.classList.toggle('disabled', currentPage === 1);
        prevPageBtn?.classList.toggle('disabled', currentPage === 1);
        nextPageBtn?.classList.toggle('disabled', currentPage >= totalPages);
        lastPageBtn?.classList.toggle('disabled', currentPage >= totalPages);
    };
     
    /**
     * Gère le changement de page dans les contrôles de pagination.
     * @param {number} newPage - La nouvelle page à afficher.
     */
    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(allRemittances.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        applyPaginationAndRender();
    };

    /**
     * Gère les actions sur les boutons du tableau (Modifier, Payer).
     * @param {Event} e - L'événement de clic.
     */
    const handleTableActions = async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
         
        if (target.classList.contains('edit-btn')) {
            const shopId = target.dataset.shopId;
            try {
                // CORRECTION: Retrait du préfixe /api
                const { data: shop } = await axios.get(`${API_BASE_URL}/shops/${shopId}`);
                editShopIdInput.value = shop.id;
                paymentNameInput.value = shop.payment_name || '';
                phoneNumberInput.value = shop.phone_number_for_payment || '';
                paymentOperatorSelect.value = shop.payment_operator || '';
                editPaymentModal.show();
            } catch (error) { 
                showNotification("Impossible de charger les détails.", "danger"); 
            }
        } else if (target.classList.contains('pay-btn')) {
            // Rétablissement de la logique POST /record pour le paiement individuel
            const shopId = target.dataset.id; 
            const remittance = allRemittances.find(r => r.shop_id == shopId); 
            
            if (!remittance || remittance.amount <= 0) return showNotification("Erreur: Solde nul ou versement non trouvé.", "danger");
            
            if (confirm(`Confirmer le versement de ${formatAmount(remittance.amount)} à ${remittance.shop_name} ?`)) {
                try {
                    // CORRECTION: Utilisation du chemin sans /api
                    await axios.post(`${API_BASE_URL}/remittances/record`, {
                        shopId: remittance.shop_id,
                        amount: remittance.amount,
                        paymentOperator: remittance.payment_operator,
                        status: 'paid', // Paiement complet
                        userId: CURRENT_USER_ID
                    });
                    showNotification('Versement enregistré et créances soldées !');
                    fetchRemittances();
                } catch (error) {
                    showNotification(error.response?.data?.message || 'Erreur lors de l\'enregistrement du versement.', 'danger');
                }
            }
        }
    };
     
    /**
     * Gère la soumission du formulaire de modification des infos de paiement du marchand.
     * @param {Event} e - L'événement de soumission.
     */
    const handleEditPaymentSubmit = async (e) => {
        e.preventDefault();
        const shopId = editShopIdInput.value;
        const paymentData = { 
            payment_name: paymentNameInput.value, 
            phone_number_for_payment: phoneNumberInput.value, 
            payment_operator: paymentOperatorSelect.value 
        };
        try {
            // CORRECTION: Retrait du préfixe /api
            await axios.put(`${API_BASE_URL}/remittances/shop-details/${shopId}`, paymentData);
            showNotification("Informations mises à jour !");
            editPaymentModal.hide();
            await fetchRemittances();
        } catch (error) { 
            showNotification("Erreur de mise à jour.", "danger"); 
        }
    };
     
    /**
     * Gère le paiement groupé de tous les versements en attente.
     */
    const handleBulkPay = async () => {
        const pendingRemittances = allRemittances.filter(r => r.status === 'pending');
        if (pendingRemittances.length === 0) return showNotification('Aucun versement en attente.', 'info');
         
        if (confirm(`Confirmer le paiement de ${pendingRemittances.length} versements ?`)) {
            try {
                // CORRECTION: Utilisation du chemin sans /api pour le paiement groupé
                const promises = pendingRemittances.map(rem => 
                    axios.post(`${API_BASE_URL}/remittances/record`, {
                        shopId: rem.shop_id,
                        amount: rem.amount,
                        paymentOperator: rem.payment_operator,
                        status: 'paid',
                        userId: CURRENT_USER_ID
                    })
                );
                await Promise.all(promises);
                showNotification(`${pendingRemittances.length} versements ont été payés.`);
                fetchRemittances();
            } catch (error) { 
                showNotification("Erreur lors du paiement groupé.", "danger"); 
            }
        }
    };

    /**
     * Point d'entrée de l'application, initialise les écouteurs et le chargement des données.
     */
    const initializeApp = () => {
        // Définir les filtres par défaut
        if (startDateFilter) startDateFilter.value = '';
        if (endDateFilter) endDateFilter.value = '';
        if (statusFilter) statusFilter.value = "pending";
        if (itemsPerPageSelect) itemsPerPage = parseInt(itemsPerPageSelect.value);

        // --- Écouteurs d'événements ---
         
        // Sidebar et déconnexion
        addSafeEventListener(document.getElementById('sidebar-toggler'), 'click', () => {
            document.getElementById('sidebar')?.classList.toggle('collapsed');
            document.getElementById('main-content')?.classList.toggle('expanded');
        }, 'sidebar-toggler');
         
        addSafeEventListener(document.getElementById('logoutBtn'), 'click', () => { 
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            window.location.href = 'index.html'; 
        }, 'logoutBtn');
         
        // Mise en évidence du lien actif (dropdown parent)
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === 'remittances.html') {
                const parentDropdown = link.closest('.dropdown');
                if (parentDropdown) parentDropdown.querySelector('.dropdown-toggle').classList.add('active');
            }
        });


        // Filtres et recherche
        addSafeEventListener(filterBtn, 'click', fetchRemittances, 'filterBtn');
        addSafeEventListener(searchInput, 'input', fetchRemittances, 'searchInput');
        addSafeEventListener(startDateFilter, 'change', fetchRemittances, 'startDateFilter');
        addSafeEventListener(endDateFilter, 'change', fetchRemittances, 'endDateFilter');
        addSafeEventListener(statusFilter, 'change', fetchRemittances, 'statusFilter');
         
        // Actions de la table
        addSafeEventListener(remittanceTableBody, 'click', handleTableActions, 'remittanceTableBody');
        addSafeEventListener(editPaymentForm, 'submit', handleEditPaymentSubmit, 'editPaymentForm');
        addSafeEventListener(bulkPayBtn, 'click', handleBulkPay, 'bulkPayBtn');
        // CORRECTION: Retrait du préfixe /api
        addSafeEventListener(exportPdfBtn, 'click', () => window.open(`${API_BASE_URL}/remittances/export-pdf`), 'exportPdfBtn');
         
        // Pagination
        addSafeEventListener(firstPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(1); }, 'firstPage');
        addSafeEventListener(prevPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); }, 'prevPage');
        addSafeEventListener(nextPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); }, 'nextPage');
        addSafeEventListener(lastPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(allRemittances.length / itemsPerPage)); }, 'lastPage');
        addSafeEventListener(itemsPerPageSelect, 'change', (e) => { itemsPerPage = parseInt(e.target.value); applyPaginationAndRender(); }, 'itemsPerPage');
         
        // Lancement du chargement initial
        fetchRemittances();
    };

    initializeApp();
});