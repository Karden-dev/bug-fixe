// js/remittances.js

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:3000';
    const remittanceTableBody = document.getElementById('remittanceTableBody');
    const searchInput = document.getElementById('searchInput');
    const remittanceDate = document.getElementById('remittanceDate');
    const statusFilter = document.getElementById('statusFilter');
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

    const remittanceDetailsModal = new bootstrap.Modal(document.getElementById('remittanceDetailsModal'));
    const detailsShopName = document.getElementById('detailsShopName');
    const detailsAmountDue = document.getElementById('detailsAmountDue');
    const detailsStatusBadge = document.getElementById('detailsStatusBadge');
    const remittanceHistoryContainer = document.getElementById('remittanceHistoryContainer');
    const pendingDebtsContainer = document.getElementById('pendingDebtsContainer');

    const statusTranslations = {
        'pending': 'En attente',
        'paid': 'Payé'
    };
    const statusColors = {
        'pending': 'status-pending',
        'paid': 'status-paid'
    };

    const paymentOperatorsColors = {
        'Orange Money': 'bg-orange-money',
        'MTN Mobile Money': 'bg-mtn-money'
    };
    
    const CURRENT_USER_ID = 1;

    const showNotification = (message, type = 'success') => {
        const container = document.getElementById('notification-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    };

    const fetchRemittances = async () => {
        try {
            // Le frontend ne demande plus de date, il récupère tous les versements en attente
            const params = {
                search: searchInput.value,
                status: statusFilter.value
            };
            const response = await axios.get(`${API_BASE_URL}/remittances`, { params });
            const { remittances, stats } = response.data;
            renderRemittanceTable(remittances);
            updateStatsCards(stats);
        } catch (error) {
            console.error("Erreur lors de la récupération des versements:", error);
            remittanceTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger p-4">Erreur lors du chargement des données.</td></tr>`;
        }
    };

    const renderRemittanceTable = (remittances) => {
        remittanceTableBody.innerHTML = '';
        if (remittances.length === 0) {
            remittanceTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
            return;
        }

        remittances.forEach((rem, index) => {
            const row = document.createElement('tr');
            const operatorColor = paymentOperatorsColors[rem.payment_operator] || 'bg-secondary';
            const statusColor = statusColors[rem.status] || 'bg-secondary';
            // Formater la date du rapport pour l'affichage
            const remittanceDateFormatted = rem.remittance_date ? new Date(rem.remittance_date).toLocaleDateString('fr-FR') : 'N/A';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${rem.shop_name}</strong><br><small class="text-muted">Solde du ${remittanceDateFormatted}</small></td>
                <td>${rem.payment_name || 'N/A'}</td>
                <td>${rem.phone_number_for_payment || 'N/A'}</td>
                <td>
                    ${rem.payment_operator ? `<span class="operator-dot ${operatorColor}"></span>` : ''}
                    ${rem.payment_operator || 'N/A'}
                </td>
                <td>${rem.total_payout_amount ? rem.total_payout_amount.toLocaleString('fr-FR') : '0'} FCFA</td>
                <td>
                    <span class="status-badge">
                        <span class="status-dot ${statusColor}"></span>
                        ${statusTranslations[rem.status]}
                    </span>
                </td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-gear-fill"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item view-details-btn" href="#" data-shop-id="${rem.shop_id}"><i class="bi bi-eye"></i> Détails</a></li>
                            <li><a class="dropdown-item edit-payment-btn" href="#" data-shop-id="${rem.shop_id}"><i class="bi bi-pencil"></i> Modifier</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item full-pay-btn" href="#" data-id="${rem.id}" data-shop-name="${rem.shop_name}" data-amount="${rem.total_payout_amount}"><i class="bi bi-check-circle"></i> Payer</a></li>
                        </ul>
                    </div>
                </td>
            `;
            remittanceTableBody.appendChild(row);
        });
    };

    const updateStatsCards = (stats) => {
        orangeMoneyTotal.textContent = `${(stats.orangeMoneyTotal || 0).toLocaleString('fr-FR')} FCFA`;
        orangeMoneyTransactions.textContent = `${stats.orangeMoneyTransactions || 0} transactions`;
        mtnMoneyTotal.textContent = `${(stats.mtnMoneyTotal || 0).toLocaleString('fr-FR')} FCFA`;
        mtnMoneyTransactions.textContent = `${stats.mtnMoneyTransactions || 0} transactions`;
        totalRemittanceAmount.textContent = `${(stats.totalRemittanceAmount || 0).toLocaleString('fr-FR')} FCFA`;
        totalTransactions.textContent = `${stats.totalTransactions || 0} transactions`;
    };

    searchInput.addEventListener('input', fetchRemittances);
    statusFilter.addEventListener('change', fetchRemittances);
    
    remittanceTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('a');
        if (!target) return;

        const shopId = target.dataset.shopId;
        
        if (target.classList.contains('full-pay-btn')) {
            const remittanceId = target.dataset.id;
            const amount = parseFloat(target.dataset.amount);
            const shopName = target.dataset.shopName;

            if (confirm(`Confirmer le versement complet de ${amount.toLocaleString('fr-FR')} FCFA à ${shopName} ?`)) {
                try {
                    await axios.post(`${API_BASE_URL}/remittances/pay/${remittanceId}`, {
                        userId: CURRENT_USER_ID
                    });
                    showNotification("Versement complet enregistré avec succès !");
                    await fetchRemittances();
                } catch (error) {
                    console.error("Erreur lors de l'enregistrement du versement:", error);
                    showNotification("Erreur lors de l'enregistrement du versement.", "danger");
                }
            }
        } else if (target.classList.contains('edit-payment-btn')) {
            try {
                const response = await axios.get(`${API_BASE_URL}/shops/${shopId}`);
                const shop = response.data;
                editShopIdInput.value = shop.id;
                paymentNameInput.value = shop.payment_name || '';
                phoneNumberInput.value = shop.phone_number_for_payment || '';
                paymentOperatorSelect.value = shop.payment_operator || '';
                editPaymentModal.show();
            } catch (error) {
                console.error("Erreur lors de la récupération des détails du marchand:", error);
                showNotification("Impossible de charger les détails du marchand.", "danger");
            }
        } else if (target.classList.contains('view-details-btn')) {
            // ... (logique existante)
        }
    });

    editPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shopId = editShopIdInput.value;
        const paymentData = {
            payment_name: paymentNameInput.value,
            phone_number_for_payment: phoneNumberInput.value,
            payment_operator: paymentOperatorSelect.value
        };
        try {
            await axios.put(`${API_BASE_URL}/remittances/shop-details/${shopId}`, paymentData);
            showNotification("Informations de paiement mises à jour !");
            editPaymentModal.hide();
            await fetchRemittances();
        } catch (error) {
            console.error("Erreur lors de la mise à jour:", error);
            showNotification("Erreur lors de la mise à jour des informations de paiement.", "danger");
        }
    });

    bulkPayBtn.addEventListener('click', async () => {
        const { data } = await axios.get(`${API_BASE_URL}/remittances`, { params: { status: 'pending' } });
        const pendingRemittances = data.remittances;

        if (pendingRemittances.length === 0) {
            showNotification('Aucun versement en attente.', 'info');
            return;
        }

        if (confirm(`Confirmer le versement de ${pendingRemittances.length} marchands ?`)) {
            try {
                const bulkPayPromises = pendingRemittances.map(rem =>
                    axios.post(`${API_BASE_URL}/remittances/pay/${rem.id}`, {
                        userId: CURRENT_USER_ID
                    })
                );
                await Promise.all(bulkPayPromises);
                showNotification(`Versement de ${pendingRemittances.length} marchands effectué avec succès.`);
                await fetchRemittances();
            } catch (error) {
                console.error("Erreur lors des versements groupés:", error);
                showNotification("Erreur lors des versements groupés. Veuillez réessayer.", "danger");
            }
        }
    });

    // ... (le reste du fichier, y compris initPage, reste le même)
    
    const initPage = () => {
        fetchRemittances();

        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const sidebarToggler = document.getElementById('sidebar-toggler');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (sidebarToggler) {
            sidebarToggler.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    };

    initPage();
});