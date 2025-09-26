// js/remittances.js

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http:localhost:3000';
    const CURRENT_USER_ID = 1;

    // --- DOM Elements (alignés avec votre HTML) ---
    const remittanceTableBody = document.getElementById('remittanceTableBody');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const statusFilter = document.getElementById('statusFilter');
    const filterBtn = document.getElementById('filterBtn');
    const bulkPayBtn = document.getElementById('bulkPayBtn');
    
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');

    const orangeMoneyTotal = document.getElementById('orangeMoneyTotal');
    const orangeMoneyTransactions = document.getElementById('orangeMoneyTransactions');
    const mtnMoneyTotal = document.getElementById('mtnMoneyTotal');
    const mtnMoneyTransactions = document.getElementById('mtnMoneyTransactions');
    const totalRemittanceAmount = document.getElementById('totalRemittanceAmount');
    const totalTransactions = document.getElementById('totalTransactions');

    // --- Modals ---
    const editPaymentModal = new bootstrap.Modal(document.getElementById('editPaymentModal'));
    const remittanceDetailsModal = new bootstrap.Modal(document.getElementById('remittanceDetailsModal'));

    // --- État de l'application ---
    let allRemittances = [];
    let filteredRemittances = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const fetchAllData = async () => {
        try {
            // Assurer que les soldes du jour sont calculés
            const today = new Date().toISOString().split('T')[0];
            await axios.get(`${API_BASE_URL}/reports`, { params: { date: today } });

            // Récupérer tous les versements
            const response = await axios.get(`${API_BASE_URL}/remittances`);
            allRemittances = response.data.remittances;
            applyFiltersAndRender();
        } catch (error) {
            console.error("Erreur lors de la récupération des versements:", error);
            remittanceTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
        }
    };
    
    const applyFiltersAndRender = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const status = statusFilter.value;
        const startDate = startDateFilter.value;
        const endDate = endDateFilter.value;

        filteredRemittances = allRemittances.filter(rem => {
            const matchesSearch = rem.shop_name.toLowerCase().includes(searchTerm) || (rem.payment_name && rem.payment_name.toLowerCase().includes(searchTerm));
            const matchesStatus = status ? rem.status === status : true;
            
            let matchesDate = true;
            if (startDate && endDate && rem.remittance_date) {
                matchesDate = rem.remittance_date >= startDate && rem.remittance_date <= endDate;
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        updateStatsCards(filteredRemittances.filter(r => r.status === 'pending'));
        currentPage = 1;
        renderPage();
    };

    const renderPage = () => {
        remittanceTableBody.innerHTML = '';
        if (filteredRemittances.length === 0) {
            remittanceTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
            updatePaginationControls(0);
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredRemittances.slice(startIndex, endIndex);

        pageItems.forEach((rem, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${rem.shop_name}</td>
                <td>${rem.payment_name || 'N/A'}</td>
                <td>${rem.phone_number_for_payment || 'N/A'}</td>
                <td>${rem.payment_operator || 'N/A'}</td>
                <td>${(rem.amount || 0).toLocaleString('fr-FR')} FCFA</td>
                <td><span class="badge bg-${rem.status === 'pending' ? 'warning' : 'success'} text-dark">${rem.status}</span></td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item view-details-btn" href="#" data-shop-id="${rem.shop_id}">Détails</a></li>
                            <li><a class="dropdown-item edit-payment-btn" href="#" data-shop-id="${rem.shop_id}">Modifier Infos</a></li>
                            ${rem.status === 'pending' ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item full-pay-btn" href="#" data-id="${rem.id}" data-shop-name="${rem.shop_name}" data-amount="${rem.amount}">Payer</a></li>` : ''}
                        </ul>
                    </div>
                </td>
            `;
            remittanceTableBody.appendChild(row);
        });
        updatePaginationControls(filteredRemittances.length);
    };

    const updateStatsCards = (pendingRemittances) => {
        let stats = {
            orangeMoneyTotal: 0, orangeMoneyTransactions: 0,
            mtnMoneyTotal: 0, mtnMoneyTransactions: 0,
            totalRemittanceAmount: 0, totalTransactions: pendingRemittances.length
        };

        pendingRemittances.forEach(rem => {
            const amount = parseFloat(rem.amount);
            if (rem.payment_operator === 'Orange Money') {
                stats.orangeMoneyTotal += amount;
                stats.orangeMoneyTransactions++;
            } else if (rem.payment_operator === 'MTN Mobile Money') {
                stats.mtnMoneyTotal += amount;
                stats.mtnMoneyTransactions++;
            }
            stats.totalRemittanceAmount += amount;
        });

        orangeMoneyTotal.textContent = `${stats.orangeMoneyTotal.toLocaleString('fr-FR')} FCFA`;
        orangeMoneyTransactions.textContent = `${stats.orangeMoneyTransactions} transactions`;
        mtnMoneyTotal.textContent = `${stats.mtnMoneyTotal.toLocaleString('fr-FR')} FCFA`;
        mtnMoneyTransactions.textContent = `${stats.mtnMoneyTransactions} transactions`;
        totalRemittanceAmount.textContent = `${stats.totalRemittanceAmount.toLocaleString('fr-FR')} FCFA`;
        totalTransactions.textContent = `${stats.totalTransactions} transactions`;
    };

    const updatePaginationControls = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} versements)`;
        currentPageDisplay.textContent = currentPage;

        firstPageBtn.parentElement.classList.toggle('disabled', currentPage === 1);
        prevPageBtn.parentElement.classList.toggle('disabled', currentPage === 1);
        nextPageBtn.parentElement.classList.toggle('disabled', currentPage === totalPages);
        lastPageBtn.parentElement.classList.toggle('disabled', currentPage === totalPages);
    };
    
    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(filteredRemittances.length / itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderPage();
        }
    };

    // --- Event Listeners ---
    filterBtn.addEventListener('click', applyFiltersAndRender);
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        handlePageChange(1);
    });

    firstPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
    prevPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
    nextPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
    lastPageBtn.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(filteredRemittances.length / itemsPerPage)); });

    remittanceTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('a');
        if (!target) return;

        if (target.classList.contains('full-pay-btn')) {
            const remittanceId = target.dataset.id;
            const shopName = target.dataset.shopName;
            const amount = parseFloat(target.dataset.amount);

            if (confirm(`Confirmer le versement de ${amount.toLocaleString('fr-FR')} FCFA à ${shopName} ?`)) {
                try {
                    await axios.post(`${API_BASE_URL}/remittances/pay/${remittanceId}`, { userId: CURRENT_USER_ID });
                    showNotification("Versement enregistré avec succès !");
                    await fetchAllData();
                } catch (error) {
                    showNotification("Erreur lors du paiement.", 'danger');
                }
            }
        }
        // ... Logique pour les autres boutons
    });

    bulkPayBtn.addEventListener('click', async () => {
        const pendingRemittances = filteredRemittances.filter(r => r.status === 'pending');
        if (pendingRemittances.length === 0) {
            showNotification("Aucun versement en attente à payer pour les filtres actuels.", 'info');
            return;
        }
        if (confirm(`Confirmer le versement de ${pendingRemittances.length} marchands ?`)) {
            try {
                const promises = pendingRemittances.map(rem => 
                    axios.post(`${API_BASE_URL}/remittances/pay/${rem.id}`, { userId: CURRENT_USER_ID })
                );
                await Promise.all(promises);
                showNotification(`${pendingRemittances.length} versements enregistrés avec succès.`);
                await fetchAllData();
            } catch (error) {
                showNotification("Erreur lors du paiement groupé.", "danger");
            }
        }
    });

    const initPage = () => {
        const today = new Date().toISOString().split('T')[0];
        startDateFilter.value = today;
        endDateFilter.value = today;
        fetchAndRenderAll();

        const sidebarToggler = document.getElementById('sidebar-toggler');
        const logoutBtn = document.getElementById('logoutBtn');
        if (sidebarToggler) {
            sidebarToggler.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('collapsed');
                document.getElementById('main-content').classList.toggle('expanded');
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
        }
    };

    initPage();
});