// js/remittances.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = 'https://app.winkexpress.online';

    const CURRENT_USER_ID = 1;

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
    const paymentOperatorsColors = { 'Orange Money': 'bg-orange-money', 'MTN Mobile Money': 'bg-mtn-money' };

    // --- FONCTIONS UTILITAIRES ---
    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 4000);
    };

    const addSafeEventListener = (element, event, handler, elementId) => {
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`WinkDev Assistant: L'élément avec l'ID '#${elementId}' n'a pas été trouvé.`);
        }
    };

    // --- FONCTIONS PRINCIPALES ---
    const fetchRemittances = async () => {
        try {
            const params = {
                search: searchInput.value,
                status: statusFilter.value
            };
            if (startDateFilter.value) params.startDate = startDateFilter.value;
            if (endDateFilter.value) params.endDate = endDateFilter.value;

            const response = await axios.get(`${API_BASE_URL}/remittances`, { params });
            allRemittances = response.data.remittances;
            updateStatsCards(response.data.stats);
            applyPaginationAndRender();
        } catch (error) {
            console.error("Erreur fetchRemittances:", error);
            remittanceTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Erreur de chargement.</td></tr>`;
        }
    };

    const applyPaginationAndRender = () => {
        currentPage = 1;
        paginatedRemittances = [...allRemittances];
        renderRemittanceTable();
        updatePaginationInfo();
    };

    const renderRemittanceTable = () => {
        if (!remittanceTableBody) return;
        remittanceTableBody.innerHTML = '';
        if (paginatedRemittances.length === 0) {
            remittanceTableBody.innerHTML = `<tr><td colspan="9" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
            return;
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        const remittancesToRender = paginatedRemittances.slice(startIndex, startIndex + itemsPerPage);
        remittancesToRender.forEach((rem, index) => {
            const row = document.createElement('tr');
            const operatorColor = paymentOperatorsColors[rem.payment_operator] || 'bg-secondary';
            const statusColor = statusColors[rem.status] || 'bg-secondary';
            const isPending = rem.status === 'pending';

            // CORRECTION: Assure que la date est valide avant de la formater
            const paymentDate = moment(rem.payment_date).isValid() ? moment(rem.payment_date).format('DD/MM/YYYY') : 'Date Inconnue';

            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${rem.shop_name}</td>
                <td>${rem.payment_name || 'N/A'}</td>
                <td>${rem.phone_number_for_payment || 'N/A'}</td>
                <td>${rem.payment_operator ? `<span class="operator-dot ${operatorColor}"></span>` : ''} ${rem.payment_operator || 'N/A'}</td>
                <td class="fw-bold">${parseFloat(rem.amount || 0).toLocaleString('fr-FR')} FCFA</td>
                <td>${paymentDate}</td>
                <td>
                    <span class="d-flex align-items-center">
                        <span class="status-dot ${statusColor}"></span>
                        ${statusTranslations[rem.status]}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-btn" data-shop-id="${rem.shop_id}" title="Modifier infos de paiement"><i class="bi bi-pencil"></i></button>
                        ${isPending ? `<button class="btn btn-outline-success pay-btn" data-id="${rem.id}" title="Marquer comme Payé"><i class="bi bi-check-circle"></i></button>` : ''}
                    </div>
                </td>
            `;
            remittanceTableBody.appendChild(row);
        });
    };

    const updateStatsCards = (stats) => {
        if (orangeMoneyTotal) orangeMoneyTotal.textContent = `${stats.orangeMoneyTotal.toLocaleString('fr-FR')} FCFA`;
        if (orangeMoneyTransactions) orangeMoneyTransactions.textContent = `${stats.orangeMoneyTransactions} trans.`;
        if (mtnMoneyTotal) mtnMoneyTotal.textContent = `${stats.mtnMoneyTotal.toLocaleString('fr-FR')} FCFA`;
        if (mtnMoneyTransactions) mtnMoneyTransactions.textContent = `${stats.mtnMoneyTransactions} trans.`;
        if (totalRemittanceAmount) totalRemittanceAmount.textContent = `${stats.totalAmount.toLocaleString('fr-FR')} FCFA`;
        if (totalTransactions) totalTransactions.textContent = `${allRemittances.filter(r => r.status === 'pending').length} trans. en attente`;
    };
    
    const updatePaginationInfo = () => {
        const totalItems = paginatedRemittances.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} entrées)`;
        if (currentPageDisplay) currentPageDisplay.textContent = currentPage;
        firstPageBtn?.classList.toggle('disabled', currentPage === 1);
        prevPageBtn?.classList.toggle('disabled', currentPage === 1);
        nextPageBtn?.classList.toggle('disabled', currentPage >= totalPages);
        lastPageBtn?.classList.toggle('disabled', currentPage >= totalPages);
    };
    
    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(paginatedRemittances.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        renderRemittanceTable();
        updatePaginationInfo();
    };

    const initializeApp = () => {
        if (startDateFilter) startDateFilter.value = '';
        if (endDateFilter) endDateFilter.value = '';
        if (statusFilter) statusFilter.value = "pending";
        if (itemsPerPageSelect) itemsPerPage = parseInt(itemsPerPageSelect.value);

        addSafeEventListener(filterBtn, 'click', fetchRemittances, 'filterBtn');
        addSafeEventListener(searchInput, 'input', fetchRemittances, 'searchInput');
        addSafeEventListener(startDateFilter, 'change', fetchRemittances, 'startDateFilter');
        addSafeEventListener(endDateFilter, 'change', fetchRemittances, 'endDateFilter');
        addSafeEventListener(statusFilter, 'change', fetchRemittances, 'statusFilter');
        addSafeEventListener(remittanceTableBody, 'click', handleTableActions, 'remittanceTableBody');
        addSafeEventListener(editPaymentForm, 'submit', handleEditPaymentSubmit, 'editPaymentForm');
        addSafeEventListener(bulkPayBtn, 'click', handleBulkPay, 'bulkPayBtn');
        addSafeEventListener(exportPdfBtn, 'click', () => window.open(`${API_BASE_URL}/remittances/export-pdf`), 'exportPdfBtn');
        addSafeEventListener(firstPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(1); }, 'firstPage');
        addSafeEventListener(prevPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); }, 'prevPage');
        addSafeEventListener(nextPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); }, 'nextPage');
        addSafeEventListener(lastPageBtn, 'click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(paginatedRemittances.length / itemsPerPage)); }, 'lastPage');
        addSafeEventListener(itemsPerPageSelect, 'change', (e) => { itemsPerPage = parseInt(e.target.value); applyPaginationAndRender(); }, 'itemsPerPage');
        
        const sidebarToggler = document.getElementById('sidebar-toggler');
        addSafeEventListener(sidebarToggler, 'click', () => {
            document.getElementById('sidebar')?.classList.toggle('collapsed');
            document.getElementById('main-content')?.classList.toggle('expanded');
        }, 'sidebar-toggler');
        
        const logoutBtn = document.getElementById('logoutBtn');
        addSafeEventListener(logoutBtn, 'click', () => { window.location.href = 'index.html'; }, 'logoutBtn');
        
        fetchRemittances();
    };
    
    async function handleTableActions(e) {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.classList.contains('edit-btn')) {
            const shopId = target.dataset.shopId;
            try {
                const { data: shop } = await axios.get(`${API_BASE_URL}/shops/${shopId}`);
                editShopIdInput.value = shop.id;
                paymentNameInput.value = shop.payment_name || '';
                phoneNumberInput.value = shop.phone_number_for_payment || '';
                paymentOperatorSelect.value = shop.payment_operator || '';
                editPaymentModal.show();
            } catch (error) { showNotification("Impossible de charger les détails.", "danger"); }
        } else if (target.classList.contains('pay-btn')) {
            const remittanceId = target.dataset.id;
            if (confirm('Confirmer le paiement ? Ceci soldera toutes les créances du marchand.')) {
                try {
                    await axios.put(`${API_BASE_URL}/remittances/${remittanceId}/pay`, { userId: CURRENT_USER_ID });
                    showNotification('Versement payé avec succès !');
                    fetchRemittances();
                } catch (error) {
                    const msg = error.response?.data?.message || 'Erreur lors de la mise à jour.';
                    showNotification(msg, 'danger');
                }
            }
        }
    }
    
    async function handleEditPaymentSubmit(e) {
        e.preventDefault();
        const shopId = editShopIdInput.value;
        const paymentData = { payment_name: paymentNameInput.value, phone_number_for_payment: phoneNumberInput.value, payment_operator: paymentOperatorSelect.value };
        try {
            await axios.put(`${API_BASE_URL}/remittances/shop-details/${shopId}`, paymentData);
            showNotification("Informations mises à jour !");
            editPaymentModal.hide();
            await fetchRemittances();
        } catch (error) { showNotification("Erreur de mise à jour.", "danger"); }
    }
    
    async function handleBulkPay() {
        const pendingRemittances = allRemittances.filter(r => r.status === 'pending');
        if (pendingRemittances.length === 0) return showNotification('Aucun versement en attente.', 'info');
        if (confirm(`Confirmer le paiement de ${pendingRemittances.length} versements ?`)) {
            try {
                const promises = pendingRemittances.map(rem => axios.put(`${API_BASE_URL}/remittances/${rem.id}/pay`, { userId: CURRENT_USER_ID }));
                await Promise.all(promises);
                showNotification(`${pendingRemittances.length} versements ont été payés.`);
                fetchRemittances();
            } catch (error) { showNotification("Erreur lors du paiement groupé.", "danger"); }
        }
    }

    initializeApp();
});