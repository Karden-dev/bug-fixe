// public/js/auth.js
// Version 2.0 - Mise à jour pour une gestion robuste du token JWT

/**
 * Ce module gère l'authentification côté client.
 * Il vérifie si un utilisateur est connecté, met à jour l'interface utilisateur,
 * gère la déconnexion et fournit des informations sur l'utilisateur et son token.
 */
const AuthManager = (() => {
    let currentUser = null;
    let token = null; // Variable pour stocker le token en mémoire

    /**
     * Tente de récupérer les informations de l'utilisateur et le token
     * depuis localStorage ou sessionStorage.
     */
    const loadUser = () => {
        const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
        // On charge également le token depuis le même espace de stockage
        token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (userJson) {
            try {
                currentUser = JSON.parse(userJson);
            } catch (e) {
                console.error("Erreur de parsing des données utilisateur. Déconnexion.", e);
                // Si les données sont corrompues, on déconnecte proprement.
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
        // On s'assure de bien supprimer le token des deux stockages
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        currentUser = null;
        token = null;
        window.location.href = 'index.html';
    };

    /**
     * Vérifie si l'utilisateur est connecté et gère les redirections.
     * Met également à jour l'interface utilisateur avec les informations de l'utilisateur.
     */
    const init = () => {
        loadUser();
        
        const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
        const isRiderPage = window.location.pathname.includes('rider-app.html') || window.location.pathname.includes('ridercash.html');
        
        if (currentUser) {
            // Redirection basée sur le rôle si l'utilisateur est sur la page de connexion
            if (isLoginPage) {
                if (currentUser.role === 'livreur') {
                    window.location.href = 'rider-app.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
                return;
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
            // Si l'utilisateur n'est pas connecté et qu'il n'est pas sur une page publique, rediriger vers la connexion.
            if (!isLoginPage) {
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

    /**
     * Renvoie le token d'authentification de l'utilisateur. Essentiel pour les requêtes hors ligne.
     * @returns {string|null} Le token JWT ou null.
     */
    const getToken = () => {
        if (!token) {
            loadUser();
        }
        return token;
    };

    // Exposer les fonctions publiques
    return {
        init,
        getUser,
        getUserId,
        getToken, // La nouvelle fonction est exposée ici
        logout
    };
})();

// Initialiser le gestionnaire d'authentification dès que le DOM est prêt.
document.addEventListener('DOMContentLoaded', AuthManager.init);