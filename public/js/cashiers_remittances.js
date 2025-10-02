// js/cashiers_remittances.js
document.addEventListener('DOMContentLoaded', () => {

  // --- CONFIGURATION ---
  const API_BASE_URL = 'http://localhost:3000';
  
  // Simulation de la récupération de l'utilisateur connecté
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : { id: 1, name: 'Admin Test', token: 'mock-token' };
  const CURRENT_USER_ID = user.id;

  // Configuration d'axios
  if (user.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
  }

  // --- RÉFÉRENCES DOM ---
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const sidebarToggler = document.getElementById('sidebar-toggler');
  const logoutBtn = document.getElementById('logoutBtn');

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const globalSearchInput = document.getElementById('globalSearchInput');
  const filterBtn = document.getElementById('filterBtn');

  const summaryTableBody = document.getElementById('summaryTableBody');
  const shortfallsTableBody = document.getElementById('shortfallsTableBody');

  const remittanceDetailsModal = new bootstrap.Modal(document.getElementById('remittanceDetailsModal'));
  const settleShortfallModal = new bootstrap.Modal(document.getElementById('settleShortfallModal'));

  const settleShortfallForm = document.getElementById('settleShortfallForm');
  const confirmBatchBtn = document.getElementById('confirmBatchBtn');
  
  // Références Cartes Statistiques (mises à jour)
  const dbPendingRemittances = document.getElementById('db-pending-remittances');
  const dbConfirmedRemittances = document.getElementById('db-confirmed-remittances');
  const dbActiveShortfalls = document.getElementById('db-active-shortfalls');

  // Mise à jour de l'UI avec le nom de l'utilisateur
  if (document.getElementById('userName')) document.getElementById('userName').textContent = user.name;
  if (document.getElementById('headerUserName')) document.getElementById('headerUserName').textContent = user.name;


  // --- FONCTIONS UTILITAIRES ---
  
  /**
   * Affiche une notification toast stylisée.
   * @param {string} message - Le message à afficher.
   * @param {string} [type='success'] - Le type d'alerte (success, danger, warning, info).
   */
  const showNotification = (message, type = 'success') => {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    container.appendChild(alertDiv);

    // Fermeture automatique pour l'effet "toast"
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
        bsAlert.close();
    }, 4000);
  };

  /**
   * Formate un montant en FCFA avec séparateur de milliers.
   * @param {number|string} amount - Le montant à formater.
   * @returns {string} Le montant formaté.
   */
  const formatAmount = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

  /**
   * Retarde l'exécution d'une fonction (debounce).
   * @param {Function} func - La fonction à exécuter.
   * @param {number} [delay=500] - Le délai d'attente en millisecondes.
   * @returns {Function} La fonction debounced.
   */
  const debounce = (func, delay = 500) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  };

  /**
   * Met en évidence le lien de navigation actif dans la barre latérale.
   */
  const highlightActiveLink = () => {
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
  };

  // --- FONCTIONS DE CHARGEMENT DES DONNÉES ---

  /**
   * Récupère et met à jour les métriques pour les cartes statistiques.
   * @param {string} startDate - Date de début.
   * @param {string} endDate - Date de fin.
   */
  const fetchRemittanceMetrics = async (startDate, endDate) => {
      try {
          // Endpoint simulé pour récupérer les stats agrégées des versements et manquants
          // Les données sont agrégées ici pour les cartes
          const res = await axios.get(`${API_BASE_URL}/cash/remittance-metrics`, { params: { startDate, endDate } });
          const data = res.data;
          
          dbPendingRemittances.textContent = formatAmount(data.pending_remittance_amount);
          dbConfirmedRemittances.textContent = formatAmount(data.confirmed_remittance_amount);
          dbActiveShortfalls.textContent = formatAmount(data.active_shortfalls_amount);
          
      } catch (error) {
          console.error("Erreur de chargement des métriques de versement:", error);
          dbPendingRemittances.textContent = "0 FCFA";
          dbConfirmedRemittances.textContent = "0 FCFA";
          dbActiveShortfalls.textContent = "0 FCFA";
          showNotification("Erreur au chargement des métriques.", "danger");
      }
  };

  /**
   * Détermine l'onglet actif et lance la récupération des données correspondantes.
   * Gère l'application des filtres (déclenché par le bouton 'Filtrer').
   */
  const applyFiltersAndRender = () => {
    const activeTab = document.querySelector('#cashTabs .nav-link.active');
    if (!activeTab) return;

    const targetPanelId = activeTab.getAttribute('data-bs-target');
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const search = globalSearchInput.value;

    if (!startDate || !endDate) return showNotification("Période invalide.", "warning");

    // Mise à jour des cartes de stats pour la période sélectionnée
    fetchRemittanceMetrics(startDate, endDate);

    if (targetPanelId === '#remittances-panel') {
      fetchAndRenderSummary(startDate, endDate, search);
    } else if (targetPanelId === '#shortfalls-panel') {
      fetchAndRenderShortfalls(search);
    }
  };

  /**
   * Récupère et affiche le résumé des versements des livreurs.
   * @param {string} startDate - Date de début.
   * @param {string} endDate - Date de fin.
   * @param {string} search - Terme de recherche.
   */
  const fetchAndRenderSummary = async (startDate, endDate, search) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/cash/remittance-summary`, { params: { startDate, endDate, search } });
      summaryTableBody.innerHTML = '';
      if (res.data.length === 0) {
        summaryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">Aucun versement à afficher.</td></tr>`;
        return;
      }
      res.data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.user_name || 'N/A'}</td>
          <td>${item.pending_count || 0}</td>
          <td class="text-warning fw-bold">${formatAmount(item.pending_amount)}</td>
          <td>${item.confirmed_count || 0}</td>
          <td class="text-success fw-bold">${formatAmount(item.confirmed_amount)}</td>
          <td><button class="btn btn-sm btn-primary-custom details-btn" data-id="${item.user_id}" data-name="${item.user_name}">Gérer</button></td>
        `;
        summaryTableBody.appendChild(row);
      });
    } catch (error) {
      console.error("Erreur de chargement du résumé:", error);
      summaryTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
    }
  };

  /**
   * Récupère et affiche la liste des manquants des livreurs (shortfalls).
   * @param {string} search - Terme de recherche.
   */
  const fetchAndRenderShortfalls = async (search) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/cash/shortfalls`, { params: { search } });
      shortfallsTableBody.innerHTML = '';
      if (res.data.length === 0) {
        shortfallsTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-3">Aucun manquant en attente.</td></tr>`;
        return;
      }
      res.data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.deliveryman_name || 'N/A'}</td>
          <td class="text-danger fw-bold">${formatAmount(item.amount)}</td>
          <td><span class="badge bg-warning text-dark">${item.status}</span></td>
          <td>${moment(item.created_at).format('DD/MM/YYYY')}</td>
          <td><button class="btn btn-sm btn-success settle-btn" data-id="${item.id}" data-amount="${item.amount}">Régler</button></td>
        `;
        shortfallsTableBody.appendChild(row);
      });
    } catch (error) {
        console.error("Erreur de chargement des manquants:", error);
      shortfallsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger p-4">Erreur de chargement.</td></tr>`;
    }
  };

  // --- GESTION DES ACTIONS ---

  /**
   * Gère l'affichage des détails de versement pour un livreur.
   * (Logique détaillée omise pour la brièveté, mais fonctionnelle)
   */
  const handleRemittanceDetails = async (deliverymanId, deliverymanName) => {
    document.getElementById('modalDeliverymanName').textContent = deliverymanName;
    try {
      const res = await axios.get(`${API_BASE_URL}/cash/remittance-details/${deliverymanId}`, {
        params: { startDate: startDateInput.value, endDate: endDateInput.value }
      });
      const tableBody = document.getElementById('modalTransactionsTableBody');
      tableBody.innerHTML = '';
      // ... logique de rendu des détails
      if (res.data.length === 0) {
         tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">Aucune transaction à gérer.</td></tr>`;
      } else {
        res.data.forEach(tx => {
            const row = document.createElement('tr');
            const statusBadge = tx.status === 'pending' ? `<span class="badge bg-warning text-dark">En attente</span>` : `<span class="badge bg-success">Confirmé</span>`;
            row.innerHTML = `
            <td><input type="checkbox" class="transaction-checkbox" data-id="${tx.id}" data-amount="${tx.amount}" ${tx.status !== 'pending' ? 'disabled' : ''}></td>
            <td>${moment(tx.created_at).format('DD/MM HH:mm')}</td>
            <td>${formatAmount(tx.amount)}</td>
            <td>
              <div>${tx.comment || 'N/A'}</div>
              <small class="text-muted">${tx.shop_name || 'Info'} - ${tx.item_names || 'non'} - ${tx.delivery_location || 'disponible'}</small>
            </td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-sm btn-outline-info edit-remittance-btn" title="Modifier le montant" data-id="${tx.id}" data-amount="${tx.amount}"><i class="bi bi-pencil"></i></button>
              ${tx.status === 'pending' ? `<button class="btn btn-sm btn-outline-success confirm-single-remittance-btn" title="Confirmer ce versement" data-id="${tx.id}" data-amount="${tx.amount}"><i class="bi bi-check2"></i></button>` : ''}
            </td>
          `;
          tableBody.appendChild(row);
        });
      }
      remittanceDetailsModal.show();
    } catch (error) {
      showNotification("Erreur au chargement des détails.", "danger");
    }
  };

  /**
   * Gère la confirmation d'un lot de versements.
   */
  const handleConfirmBatch = async () => {
    const selectedCheckboxes = document.querySelectorAll('#modalTransactionsTableBody .transaction-checkbox:checked');
    const transactionIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    if (transactionIds.length === 0) return showNotification("Sélectionnez au moins une transaction.", 'warning');

    const expectedAmount = Array.from(selectedCheckboxes).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
    const paidAmount = prompt(`Total sélectionné : ${formatAmount(expectedAmount)}. Montant total versé ?`, expectedAmount);

    if (paidAmount !== null && !isNaN(paidAmount)) {
      try {
        const res = await axios.put(`${API_BASE_URL}/cash/remittances/confirm`, {
          transactionIds,
          paidAmount: parseFloat(paidAmount),
          validated_by: CURRENT_USER_ID
        });
        showNotification(res.data.message);
        remittanceDetailsModal.hide();
        applyFiltersAndRender();
      } catch (error) {
        showNotification(error.response?.data?.message || "Erreur lors de la confirmation.", "danger");
      }
    }
  };

  /**
   * Gère la modification du montant d'un versement.
   * @param {Object} target - Élément de la cible du clic.
   */
  const handleEditRemittanceAmount = async (target) => {
    const txId = target.dataset.id;
    const oldAmount = target.dataset.amount;
    const newAmount = prompt(`Modifier le montant du versement :`, oldAmount);
    if (newAmount && !isNaN(newAmount)) {
      try {
        await axios.put(`${API_BASE_URL}/cash/remittances/${txId}`, { amount: newAmount });
        showNotification("Montant mis à jour.");
        // Note: Ici, on devrait idéalement recharger les détails dans la modale.
        // Simuler le rechargement:
        const deliverymanName = document.getElementById('modalDeliverymanName').textContent;
        // L'ID du livreur n'est pas directement sur le bouton, il faudrait le stocker. Pour la demo, on simule une recharge.
        // Puisque nous n'avons pas l'ID du livreur ici, nous allons juste masquer la modale pour forcer l'utilisateur à rouvrir (ce qui recharge).
        remittanceDetailsModal.hide();
      } catch (error) {
        showNotification(error.response?.data?.message || "Erreur lors de la modification.", "danger");
      }
    }
  };

  /**
   * Gère le règlement d'un manquant.
   * @param {Event} e - L'événement de soumission du formulaire de règlement.
   */
  const handleSettleShortfallSubmit = async (e) => {
    e.preventDefault();
    const shortfallId = e.target.dataset.shortfallId;
    const amount = document.getElementById('settleAmountInput').value;
    try {
      await axios.put(`${API_BASE_URL}/cash/shortfalls/${shortfallId}/settle`, { amount: parseFloat(amount), userId: CURRENT_USER_ID });
      showNotification("Manquant réglé avec succès.");
      settleShortfallModal.hide();
      fetchAndRenderShortfalls();
    } catch (error) {
      showNotification(error.response?.data?.message || "Erreur lors du règlement.", "danger");
    }
  };
  
  /**
   * Gère le clic sur les actions du tableau (Gérer, Régler, Modifier montant).
   * @param {Event} e - L'événement de clic.
   */
  const handleTableActions = async (e) => {
    const target = e.target.closest('button, a');
    if (!target) return;

    if (target.matches('.details-btn')) {
      handleRemittanceDetails(target.dataset.id, target.dataset.name);
    } else if (target.matches('.settle-btn')) {
      // Ouvre la modale de règlement
      const shortfallId = target.dataset.id;
      const amountDue = target.dataset.amount;
      document.getElementById('settleShortfallInfo').textContent = `Montant du manquant: ${formatAmount(amountDue)}`;
      document.getElementById('settleAmountInput').value = amountDue;
      settleShortfallForm.dataset.shortfallId = shortfallId;
      settleShortfallModal.show();
    } else if (target.matches('.edit-remittance-btn')) {
      handleEditRemittanceAmount(target);
    } else if (target.matches('.confirm-single-remittance-btn')) {
        // Logique de confirmation d'un seul versement
        const txId = target.dataset.id;
        const expectedAmount = target.dataset.amount;
        const paidAmount = prompt(`Montant attendu : ${formatAmount(expectedAmount)}. Montant versé ?`, expectedAmount);
        
        if (paidAmount !== null && !isNaN(paidAmount)) {
            try {
                await axios.put(`${API_BASE_URL}/cash/remittances/confirm`, { 
                    transactionIds: [txId], 
                    paidAmount: parseFloat(paidAmount), 
                    validated_by: CURRENT_USER_ID 
                });
                showNotification("Versement confirmé.");
                remittanceDetailsModal.hide();
                applyFiltersAndRender();
            } catch (error) { 
                showNotification(error.response?.data?.message || "Erreur.", "danger"); 
            }
        }
    }
  };


  // --- INITIALISATION ---

  const initializeApp = () => {
    const today = new Date().toISOString().slice(0, 10);
    startDateInput.value = today;
    endDateInput.value = today;

    // --- Sidebar et Déconnexion ---
    sidebarToggler.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
    });

    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = 'index.html';
    });
    
    highlightActiveLink();

    // --- Filtres et Navigation par Onglet ---
    filterBtn.addEventListener('click', applyFiltersAndRender);
    globalSearchInput.addEventListener('input', debounce(applyFiltersAndRender));
    
    document.querySelectorAll('#cashTabs .nav-link').forEach(tab => tab.addEventListener('shown.bs.tab', applyFiltersAndRender));

    // --- Actions globales ---
    document.body.addEventListener('click', handleTableActions);
    confirmBatchBtn.addEventListener('click', handleConfirmBatch);
    settleShortfallForm.addEventListener('submit', handleSettleShortfallSubmit);

    // Chargement initial des métriques et des données du premier onglet
    applyFiltersAndRender();
  };

  initializeApp();
});