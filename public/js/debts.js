// js/debts.js

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://app.winkexpress.online';
    const CURRENT_USER_ID = 1;

    // --- Références DOM ---
    const debtsTableBody = document.getElementById('debtsTableBody');
    const searchInput = document.getElementById('searchInput');
    const singleDateFilter = document.getElementById('singleDateFilter'); // FILTRE DATE QUOTIDIEN
    const statusFilter = document.getElementById('statusFilter');
    const excludeDailyBalanceCheckbox = document.getElementById('excludeDailyBalance');
    const totalDisplayedDebts = document.getElementById('totalDisplayedDebts'); // TOTAL AFFICHÉ
    const filterBtn = document.getElementById('filterBtn');
    
    // Pagination
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    
    // Modale Création/Modification
    const debtModal = new bootstrap.Modal(document.getElementById('addDebtModal'));
    const debtForm = document.getElementById('debtForm');
    const debtIdInput = document.getElementById('debtId');
    const shopSearchInputModal = document.getElementById('shopSearchInputModal');
    const shopSearchResults = document.getElementById('shopSearchResults');
    const shopSelect = document.getElementById('shopSelect'); // ID caché du marchand
    const creationDateInput = document.getElementById('creationDate');
    const amountInput = document.getElementById('amountInput');
    const typeSelect = document.getElementById('typeSelect');
    const commentInput = document.getElementById('commentInput');
    const debtSubmitBtn = document.getElementById('debtSubmitBtn');
    const addDebtModalLabel = document.getElementById('addDebtModalLabel');

    let shopsCache = [];
    let allDebts = [];
    let currentPage = 1;
    let itemsPerPage = 10; 

    const statusTranslations = {
        'pending': 'En attente',
        'paid': 'Réglé'
    };
    const statusColors = {
        'pending': 'status-pending',
        'paid': 'status-paid'
    };

    // --- Fonctions utilitaires ---
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

    // --- LOGIQUE PRINCIPALE DE REQUÊTE ET RENDU ---

    const fetchAndRenderDebts = async () => {
        try {
            const singleDate = singleDateFilter.value;
            
            if (!singleDate) {
                debtsTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-3">Veuillez sélectionner une date.</td></tr>`;
                totalDisplayedDebts.textContent = '0 FCFA';
                return;
            }

            const params = {
                search: searchInput.value,
                startDate: singleDate,
                endDate: singleDate,
                status: statusFilter.value
            };
            
            // LOGIQUE DE FILTRAGE PAR EXCLUSION AMÉLIORÉE
            if (excludeDailyBalanceCheckbox && excludeDailyBalanceCheckbox.checked) {
                 // Exclut : le nouveau type, l'ancien type 'other' utilisé pour les reports, et la chaîne vide (ancien bug)
                 params.excludeType = 'daily_balance,other,'; 
            }
            
            const response = await axios.get(`${API_BASE_URL}/debts`, { params });
            allDebts = response.data;
            currentPage = 1; // Retour à la première page après un nouveau filtre
            renderDebtsTable();
        } catch (error) {
            console.error("Erreur lors de la récupération des créances:", error);
            debtsTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger p-4">Erreur lors du chargement des données.</td></tr>`;
        }
    };
    
    // Récupération initiale des marchands (pour le cache)
    const fetchShops = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/shops?status=actif`);
            shopsCache = response.data;
        } catch (error) {
            console.error("Erreur lors du chargement des marchands:", error);
        }
    };

    const renderDebtsTable = () => {
        const debts = allDebts;
        debtsTableBody.innerHTML = '';
        if (debts.length === 0) {
            debtsTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-3">Aucune créance à afficher.</td></tr>`;
            totalDisplayedDebts.textContent = '0 FCFA';
            return;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const debtsToRender = debts.slice(startIndex, endIndex);
        
        let totalAmount = 0;

        debtsToRender.forEach((debt, index) => {
            totalAmount += parseFloat(debt.amount);
            const row = document.createElement('tr');
            const statusColor = statusColors[debt.status] || 'bg-secondary';

            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${debt.shop_name}</td>
                <td class="text-danger fw-bold">${parseFloat(debt.amount).toLocaleString('fr-FR')} FCFA</td>
                <td>${debt.type}</td>
                <td>${debt.comment || 'N/A'}</td>
                <td>${moment(debt.created_at).format('DD/MM/YYYY')}</td>
                <td>
                    <span class="status-badge">
                        <span class="status-dot ${statusColor}"></span>
                        ${statusTranslations[debt.status]}
                    </span>
                </td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-gear"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item edit-btn" href="#" data-id="${debt.id}"><i class="bi bi-pencil"></i> Modifier</a></li>
                            ${debt.status === 'pending' ? `<li><a class="dropdown-item settle-btn" href="#" data-id="${debt.id}"><i class="bi bi-check-circle"></i> Régler</a></li>` : ''}
                            <li><a class="dropdown-item delete-btn text-danger" href="#" data-id="${debt.id}"><i class="bi bi-trash"></i> Supprimer</a></li>
                        </ul>
                    </div>
                </td>
            `;
            debtsTableBody.appendChild(row);
        });
        
        totalDisplayedDebts.textContent = `${totalAmount.toLocaleString('fr-FR')} FCFA`;
        updatePaginationControls();
    };

    // --- LOGIQUE DE PAGINATION ET CONTROLS ---

    const updatePaginationControls = () => {
        const totalItems = allDebts.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} créances)`;
        if (currentPageDisplay) currentPageDisplay.textContent = currentPage;
        
        const isFirst = currentPage === 1;
        const isLast = currentPage === totalPages || totalPages === 0;
        
        document.getElementById('firstPage')?.classList.toggle('disabled', isFirst);
        document.getElementById('prevPage')?.classList.toggle('disabled', isFirst);
        document.getElementById('nextPage')?.classList.toggle('disabled', isLast);
        document.getElementById('lastPage')?.classList.toggle('disabled', isLast);
    };

    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(allDebts.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        renderDebtsTable();
    };
    
    // --- GESTION DE LA RECHERCHE DYNAMIQUE DANS LA MODALE ---

    const setupShopSearchModal = () => {
        shopSearchInputModal.addEventListener('input', () => {
            const searchTerm = shopSearchInputModal.value.toLowerCase();
            shopSearchResults.innerHTML = '';
            
            if (searchTerm.length > 1) {
                const filteredShops = shopsCache.filter(shop => shop.name.toLowerCase().includes(searchTerm));
                
                if (filteredShops.length > 0) {
                    filteredShops.forEach(shop => {
                        const div = document.createElement('div');
                        div.className = 'p-2';
                        div.textContent = shop.name;
                        div.dataset.id = shop.id;
                        div.addEventListener('click', () => {
                            shopSearchInputModal.value = shop.name;
                            shopSelect.value = shop.id;
                            shopSearchResults.classList.add('d-none');
                        });
                        shopSearchResults.appendChild(div);
                    });
                    shopSearchResults.classList.remove('d-none');
                } else {
                    shopSearchResults.innerHTML = '<div class="text-muted p-2">Aucun marchand trouvé.</div>';
                    shopSearchResults.classList.remove('d-none');
                }
            } else {
                shopSearchResults.classList.add('d-none');
            }
        });

        shopSearchResults.addEventListener('click', (e) => {
            if (e.target.dataset.id) {
                shopSearchInputModal.value = e.target.textContent;
                shopSelect.value = e.target.dataset.id;
                shopSearchResults.classList.add('d-none');
            }
        });
        
        // Cacher les résultats si l'utilisateur clique en dehors
        document.addEventListener('click', (e) => {
            if (!shopSearchInputModal.contains(e.target) && !shopSearchResults.contains(e.target)) {
                shopSearchResults.classList.add('d-none');
            }
        });
    };

    // --- GESTION DES ÉVÉNEMENTS ---
    
    filterBtn.addEventListener('click', fetchAndRenderDebts);
    searchInput.addEventListener('input', fetchAndRenderDebts);
    singleDateFilter.addEventListener('change', fetchAndRenderDebts);
    statusFilter.addEventListener('change', fetchAndRenderDebts);
    excludeDailyBalanceCheckbox?.addEventListener('change', fetchAndRenderDebts);

    debtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shopId = shopSelect.value;
        if (!shopId) {
             showNotification("Veuillez sélectionner un marchand valide.", 'warning');
             return;
        }
        
        const debtData = {
            shop_id: shopId,
            amount: amountInput.value,
            type: typeSelect.value,
            comment: commentInput.value,
            created_by: CURRENT_USER_ID,
            // NOUVEAU: Ajout de la date de création personnalisée
            creation_date: creationDateInput.value 
        };

        try {
            if (debtIdInput.value) {
                // Modification (Attention: La modification de la date n'est pas supportée dans le modèle actuel)
                await axios.put(`${API_BASE_URL}/debts/${debtIdInput.value}`, debtData);
                showNotification("Créance modifiée avec succès !");
            } else {
                // Création
                await axios.post(`${API_BASE_URL}/debts`, debtData);
                showNotification("Créance ajoutée avec succès !");
            }
            debtModal.hide();
            fetchAndRenderDebts();
        } catch (error) {
            console.error("Erreur lors de la soumission de la créance:", error);
            showNotification(error.response?.data?.message || "Erreur lors de l'enregistrement de la créance.", 'danger');
        }
    });

    debtsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('a');
        if (!target) return;
        const debtId = target.dataset.id;
        
        if (target.classList.contains('edit-btn')) {
            try {
                const response = await axios.get(`${API_BASE_URL}/debts/${debtId}`);
                const debt = response.data;
                const shop = shopsCache.find(s => s.id === debt.shop_id);
                
                debtIdInput.value = debt.id;
                shopSelect.value = debt.shop_id;
                shopSearchInputModal.value = shop ? shop.name : ''; // Pré-remplir
                amountInput.value = debt.amount;
                typeSelect.value = debt.type;
                commentInput.value = debt.comment;
                creationDateInput.value = moment(debt.created_at).format('YYYY-MM-DD'); // Afficher la date
                
                addDebtModalLabel.textContent = "Modifier la créance";
                debtSubmitBtn.textContent = "Sauvegarder";
                debtModal.show();
            } catch (error) {
                showNotification("Impossible de charger les détails de la créance.", "danger");
            }
        } else if (target.classList.contains('delete-btn')) {
            if (confirm("Êtes-vous sûr de vouloir supprimer cette créance ?")) {
                try {
                    await axios.delete(`${API_BASE_URL}/debts/${debtId}`);
                    showNotification("Créance supprimée avec succès.");
                    fetchAndRenderDebts();
                } catch (error) {
                    showNotification("Erreur lors de la suppression de la créance.", "danger");
                }
            }
        } else if (target.classList.contains('settle-btn')) {
             if (confirm("Confirmer le règlement de cette créance ?")) {
                try {
                    await axios.put(`${API_BASE_URL}/debts/${debtId}/settle`, { userId: CURRENT_USER_ID });
                    showNotification("Créance réglée avec succès.");
                    fetchAndRenderDebts();
                } catch (error) {
                    showNotification("Erreur lors du règlement de la créance.", "danger");
                }
            }
        }
    });

    document.getElementById('addDebtModal').addEventListener('hidden.bs.modal', () => {
        debtForm.reset();
        debtIdInput.value = '';
        shopSelect.value = '';
        shopSearchResults.classList.add('d-none');
        addDebtModalLabel.textContent = "Ajouter une créance";
        debtSubmitBtn.textContent = "Ajouter";
    });

    // --- Initialisation de la page ---
    const initializeApp = async () => {
        const today = new Date().toISOString().slice(0, 10);
        singleDateFilter.value = today;
        creationDateInput.value = today;
        
        await fetchShops();
        setupShopSearchModal();
        fetchAndRenderDebts();

        // Gestionnaires de Pagination
        firstPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
        prevPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
        nextPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
        lastPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(allDebts.length / itemsPerPage)); });
        itemsPerPageSelect?.addEventListener('change', (e) => { itemsPerPage = parseInt(e.target.value); fetchAndRenderDebts(); });

        if (itemsPerPageSelect) itemsPerPage = parseInt(itemsPerPageSelect.value);
        
        // Logique de menu et déconnexion
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
        const currentPath = window.location.pathname.split('/').pop();
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPath) link.classList.add('active');
        });
    };
    
    initializeApp();
});