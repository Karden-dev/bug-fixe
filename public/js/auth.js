// public/js/auth.js

/**
 * Ce module gère l'authentification côté client.
 * Il vérifie si un utilisateur est connecté, met à jour l'interface utilisateur,
 * gère la déconnexion et fournit des informations sur l'utilisateur actuel.
 */
const AuthManager = (() => {
    let currentUser = null;

    /**
     * Tente de récupérer les informations de l'utilisateur depuis localStorage ou sessionStorage.
     */
    const loadUser = () => {
        const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userJson) {
            try {
                currentUser = JSON.parse(userJson);
            } catch (e) {
                console.error("Erreur de parsing utilisateur. Déconnexion.", e);
                // Si les données sont corrompues, on déconnecte
                logout();
            }
        }
    };

    /**
     * Déconnecte l'utilisateur en supprimant ses informations de stockage et en le redirigeant.
     */
    const logout = () => {
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        currentUser = null;
        window.location.href = 'index.html';
    };

    /**
     * Vérifie si l'utilisateur est connecté et gère les redirections.
     * Met également à jour l'interface utilisateur avec les informations de l'utilisateur.
     */
    const init = () => {
        loadUser();
        
        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        const isRiderPage = window.location.pathname.endsWith('rider-app.html');
        
        if (currentUser) {
            // NOUVEAU: Redirection basée sur le rôle si l'utilisateur est sur la page de connexion
            if (isLoginPage) {
                if (currentUser.role === 'rider') {
                    window.location.href = 'rider-app.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
                return;
            }

            // OPTIONNEL: Si un 'rider' essaie d'accéder à la page admin/dashboard
            if (currentUser.role === 'rider' && !isRiderPage) {
                // Vous pouvez mettre ici une logique pour bloquer l'accès aux pages admin/staff
                // Pour l'instant, nous laissons passer les autres utilisateurs vers leurs pages
                // mais on peut ajouter :
                /* if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('users.html')) {
                    alert("Accès non autorisé pour les livreurs.");
                    window.location.href = 'rider-app.html';
                }
                */
            }

            // Mettre à jour le nom de l'utilisateur dans l'en-tête
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = currentUser.name || 'Utilisateur';
            }

            // Configurer le bouton de déconnexion
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }

        } else {
            // Si l'utilisateur n'est pas connecté et qu'on n'est pas sur une page publique, rediriger vers la connexion.
            // On considère index.html et rider-app.html comme les points d'entrée (même si rider-app.html vérifiera l'auth après)
            if (!isLoginPage && !isRiderPage) {
                window.location.href = 'index.html';
            }
        }
    };

    /**
     * Renvoie l'objet utilisateur actuellement connecté.
     * @returns {object|null} L'objet utilisateur ou null si personne n'est connecté.
     */
    const getUser = () => {
        if (!currentUser) {
            loadUser();
        }
        return currentUser;
    };

    /**
     * Renvoie l'ID de l'utilisateur actuellement connecté.
     * @returns {number|null} L'ID de l'utilisateur ou null.
     */
    const getUserId = () => {
        const user = getUser();
        return user ? user.id : null;
    };

    // Exposer les fonctions publiques
    return {
        init,
        getUser,
        getUserId,
        logout
    };
})();

// Initialiser le gestionnaire d'authentification dès que le DOM est prêt.
document.addEventListener('DOMContentLoaded', AuthManager.init);