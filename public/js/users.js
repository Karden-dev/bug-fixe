// js/users.js

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = 'https://app.winkexpress.online';

    // --- RÉFÉRENCES DOM ---
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');

    const usersTableBody = document.getElementById('usersTableBody');
    const searchInput = document.getElementById('searchInput');

    // Modale principale
    const userForm = document.getElementById('userForm');
    const addUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const addUserModalLabel = document.getElementById('addUserModalLabel');
    const formSubmitBtn = document.getElementById('formSubmitBtn');
    const userRoleSelect = document.getElementById('userRole');
    const userStatusSelect = document.getElementById('userStatus');
    const userStatusContainer = document.getElementById('userStatusContainer');
    const pinFieldContainer = document.getElementById('pin-field-container');
    const userPinInput = document.getElementById('userPin');

    // Modale PIN
    const changePinBtn = document.getElementById('changePinBtn');
    const changePinModal = new bootstrap.Modal(document.getElementById('changePinModal'));
    const changePinForm = document.getElementById('changePinForm');
    const newPinInput = document.getElementById('newPin');

    // --- ÉTAT LOCAL ---
    let isEditMode = false;
    let currentUserId = null;

    // --- FONCTIONS UTILITAIRES ---
    
    /**
     * Affiche une notification toast stylisée.
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
     * Formate une chaîne de date en format lisible (ex: 20 mai 2025).
     * @param {string} dateString - La date brute.
     * @returns {string} La date formatée.
     */
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    // --- FONCTIONS PRINCIPALES ---
    
    /**
     * Récupère la liste des utilisateurs et les affiche dans le tableau.
     */
    const fetchAndRenderUsers = async () => {
        try {
            const searchQuery = searchInput.value;
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(`${API_BASE_URL}/users?${params.toString()}`);
            const users = response.data;
            usersTableBody.innerHTML = '';

            if (!Array.isArray(users) || users.length === 0) {
                usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-3">Aucun utilisateur trouvé.</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = document.createElement('tr');
                row.className = user.status === 'inactif' ? 'inactive-row' : '';
                const displayRole = user.role === 'admin' ? 'Administrateur' : 'Livreur';
                const statusClass = user.status === 'actif' ? 'status-actif' : 'status-inactif';
                const statusText = user.status.charAt(0).toUpperCase() + user.status.slice(1);

                const toggleStatusBtn = user.status === 'actif'
                    ? `<button class="btn btn-sm btn-outline-warning status-btn" data-id="${user.id}" data-status="inactif" title="Désactiver"><i class="bi bi-toggle-off"></i></button>`
                    : `<button class="btn btn-sm btn-outline-success status-btn" data-id="${user.id}" data-status="actif" title="Activer"><i class="bi bi-toggle-on"></i></button>`;

                row.innerHTML = `
                    <td data-bs-toggle="tooltip" data-bs-placement="top" title="${user.phone_number}"><strong>${user.name}</strong></td>
                    <td>${displayRole}</td>
                    <td class="${statusClass}"><span class="status-dot"></span><span class="status-text">${statusText}</span></td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${user.id}" title="Modifier"><i class="bi bi-pencil-square"></i></button>
                            ${toggleStatusBtn}
                        </div>
                    </td>`;
                usersTableBody.appendChild(row);
            });

            // Ré-initialisation des tooltips après le rendu
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl));

        } catch (error) { 
            console.error("Erreur (fetchUsers):", error); 
            showNotification("Erreur de chargement des utilisateurs.", "danger");
        }
    };
    
    /**
     * Gère la soumission du formulaire d'ajout/modification d'utilisateur.
     * @param {Event} e - L'événement de soumission.
     */
    const handleUserFormSubmit = async (e) => {
        e.preventDefault();
        const userData = {
            name: document.getElementById('userName').value,
            phone_number: document.getElementById('userPhone').value,
            role: userRoleSelect.value,
            status: userStatusSelect.value
        };
        try {
            if (isEditMode) {
                await axios.put(`${API_BASE_URL}/users/${currentUserId}`, userData);
                showNotification("Utilisateur modifié avec succès !");
            } else {
                userData.pin = userPinInput.value;
                if (!userData.pin || userData.pin.length !== 4) {
                    showNotification("Veuillez entrer un code PIN valide (4 chiffres).", "warning");
                    return;
                }
                await axios.post(`${API_BASE_URL}/users`, userData);
                showNotification("Utilisateur ajouté avec succès !");
            }
            addUserModal.hide();
            fetchAndRenderUsers();
        } catch (error) { 
            showNotification(error.response?.data?.message || "Erreur lors de l'enregistrement.", "danger"); 
        }
    };
    
    /**
     * Gère le changement de PIN via la modale dédiée.
     * @param {Event} e - L'événement de soumission.
     */
    const handleChangePinSubmit = async (e) => {
        e.preventDefault();
        const newPin = newPinInput.value;
        if (!newPin || newPin.length !== 4) {
            showNotification("Le nouveau PIN doit contenir 4 chiffres.", "warning");
            return;
        }
        try {
            await axios.put(`${API_BASE_URL}/users/${currentUserId}/pin`, { pin: newPin });
            showNotification('PIN mis à jour avec succès !');
            changePinModal.hide();
            addUserModal.hide(); // Ferme la modale parente pour rafraîchir la vue
        } catch (error) { 
            showNotification(error.response?.data?.message || "Erreur lors de la mise à jour du PIN.", "danger"); 
        }
    };

    // --- GESTIONNAIRES D'ÉVÉNEMENTS GLOBALES ---

    /**
     * Prépare la modale pour l'édition des données de l'utilisateur.
     * @param {string} userId - L'ID de l'utilisateur à éditer.
     */
    const handleEditUser = async (userId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/users/${userId}`);
            const user = response.data;
            
            isEditMode = true;
            currentUserId = userId;
            addUserModalLabel.textContent = "Modifier l'utilisateur";
            formSubmitBtn.textContent = 'Sauvegarder';
            
            document.getElementById('userName').value = user.name;
            document.getElementById('userPhone').value = user.phone_number;
            userRoleSelect.value = user.role;
            userStatusSelect.value = user.status;
            
            // Masquer les champs inutiles en mode édition
            pinFieldContainer.style.display = 'none';
            userPinInput.removeAttribute('required');
            
            // Afficher les champs spécifiques à l'édition
            userStatusContainer.style.display = 'block';
            changePinBtn.style.display = 'block';
            
            addUserModal.show();
        } catch (error) {
            showNotification("Impossible de charger les données de l'utilisateur.", "danger");
        }
    };

    /**
     * Gère le changement de statut (Actif/Inactif) directement depuis le tableau.
     * @param {string} userId - L'ID de l'utilisateur.
     * @param {string} newStatus - Le nouveau statut ('actif' ou 'inactif').
     */
    const handleToggleStatus = async (userId, newStatus) => {
        const actionText = newStatus === 'inactif' ? 'désactiver' : 'activer';
        if (confirm(`Voulez-vous vraiment ${actionText} cet utilisateur ?`)) {
            try {
                await axios.put(`${API_BASE_URL}/users/${userId}/status`, { status: newStatus });
                showNotification(`Utilisateur ${actionText} avec succès.`);
                fetchAndRenderUsers();
            } catch (error) {
                showNotification(`Erreur lors de la ${actionText} de l'utilisateur.`, "danger");
            }
        }
    };

    // --- INITIALISATION DE LA PAGE ---
    
    /**
     * Initialise tous les écouteurs d'événements et charge les données initiales.
     */
    const initializeApp = () => {
        // --- Sidebar et Déconnexion ---
        if (sidebarToggler) {
            sidebarToggler.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            });
        }
        if (logoutBtn) {
             logoutBtn.addEventListener('click', () => { 
                localStorage.removeItem('user');
                sessionStorage.removeItem('user');
                window.location.href = 'index.html'; 
            });
        }
        
        // --- Mise en évidence du lien actif ---
        const currentPath = window.location.pathname.split('/').pop();
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) link.classList.add('active');
        });

        // --- Rôles pour la modale ---
        userRoleSelect.innerHTML = `<option value="admin">Administrateur</option><option value="livreur">Livreur</option>`;

        // --- Écouteurs de formulaire et tableau ---
        searchInput.addEventListener('input', fetchAndRenderUsers);
        userForm.addEventListener('submit', handleUserFormSubmit);
        changePinForm.addEventListener('submit', handleChangePinSubmit);
        changePinBtn.addEventListener('click', () => { changePinModal.show(); });
        
        usersTableBody.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            const userId = target.dataset.id;

            if (target.classList.contains('edit-btn')) {
                await handleEditUser(userId);
            } else if (target.classList.contains('status-btn')) {
                await handleToggleStatus(userId, target.dataset.status);
            }
        });

        // Réinitialisation de la modale à la fermeture
        document.getElementById('addUserModal').addEventListener('hidden.bs.modal', () => {
            userForm.reset();
            isEditMode = false;
            currentUserId = null;
            
            // Rétablir l'état par défaut (mode ajout)
            addUserModalLabel.textContent = 'Ajouter un utilisateur';
            formSubmitBtn.textContent = "Ajouter";
            pinFieldContainer.style.display = 'block';
            userPinInput.setAttribute('required', 'required');
            userStatusContainer.style.display = 'none';
            changePinBtn.style.display = 'none';
            newPinInput.value = ''; // Assurer que le champ PIN de la sous-modale est vide
        });

        // Premier chargement des données
        fetchAndRenderUsers();
    };

    initializeApp();
});