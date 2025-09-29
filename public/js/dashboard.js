// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- État des graphiques ---
    let revenueChart, deliverymenChart, shopsChart;
    
    // --- Références DOM ---
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const sidebarToggler = document.getElementById('sidebar-toggler');
    const logoutBtn = document.getElementById('logoutBtn');

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // --- Données de test (simulent une base de données) ---
    // Ces données simulent la réponse d'une API et sont conservées pour le fonctionnement.
    const allOrders = [
        { id: 1, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 1000, fees: 500, date: '2025-09-01' },
        { id: 2, shop: 'Épicerie B', deliveryman: 'Paul', status: 'en attente', revenue: 1500, fees: 0, date: '2025-09-01' },
        { id: 3, shop: 'Restaurant C', deliveryman: 'Jacques', status: 'annulée', revenue: 0, fees: 0, date: '2025-09-02' },
        { id: 4, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 2500, fees: 800, date: '2025-09-02' },
        { id: 5, shop: 'Épicerie B', deliveryman: 'Jacques', status: 'livrée', revenue: 1200, fees: 500, date: '2025-09-03' },
        { id: 6, shop: 'Restaurant C', deliveryman: 'Paul', status: 'livrée', revenue: 800, fees: 400, date: '2025-09-04' },
        { id: 7, shop: 'Restaurant C', deliveryman: 'Paul', status: 'livrée', revenue: 3000, fees: 900, date: '2025-09-05' },
        { id: 8, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 500, fees: 300, date: '2025-09-06' },
        { id: 9, shop: 'Épicerie B', deliveryman: 'Jacques', status: 'livrée', revenue: 2000, fees: 600, date: '2025-09-07' },
        { id: 10, shop: 'Restaurant C', deliveryman: 'Paul', status: 'livrée', revenue: 1800, fees: 550, date: '2025-09-08' },
        { id: 11, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 1500, fees: 600, date: '2025-09-09' },
        { id: 12, shop: 'Épicerie B', deliveryman: 'Paul', status: 'livrée', revenue: 2200, fees: 750, date: '2025-09-10' },
        { id: 13, shop: 'Restaurant C', deliveryman: 'Jacques', status: 'livrée', revenue: 1100, fees: 450, date: '2025-09-11' },
        { id: 14, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 1900, fees: 650, date: '2025-09-12' },
        { id: 15, shop: 'Épicerie B', deliveryman: 'Jacques', status: 'livrée', revenue: 900, fees: 400, date: '2025-09-13' },
        { id: 16, shop: 'Restaurant C', deliveryman: 'Paul', status: 'livrée', revenue: 2500, fees: 800, date: '2025-09-14' },
        { id: 17, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 1400, fees: 500, date: '2025-09-15' },
        { id: 18, shop: 'Épicerie B', deliveryman: 'Paul', status: 'livrée', revenue: 1600, fees: 550, date: '2025-09-16' },
        { id: 19, shop: 'Restaurant C', deliveryman: 'Jacques', status: 'livrée', revenue: 2100, fees: 700, date: '2025-09-17' },
        { id: 20, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 2300, fees: 750, date: '2025-09-18' },
        { id: 21, shop: 'Restaurant C', deliveryman: 'Jacques', status: 'livrée', revenue: 1800, fees: 600, date: '2025-09-19' },
        { id: 22, shop: 'Boulangerie A', deliveryman: 'Pierre', status: 'livrée', revenue: 1700, fees: 550, date: '2025-09-20' },
        { id: 23, shop: 'Épicerie B', deliveryman: 'Paul', status: 'livrée', revenue: 1300, fees: 450, date: '2025-09-21' }
    ];

    /**
     * Filtre les commandes par la plage de dates sélectionnée.
     * @returns {Array<Object>} Liste des commandes filtrées.
     */
    const filterOrdersByDateRange = () => {
        const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
        const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
        
        if (!startDate || !endDate) {
            return [];
        }
        
        // Ajuster endDate pour inclure toute la journée
        const adjustedEndDate = new Date(endDate.setHours(23, 59, 59, 999));
        
        return allOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startDate && orderDate <= adjustedEndDate;
        });
    };

    /**
     * Met à jour les cartes de statistiques et génère les données pour les graphiques.
     */
    const updateDashboard = () => {
        const filteredOrders = filterOrdersByDateRange();

        if (filteredOrders.length === 0) {
            // Réinitialiser les cartes et les graphiques
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('deliveredOrders').textContent = '0';
            document.getElementById('totalRevenue').textContent = '0 XAF';
            document.getElementById('totalFees').textContent = '0 XAF';
            updateCharts([], [], [], [], []);
            return;
        }

        // Calcul des métriques
        const deliveredOrders = filteredOrders.filter(order => order.status === 'livrée');
        const totalOrders = filteredOrders.length;
        const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.revenue, 0);
        const totalFees = deliveredOrders.reduce((sum, order) => sum + order.fees, 0);

        // Mise à jour des cartes
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('deliveredOrders').textContent = deliveredOrders.length;
        document.getElementById('totalRevenue').textContent = `${totalRevenue.toLocaleString()} XAF`;
        document.getElementById('totalFees').textContent = `${totalFees.toLocaleString()} XAF`;

        // Préparation des données pour les graphiques
        const revenueByDate = {};
        const deliverymenPerformance = {};
        const shopPerformance = {};

        deliveredOrders.forEach(order => {
            // Pour le graphique de revenu (frais de courses uniquement)
            if (!revenueByDate[order.date]) {
                revenueByDate[order.date] = 0;
            }
            revenueByDate[order.date] += order.fees;

            // Pour les classements des livreurs (basé sur le nombre de livraisons)
            if (!deliverymenPerformance[order.deliveryman]) {
                deliverymenPerformance[order.deliveryman] = { delivered: 0, fees: 0 };
            }
            deliverymenPerformance[order.deliveryman].delivered += 1;
            deliverymenPerformance[order.deliveryman].fees += order.fees;

            // Pour les classements des marchands (basé sur le revenu total)
            if (!shopPerformance[order.shop]) {
                shopPerformance[order.shop] = { revenue: 0 };
            }
            shopPerformance[order.shop].revenue += order.revenue;
        });

        // Tri et sélection du top 5
        const sortedDeliverymen = Object.keys(deliverymenPerformance)
            .sort((a, b) => deliverymenPerformance[b].delivered - deliverymenPerformance[a].delivered)
            .slice(0, 5);
        const sortedShops = Object.keys(shopPerformance)
            .sort((a, b) => shopPerformance[b].revenue - shopPerformance[a].revenue)
            .slice(0, 5);

        // Données pour le graphique de Revenus
        const revenueLabels = Object.keys(revenueByDate).sort();
        const revenueData = revenueLabels.map(date => revenueByDate[date]);
        
        // Données pour le graphique des Livreurs
        const deliverymenLabels = sortedDeliverymen;
        const deliverymenData = sortedDeliverymen.map(dm => deliverymenPerformance[dm].delivered);

        // Données pour le graphique des Marchands
        const shopLabels = sortedShops;
        const shopData = sortedShops.map(shop => shopPerformance[shop].revenue);
        
        updateCharts(revenueLabels, revenueData, deliverymenLabels, deliverymenData, shopLabels, shopData);
    };
    
    /**
     * Initialise ou met à jour les graphiques Chart.js.
     * @param {Array<string>} revenueLabels - Labels (dates) pour le graphique de revenu.
     * @param {Array<number>} revenueData - Données de revenu (CA) par date.
     * @param {Array<string>} deliverymenLabels - Labels (noms) pour le classement livreurs.
     * @param {Array<number>} deliverymenData - Données (courses livrées) pour les livreurs.
     * @param {Array<string>} shopLabels - Labels (noms) pour le classement marchands.
     * @param {Array<number>} shopData - Données (revenu généré) pour les marchands.
     */
    const updateCharts = (revenueLabels, revenueData, deliverymenLabels, deliverymenData, shopLabels, shopData) => {
        // Destruction des graphiques existants pour éviter les superpositions
        if (revenueChart) revenueChart.destroy();
        if (deliverymenChart) deliverymenChart.destroy();
        if (shopsChart) shopsChart.destroy();

        const corailColor = 'rgb(255, 127, 80)';
        const bleuCelesteColor = 'rgba(74, 100, 145, 0.8)';
        const bleuProfondColor = 'rgba(44, 62, 80, 0.8)';

        // 1. Création du graphique de revenus (CA)
        revenueChart = new Chart(document.getElementById('revenueChart'), {
            type: 'line',
            data: {
                labels: revenueLabels,
                datasets: [{
                    label: 'Chiffre d\'affaires (XAF)',
                    data: revenueData,
                    borderColor: corailColor,
                    backgroundColor: 'rgba(255, 127, 80, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // 2. Création du graphique des meilleurs livreurs
        deliverymenChart = new Chart(document.getElementById('deliverymenChart'), {
            type: 'bar',
            data: {
                labels: deliverymenLabels,
                datasets: [{
                    label: 'Courses livrées',
                    data: deliverymenData,
                    backgroundColor: bleuCelesteColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // 3. Création du graphique des meilleurs marchands
        shopsChart = new Chart(document.getElementById('shopsChart'), {
            type: 'bar',
            data: {
                labels: shopLabels,
                datasets: [{
                    label: 'Revenu généré (XAF)',
                    data: shopData,
                    backgroundColor: bleuProfondColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    };

    /**
     * Initialise les écouteurs d'événements et la vue de départ.
     */
    const initializeApp = () => {
        // Logique du menu rétractable et de la déconnexion
        sidebarToggler.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            window.location.href = 'index.html';
        });

        // Mise en évidence du lien actif (Tableau de bord)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === 'dashboard.html') {
                link.classList.add('active');
            }
        });
        
        // Ajout des écouteurs d'événements pour les champs de date
        startDateInput.addEventListener('change', updateDashboard);
        endDateInput.addEventListener('change', updateDashboard);
        
        // Définir une plage de dates par défaut pour un affichage immédiat
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        
        startDateInput.value = lastWeek.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];

        updateDashboard();
    };
    
    initializeApp();
});