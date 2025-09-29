// js/reports.js
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://app.winkexpress.online';

    // --- RÉFÉRENCES DOM ---
    const reportDateInput = document.getElementById('reportDate');
    const searchMerchantInput = document.getElementById('searchMerchantInput');
    const reportsTableBody = document.getElementById('reportsTableBody');
    const totalRemittanceAmount = document.getElementById('totalRemittanceAmount');
    const totalPackagingAmount = document.getElementById('totalPackagingAmount');
    const totalStorageAmount = document.getElementById('totalStorageAmount');
    const totalDebtAmount = document.getElementById('totalDebtAmount');
    const totalActiveMerchants = document.getElementById('totalActiveMerchants');
    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    const paginationInfo = document.getElementById('paginationInfo');
    const firstPageBtn = document.getElementById('firstPage');
    const prevPageBtn = document.getElementById('prevPage');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const nextPageBtn = document.getElementById('nextPage');
    const lastPageBtn = document.getElementById('lastPage');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    const processStorageBtn = document.getElementById('processStorageBtn');

    // --- Caches de données et état ---
    let allReports = [];
    let filteredReports = [];
    let currentPage = 1;
    let itemsPerPage = 10;

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
     * Formate un montant en FCFA avec séparateur de milliers.
     * @param {number|string} amount - Le montant à formater.
     * @returns {string} Le montant formaté.
     */
    const formatAmount = (amount) => `${parseFloat(amount || 0).toLocaleString('fr-FR')} FCFA`;
    
    /**
     * Affiche un indicateur de chargement dans le tableau.
     * @param {HTMLElement} element - Le corps du tableau (tbody) où afficher le chargement.
     */
    const showLoading = (element) => {
        element.innerHTML = '<tr><td colspan="11" class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Chargement...</span></div></td></tr>';
    };

    // --- FONCTIONS PRINCIPALES ---

    /**
     * Récupère les rapports journaliers pour la date sélectionnée.
     * @param {string} date - La date au format AAAA-MM-JJ.
     */
    const fetchReports = async (date) => {
        if (!date) {
            reportsTableBody.innerHTML = '<tr><td colspan="11" class="text-center">Veuillez sélectionner une date pour afficher les rapports.</td></tr>';
            updateGlobalTotals([]);
            return;
        }
        try {
            showLoading(reportsTableBody);
            const res = await axios.get(`${API_BASE_URL}/reports`, { params: { date } });
            allReports = res.data;
            applyFiltersAndRender();
        } catch (error) {
            reportsTableBody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Erreur lors du chargement des rapports.</td></tr>';
            showNotification("Erreur lors du chargement des rapports.", 'danger');
        }
    };

    /**
     * Applique le filtre de recherche au rapport complet et met à jour l'affichage.
     */
    const applyFiltersAndRender = () => {
        const searchTerm = searchMerchantInput.value.toLowerCase();
        filteredReports = allReports.filter(report => report.shop_name.toLowerCase().includes(searchTerm));
        currentPage = 1;
        renderReportsTable(filteredReports);
        updatePaginationInfo(filteredReports.length);
        updateGlobalTotals(allReports);
    };

    /**
     * Génère et affiche les lignes du tableau des rapports.
     * @param {Array<Object>} reports - La liste des rapports à afficher.
     */
    const renderReportsTable = (reports) => {
        reportsTableBody.innerHTML = '';
        if (reports.length === 0) {
            reportsTableBody.innerHTML = `<tr><td colspan="11" class="text-center">Aucun rapport trouvé pour les filtres actuels.</td></tr>`;
            return;
        }
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const reportsToRender = reports.slice(startIndex, endIndex);
        
        reportsToRender.forEach((report, index) => {
            const row = document.createElement('tr');
            const rank = startIndex + index + 1;
            // Utilisation d'une classe pour les montants négatifs (Créances)
            const amountToRemitClass = report.amount_to_remit < 0 ? 'text-danger fw-bold' : 'text-success fw-bold';
            
            row.innerHTML = `
                <td>${rank}.</td>
                <td>${report.shop_name}</td>
                <td>${report.total_orders_sent || 0}</td>
                <td>${report.total_orders_delivered || 0}</td>
                <td class="text-end">${formatAmount(report.total_revenue_articles)}</td>
                <td class="text-end">${formatAmount(report.total_delivery_fees)}</td>
                <td class="text-end">${formatAmount(report.total_expedition_fees)}</td>
                <td class="text-end">${formatAmount(report.total_packaging_fees)}</td>
                <td class="text-end">${formatAmount(report.total_storage_fees)}</td>
                <td class="text-end ${amountToRemitClass}">${formatAmount(report.amount_to_remit)}</td>
                <td>
                    <button class="btn btn-sm btn-info copy-report-btn" data-shop-id="${report.shop_id}" title="Copier le rapport détaillé">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </td>`;
            reportsTableBody.appendChild(row);
        });
    };

    /**
     * Met à jour les cartes de statistiques globales (Totaux Versements, Créances, etc.).
     * @param {Array<Object>} reports - La liste complète des rapports.
     */
    const updateGlobalTotals = (reports) => {
        let totalRemit = 0;
        let totalDebt = 0;
        let totalPackaging = 0;
        let totalStorage = 0;
        let activeMerchantsCount = 0;

        reports.forEach(report => {
            if (report.total_orders_sent > 0) {
                activeMerchantsCount++;
            }
            
            totalPackaging += parseFloat(report.total_packaging_fees || 0);
            totalStorage += parseFloat(report.total_storage_fees || 0);

            const amountToRemit = parseFloat(report.amount_to_remit || 0);
            if (amountToRemit > 0) {
                totalRemit += amountToRemit;
            } else if (amountToRemit < 0) {
                totalDebt += Math.abs(amountToRemit);
            }
        });

        totalActiveMerchants.textContent = activeMerchantsCount;
        totalRemittanceAmount.textContent = formatAmount(totalRemit);
        totalDebtAmount.textContent = formatAmount(totalDebt);
        totalPackagingAmount.textContent = formatAmount(totalPackaging);
        totalStorageAmount.textContent = formatAmount(totalStorage);
    };

    /**
     * Met à jour les contrôles et les informations de la pagination.
     * @param {number} totalItems - Nombre total d'éléments.
     */
    const updatePaginationInfo = (totalItems) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (paginationInfo) paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${totalItems} marchands)`;
        
        currentPageDisplay.textContent = currentPage;
        firstPageBtn.classList.toggle('disabled', currentPage === 1);
        prevPageBtn.classList.toggle('disabled', currentPage === 1);
        nextPageBtn.classList.toggle('disabled', currentPage >= totalPages || totalPages === 0);
        lastPageBtn.classList.toggle('disabled', currentPage >= totalPages || totalPages === 0);
    };

    /**
     * Gère le changement de page.
     * @param {number} newPage - La nouvelle page à afficher.
     */
    const handlePageChange = (newPage) => {
        const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        currentPage = newPage;
        renderReportsTable(filteredReports);
        updatePaginationInfo(filteredReports.length);
    };

    /**
     * Initialise la page, les filtres et les écouteurs d'événements.
     */
    const initializePage = () => {
        // Définir la date par défaut à aujourd'hui
        const today = new Date().toISOString().slice(0, 10);
        if (reportDateInput) {
            reportDateInput.value = today;
            itemsPerPage = parseInt(itemsPerPageSelect.value); // Initialiser itemsPerPage
            fetchReports(today);
        }
        
        // --- Écouteurs pour la navigation et les filtres ---
        
        sidebarToggler?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
            mainContent?.classList.toggle('expanded');
        });
        
        logoutBtn?.addEventListener('click', () => { 
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            window.location.href = 'index.html'; 
        });
        
        // Mise en évidence du lien actif
        const currentPath = window.location.pathname.split('/').pop();
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPath) link.classList.add('active');
        });

        // Écouteurs de filtres
        itemsPerPageSelect?.addEventListener('change', (e) => { itemsPerPage = parseInt(e.target.value); applyFiltersAndRender(); });
        reportDateInput?.addEventListener('change', () => fetchReports(reportDateInput.value));
        searchMerchantInput?.addEventListener('input', applyFiltersAndRender);
        
        // Écouteurs de pagination
        firstPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(1); });
        prevPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage - 1); });
        nextPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(currentPage + 1); });
        lastPageBtn?.addEventListener('click', (e) => { e.preventDefault(); handlePageChange(Math.ceil(filteredReports.length / itemsPerPage)); });

        // --- GESTION DES ACTIONS (Boutons) ---
        
        // Copier le rapport détaillé
        reportsTableBody?.addEventListener('click', async (e) => {
            const button = e.target.closest('.copy-report-btn');
            if (!button) return;
            
            const shopId = button.dataset.shopId;
            const reportDate = reportDateInput.value;
            if (!reportDate || !shopId) return showNotification('Impossible de générer le rapport sans date ou marchand.', 'warning');
            
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            button.disabled = true;
            
            try {
                const res = await axios.get(`${API_BASE_URL}/reports/detailed`, { params: { date: reportDate, shopId } });
                const reportDetails = res.data;
                const formattedDate = new Date(reportDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                
                let reportContent = `*Rapport du :* ${formattedDate}\n`;
                reportContent += `*Magasin :* ${reportDetails.shop_name}\n\n`;
                reportContent += `*--- DETAIL DES LIVRAISONS ---*\n\n`;

                if (reportDetails.orders && reportDetails.orders.length > 0) {
                    reportDetails.orders.forEach((order, index) => {
                        const productsList = order.products_list || 'Produit non spécifié';
                        const clientPhoneFormatted = order.customer_phone ? order.customer_phone.substring(0, 6) + '***' : 'N/A';
                        reportContent += `*${index + 1})* Produit(s) : ${productsList}\n`;
                        reportContent += `   Quartier : ${order.delivery_location}\n`;
                        reportContent += `   Client : ${clientPhoneFormatted}\n`;
                        const amountToDisplay = order.status === 'failed_delivery' ? parseFloat(order.amount_received || 0) : order.article_amount;
                        reportContent += `   Montant perçu : ${formatAmount(amountToDisplay)}\n`;
                        reportContent += `   Frais de livraison : ${formatAmount(order.delivery_fee)}\n`;
                        if (order.status === 'failed_delivery') {
                           reportContent += `   *Statut :* Livraison ratée\n`;
                        }
                        reportContent += "\n";
                    });
                } else {
                    reportContent += "Aucune livraison enregistrée pour cette journée.\n\n";
                }

                reportContent += `*--- RÉSUMÉ FINANCIER ---*\n`;
                reportContent += `*Total encaissement (Cash/Raté) :* ${formatAmount(reportDetails.total_revenue_articles)}\n`;
                reportContent += `*Total Frais de livraison :* ${formatAmount(reportDetails.total_delivery_fees)}\n`;
                if (parseFloat(reportDetails.total_packaging_fees) > 0) {
                    reportContent += `*Total Frais d'emballage :* ${formatAmount(reportDetails.total_packaging_fees)}\n`;
                }
                if (parseFloat(reportDetails.total_storage_fees) > 0) {
                    reportContent += `*Total Frais de stockage (jour) :* ${formatAmount(reportDetails.total_storage_fees)}\n`;
                }
                if (parseFloat(reportDetails.total_expedition_fees) > 0) {
                    reportContent += `*Total Frais d'expédition :* ${formatAmount(reportDetails.total_expedition_fees)}\n`;
                }
                reportContent += `\n*MONTANT NET À VERSER :* ${formatAmount(reportDetails.amount_to_remit)}\n`;
                
                await navigator.clipboard.writeText(reportContent);
                showNotification(`Le rapport détaillé pour "${reportDetails.shop_name}" a été copié !`);
            } catch (error) {
                console.error("Erreur lors de la génération du rapport détaillé:", error);
                showNotification('Erreur lors de la génération du rapport détaillé.', 'danger');
            } finally {
                button.innerHTML = '<i class="bi bi-clipboard"></i>';
                button.disabled = false;
            }
        });

        // Traiter le stockage
        if (processStorageBtn) {
            processStorageBtn.addEventListener('click', async () => {
                const date = reportDateInput.value;
                if (!date) return showNotification('Veuillez sélectionner une date.', 'warning');
                
                processStorageBtn.disabled = true;
                processStorageBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Traitement...';
                
                try {
                    const response = await axios.post(`${API_BASE_URL}/reports/process-storage`, { date });
                    showNotification(response.data.message, 'success');
                    await fetchReports(date);
                } catch (error) {
                    showNotification(`Erreur: ${error.response?.data?.message || 'Erreur inconnue.'}`, 'danger');
                } finally {
                    processStorageBtn.disabled = false;
                    processStorageBtn.innerHTML = '<i class="bi bi-box-seam"></i> Traiter le stockage';
                }
            });
        }
    };
    
    initializePage();
});