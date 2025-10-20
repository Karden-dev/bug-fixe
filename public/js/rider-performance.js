// public/js/rider-performance.js
// Version 3.0 - Corrigée pour appeler /api/performance et gérer l'état

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_BASE_URL = '/api';
    let currentUser = null;
    let currentPerformanceData = null; // Stocke les données brutes de la dernière requête
    let deliveryTrendChart = null; // Instance du graphique Chart.js
    
    // --- RÉFÉRENCES DOM ---
    const periodSelect = document.getElementById('period-select');
    const encouragementMessageEl = document.getElementById('encouragement-message');
    const coursesRecuesEl = document.getElementById('courses-recues');
    const coursesLivreesEl = document.getElementById('courses-livrees');
    const tauxLivrabiliteEl = document.getElementById('taux-livrabilite');
    const tauxLivrabiliteBarEl = document.getElementById('taux-livrabilite-bar');
    const joursTravaillesEl = document.getElementById('jours-travailles');
    const remunerationContentEl = document.getElementById('remuneration-content');
    const remunerationPeriodEl = document.getElementById('remuneration-period');
    const objectifsAdminSectionEl = document.getElementById('objectifs-admin-section');
    const objectifAdminCoursesEl = document.getElementById('objectif-admin-courses');
    const objectifAdminProgressBarEl = document.getElementById('objectif-admin-progress-bar');
    const primeParCourseEl = document.getElementById('prime-par-course');
    const primeTotaleEstimeeEl = document.getElementById('prime-totale-estimee');
    const objectifAdminPeriodEl = document.getElementById('objectif-admin-period');
    const displayPersonalGoalsEl = document.getElementById('display-personal-goals');
    const editPersonalGoalsEl = document.getElementById('edit-personal-goals');
    const editPersonalGoalsBtn = document.getElementById('edit-personal-goals-btn');
    const cancelEditGoalsBtn = document.getElementById('cancel-edit-goals-btn');
    const savePersonalGoalsBtn = document.getElementById('save-personal-goals-btn');
    const displayGoalDailyEl = document.getElementById('display-goal-daily');
    const displayGoalWeeklyEl = document.getElementById('display-goal-weekly');
    const displayGoalMonthlyEl = document.getElementById('display-goal-monthly');
    const inputGoalDailyEl = document.getElementById('input-goal-daily');
    const inputGoalWeeklyEl = document.getElementById('input-goal-weekly');
    const inputGoalMonthlyEl = document.getElementById('input-goal-monthly');
    const personalGoalMonthlyBarEl = document.getElementById('personal-goal-monthly-bar');
    const personalGoalsFeedbackEl = document.getElementById('personal-goals-feedback');
    const chartCanvas = document.getElementById('delivery-trend-chart');

    // --- FONCTIONS UTILITAIRES ---
    const formatAmount = (amount, currency = 'FCFA') => `${Number(amount || 0).toLocaleString('fr-FR')} ${currency}`;
    
    const showLoading = (element) => { 
        if (element) element.innerHTML = '<div class="text-center p-3 text-muted"><div class="spinner-border spinner-border-sm" role="status"></div> Chargement...</div>'; 
    };
    
    const showError = (element, message = "Erreur de chargement.") => { 
         if (element) element.innerHTML = `<div class="text-center p-3 text-danger">${message}</div>`; 
    };

    const getAuthHeader = () => {
        // S'assurer que AuthManager est chargé et que getToken() est la version corrigée
        if (typeof AuthManager === 'undefined' || !AuthManager.getToken) {
            console.error("AuthManager n'est pas chargé ou .getToken() n'existe pas.");
            return null;
        }
        const token = AuthManager.getToken(); // Utilise la fonction corrigée de auth.js
        if (!token) {
            console.error("Token non trouvé par AuthManager.");
            AuthManager.logout(); // Déconnecter si le token est manquant
            return null;
        }
        return { 'Authorization': `Bearer ${token}` };
    };
    
    // --- FONCTIONS DE MISE À JOUR UI ---

    const updateKeyIndicators = (stats) => {
        const delivered = stats?.delivered || 0;
        const received = stats?.received || 0;
        if(coursesRecuesEl) coursesRecuesEl.textContent = received || '--';
        if(coursesLivreesEl) coursesLivreesEl.textContent = delivered || '--';
        
        const rate = (received > 0) ? ((delivered / received) * 100).toFixed(1) : 0;
        if(tauxLivrabiliteEl) tauxLivrabiliteEl.textContent = `${rate} %`;

        if(tauxLivrabiliteBarEl) {
            tauxLivrabiliteBarEl.style.width = `${rate}%`;
            const barEl = tauxLivrabiliteBarEl;
            if (rate < 70) barEl.className = 'gauge-bar bg-danger';
            else if (rate < 90) barEl.className = 'gauge-bar bg-warning';
            else barEl.className = 'gauge-bar bg-success';
        }

        if(joursTravaillesEl) joursTravaillesEl.textContent = stats?.workedDays || '--';
    };

    const updateEncouragement = (stats) => {
        let message = "Continuez vos efforts !";
        const delivered = stats?.delivered || 0;
        const received = stats?.received || 0;
        const rate = (received > 0) ? ((delivered / received) * 100) : 0;

        if (rate >= 95 && delivered > 10) message = "🏆 Excellent travail ! Votre taux de livraison est remarquable !";
        else if (rate >= 80 && delivered > 5) message = "👍 Très bonnes performances cette période !";
        else if (delivered > 0) message = "💪 Vos efforts portent leurs fruits, concentrez-vous sur l'efficacité !";
        
        if(encouragementMessageEl) encouragementMessageEl.textContent = message;
    };

    const updateRemuneration = (data) => {
        if(!remunerationContentEl || !periodSelect) return;
        if(remunerationPeriodEl && periodSelect.options[periodSelect.selectedIndex]) {
            remunerationPeriodEl.textContent = periodSelect.options[periodSelect.selectedIndex].text;
        }
        let content = '';
        const remuneration = data.remuneration;

        if (data.riderType === 'pied' && remuneration) {
            const bonusText = remuneration.bonusApplied ? '<span class="badge bg-success ms-1">+5% Bonus</span>' : '';
            content = `
                <p><small>Type : Livreur à Pied (Commission)</small></p>
                <div class="row">
                    <div class="col-sm-6">CA (Frais liv.) : <strong>${formatAmount(remuneration.ca)}</strong></div>
                    <div class="col-sm-6">Dépenses : <strong>${formatAmount(remuneration.expenses)}</strong> (${(remuneration.expenseRatio * 100).toFixed(1)}%)</div>
                </div>
                <div class="row mt-2">
                     <div class="col-sm-6">Solde Net : <strong>${formatAmount(remuneration.netBalance)}</strong></div>
                     <div class="col-sm-6">Taux appliqué : <strong>${(remuneration.rate * 100).toFixed(0)}%</strong> ${bonusText}</div>
                </div>
                <hr>
                <p class="fs-5">Rémunération Estimée : <strong class="text-success">${formatAmount(remuneration.totalPay)}</strong></p>
            `;
        } else if (data.riderType === 'moto' && remuneration) {
             content = `
                 <p><small>Type : Livreur à Moto (Salaire Fixe + Prime)</small></p>
                 <div class="row">
                     <div class="col-sm-6">Salaire de Base : <strong>${formatAmount(remuneration.baseSalary)}</strong></div>
                     <div class="col-sm-6">Prime Performance : <strong>${formatAmount(remuneration.performanceBonus)}</strong></div>
                 </div>
                 <hr>
                 <p class="fs-5">Rémunération Totale Estimée : <strong class="text-success">${formatAmount(remuneration.totalPay)}</strong></p>
             `;
        } else {
            content = '<p class="text-muted">Type de livreur non défini ou données de rémunération indisponibles. Contactez l\'administrateur.</p>';
        }
        remunerationContentEl.innerHTML = content;
    };

    const updateAdminObjectives = (data) => {
        if (!objectifsAdminSectionEl) return;
        
        if (data.riderType === 'moto' && data.objectivesAdmin) {
            objectifsAdminSectionEl.classList.remove('d-none');
            if(objectifAdminPeriodEl && periodSelect && periodSelect.options[periodSelect.selectedIndex]) {
                objectifAdminPeriodEl.textContent = periodSelect.options[periodSelect.selectedIndex].text;
            }
            
            const obj = data.objectivesAdmin;
            const achieved = Number(obj.achieved) || 0;
            const target = Number(obj.target) || 0;
            const bonusThreshold = Number(obj.bonusThreshold) || 0;
            const percentage = target > 0 ? Math.min(100, (achieved / target * 100)) : 0;
            const progressClass = percentage >= 100 ? 'bg-success' : (percentage >= (bonusThreshold / target * 100) ? 'bg-info' : 'bg-warning');

            if(objectifAdminCoursesEl) objectifAdminCoursesEl.textContent = target > 0 ? target : '--';
            if(objectifAdminProgressBarEl) {
                objectifAdminProgressBarEl.style.width = `${percentage.toFixed(1)}%`;
                objectifAdminProgressBarEl.textContent = `${percentage.toFixed(1)}%`;
                objectifAdminProgressBarEl.setAttribute('aria-valuenow', percentage);
            }

            if(primeParCourseEl) primeParCourseEl.textContent = formatAmount(obj.bonusPerDelivery, '');
            if(primeTotaleEstimeeEl) primeTotaleEstimeeEl.textContent = formatAmount(data.remuneration?.performanceBonus);

        } else {
            objectifsAdminSectionEl.classList.add('d-none');
        }
    };

    const updatePersonalGoalsDisplay = (goals, stats) => {
        if(!displayPersonalGoalsEl || !personalGoalMonthlyBarEl) return;
        
        // Approximation: L'API ne renvoie que les stats de la période (deliveredMonth)
        const deliveredMonth = stats?.delivered || 0;
        const deliveredWeek = 0; // L'API ne fournit pas cette stat pour l'instant
        const deliveredToday = 0; // L'API ne fournit pas cette stat pour l'instant
        
        const goalsData = goals || {}; // S'assurer que 'goals' n'est pas null

        if(displayGoalDailyEl) displayGoalDailyEl.textContent = goalsData.daily ? `${goalsData.daily} courses` : 'Non défini';
        document.querySelector('#display-personal-goals div:nth-child(1) .text-muted').textContent = `(Progression : ${deliveredToday}/${goalsData.daily || '--'})`;

        if(displayGoalWeeklyEl) displayGoalWeeklyEl.textContent = goalsData.weekly ? `${goalsData.weekly} courses` : 'Non défini';
        document.querySelector('#display-personal-goals div:nth-child(2) .text-muted').textContent = `(Progression : ${deliveredWeek}/${goalsData.weekly || '--'})`;

        if(displayGoalMonthlyEl) displayGoalMonthlyEl.textContent = goalsData.monthly ? `${goalsData.monthly} courses` : 'Non défini';
        document.querySelector('#display-personal-goals div:nth-child(3) .text-muted').textContent = `(Progression : ${deliveredMonth}/${goalsData.monthly || '--'})`;

        // Barre de progression Mensuelle Perso
        const monthlyGoal = goalsData.monthly || 0;
        const monthlyProgress = monthlyGoal > 0 ? Math.min(100, (deliveredMonth / monthlyGoal) * 100) : 0;
        personalGoalMonthlyBarEl.style.width = `${monthlyProgress.toFixed(1)}%`;
        personalGoalMonthlyBarEl.textContent = `${monthlyProgress.toFixed(1)}%`;
        personalGoalMonthlyBarEl.setAttribute('aria-valuenow', monthlyProgress);
    };

    const updateDeliveryTrendChart = (chartData) => {
        const canvas = chartCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (deliveryTrendChart) deliveryTrendChart.destroy();

        if (!chartData || !chartData.labels || chartData.labels.length === 0 || !chartData.data || chartData.data.length === 0) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             ctx.font = "14px Arial";
             ctx.fillStyle = "#6c757d";
             ctx.textAlign = "center";
             ctx.fillText("Aucune donnée pour le graphique.", canvas.width / 2, canvas.height / 2);
             return;
         }
         
        deliveryTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Courses Livrées',
                    data: chartData.data,
                    borderColor: 'rgb(255, 127, 80)',
                    backgroundColor: 'rgba(255, 127, 80, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } },
                plugins: { legend: { display: false } }
            }
        });
    };
    
    // --- LOGIQUE DE GESTION DES OBJECTIFS PERSONNELS ---

    const savePersonalGoals = async () => {
        if(!inputGoalDailyEl || !inputGoalWeeklyEl || !inputGoalMonthlyEl) return;
        
        const goals = {
            daily: parseInt(inputGoalDailyEl.value) || null,
            weekly: parseInt(inputGoalWeeklyEl.value) || null,
            monthly: parseInt(inputGoalMonthlyEl.value) || null,
        };

        if(savePersonalGoalsBtn) savePersonalGoalsBtn.disabled = true;
        if(personalGoalsFeedbackEl) personalGoalsFeedbackEl.textContent = 'Enregistrement...';
        
        const headers = getAuthHeader();
        if (!headers) {
             if(personalGoalsFeedbackEl) personalGoalsFeedbackEl.textContent = 'Erreur d\'authentification.';
             if(savePersonalGoalsBtn) savePersonalGoalsBtn.disabled = false;
             return;
        }

        try {
            // ** APPEL API ** : PUT /api/performance/personal-goals
            // Cette route est gérée par performance.routes.js
            await axios.put(`${API_BASE_URL}/performance/personal-goals`, goals, { headers });
            
            if(personalGoalsFeedbackEl) {
                personalGoalsFeedbackEl.textContent = 'Objectifs sauvegardés sur le serveur.';
                personalGoalsFeedbackEl.className = 'form-text mt-2 text-success';
            }
            
            // Mise à jour de l'affichage (re-fetch)
            await fetchPerformanceData(); 
            toggleEditPersonalGoals(false); // Revenir au mode affichage

        } catch (error) {
            console.error("Erreur sauvegarde objectifs perso:", error);
            if(personalGoalsFeedbackEl) {
                personalGoalsFeedbackEl.textContent = error.response?.data?.message || 'Erreur lors de la sauvegarde.';
                personalGoalsFeedbackEl.className = 'form-text mt-2 text-danger';
            }
             if (error.response?.status === 401 || error.response?.status === 403) AuthManager.logout();
        } finally {
             if(savePersonalGoalsBtn) savePersonalGoalsBtn.disabled = false;
             setTimeout(() => { if(personalGoalsFeedbackEl) personalGoalsFeedbackEl.textContent = ''; }, 4000);
        }
    };

    const toggleEditPersonalGoals = (editMode) => {
        if(!displayPersonalGoalsEl || !editPersonalGoalsEl || !editPersonalGoalsBtn) return;

        if (editMode) {
            displayPersonalGoalsEl.classList.add('d-none');
            editPersonalGoalsEl.classList.remove('d-none');
            editPersonalGoalsBtn.innerHTML = '<i class="bi bi-x-lg"></i>'; // Change icon to Cancel
            // Pré-remplir les inputs avec la valeur de la BDD (contenue dans currentPerformanceData)
            const goals = currentPerformanceData?.personalGoals || {};
            if(inputGoalDailyEl) inputGoalDailyEl.value = goals.daily || '';
            if(inputGoalWeeklyEl) inputGoalWeeklyEl.value = goals.weekly || '';
            if(inputGoalMonthlyEl) inputGoalMonthlyEl.value = goals.monthly || '';

        } else {
            displayPersonalGoalsEl.classList.remove('d-none');
            editPersonalGoalsEl.classList.add('d-none');
            editPersonalGoalsBtn.innerHTML = '<i class="bi bi-pencil"></i>'; // Change icon back to Edit
             if(personalGoalsFeedbackEl) personalGoalsFeedbackEl.textContent = '';
        }
    };

    // --- FONCTION PRINCIPALE DE CHARGEMENT ---

    const fetchPerformanceData = async () => {
        // Vérifier que les éléments DOM essentiels existent avant de continuer
        if (!remunerationContentEl || !coursesRecuesEl || !AuthManager) {
             console.error("Éléments DOM ou AuthManager manquants. Arrêt de fetchPerformanceData.");
             return;
        }
        
        const period = periodSelect.value;
        const headers = getAuthHeader();
        
        if (!headers || !AuthManager.getUserId()) {
            showLoading(remunerationContentEl);
            console.warn("Token ou UserID manquant, appel API annulé.");
            return;
        }

        showLoading(remunerationContentEl);
        if(objectifsAdminSectionEl) objectifsAdminSectionEl.classList.add('d-none'); 
        if(encouragementMessageEl) encouragementMessageEl.textContent = 'Analyse des performances...';
        if(coursesRecuesEl) coursesRecuesEl.textContent = '--';
        if(coursesLivreesEl) coursesLivreesEl.textContent = '--';
        if(tauxLivrabiliteEl) tauxLivrabiliteEl.textContent = '-- %';
        if(tauxLivrabiliteBarEl) tauxLivrabiliteBarEl.style.width = '0%';
        if(joursTravaillesEl) joursTravaillesEl.textContent = '--';


        try {
            // ** APPEL API ** : GET /api/performance
            // C'est la route principale qui renvoie toutes les données
            const response = await axios.get(`${API_BASE_URL}/performance`, {
                params: { period },
                headers,
                timeout: 10000 // Ajout d'un timeout de 10s
            });

            currentPerformanceData = response.data; // Stocker les données
            const stats = currentPerformanceData.stats;

            if (!currentPerformanceData || !stats) {
                 showError(remunerationContentEl, "Aucune donnée de performance reçue pour la période.");
                 return;
            }

            // Mettre à jour toutes les sections de l'UI
            updateKeyIndicators(stats);
            updateEncouragement(stats);
            updateRemuneration(currentPerformanceData);
            updateAdminObjectives(currentPerformanceData);
            
            // Les objectifs personnels sont lus depuis l'API (qui les lit de la BDD)
            const goals = currentPerformanceData.personalGoals; 
            updatePersonalGoalsDisplay(goals, stats); 
            
            updateDeliveryTrendChart(currentPerformanceData.chartData);

        } catch (error) {
            console.error("Erreur fetchPerformanceData:", error);
            if (error.code === 'ECONNABORTED') {
                showError(remunerationContentEl, "La requête a expiré. Le serveur met trop de temps à répondre.");
            } else if (error.response) {
                // Erreur renvoyée par le serveur (4xx, 5xx)
                showError(remunerationContentEl, `Erreur: ${error.response.data?.message || 'Impossible de charger les données.'} (Code: ${error.response.status})`);
                if (error.response.status === 401 || error.response.status === 403) {
                    AuthManager.logout(); // Déconnexion si non autorisé
                }
            } else if (error.request) {
                // La requête a été faite mais aucune réponse n'a été reçue (ex: hors ligne)
                showError(remunerationContentEl, "Impossible de contacter le serveur. Vérifiez votre connexion.");
            } else {
                // Erreur de configuration
                showError(remunerationContentEl, `Erreur inattendue: ${error.message}`);
            }
            if(encouragementMessageEl) encouragementMessageEl.textContent = "Erreur de chargement des données.";
        }
    };

    // --- INITIALISATION ---
    const initializeApp = () => {
        // S'assurer que AuthManager est défini
        if (typeof AuthManager === 'undefined') {
            console.error("AuthManager n'est pas chargé. Arrêt de l'initialisation.");
            return;
        }

        currentUser = AuthManager.getUser(); // Récupérer l'utilisateur via AuthManager
        if (!currentUser || currentUser.role !== 'livreur') {
             if (currentUser) console.error("Rôle incorrect.");
             // La redirection est déjà gérée par le script <script> dans le HTML
             return; 
        }

        // Remplir infos utilisateur (récupéré par auth.js)
        if (document.getElementById('riderName')) document.getElementById('riderName').textContent = currentUser.name;
        if (document.getElementById('riderRole')) document.getElementById('riderRole').textContent = 'Livreur'; 

        // --- Attachement des Événements ---
        if (periodSelect) {
            periodSelect.addEventListener('change', fetchPerformanceData);
        } else {
            console.error("Élément DOM 'period-select' introuvable.");
        }
        
        if (editPersonalGoalsBtn) {
            editPersonalGoalsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // On vérifie si l'édition est cachée pour savoir si on doit l'activer
                const isEditing = editPersonalGoalsEl && editPersonalGoalsEl.classList.contains('d-none');
                toggleEditPersonalGoals(isEditing);
            });
        } else {
            console.error("Élément DOM 'edit-personal-goals-btn' introuvable.");
        }

        if (cancelEditGoalsBtn) {
            cancelEditGoalsBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                toggleEditPersonalGoals(false); 
            });
        }
        
        if (savePersonalGoalsBtn) {
            savePersonalGoalsBtn.addEventListener('click', (e) => { 
                e.preventDefault(); 
                savePersonalGoals(); 
            });
        }

        // Lancement initial
        fetchPerformanceData();
    };
    
    // Attendre que AuthManager soit prêt avant d'initialiser
    // L'événement 'authManagerReady' est déclenché par auth.js
    document.addEventListener('authManagerReady', () => {
        console.log("Événement 'authManagerReady' reçu. Initialisation de l'application.");
        initializeApp();
    });

    // Fallback au cas où l'événement ne serait pas capturé (ex: timing)
     setTimeout(() => {
         if (!currentUser && typeof AuthManager !== 'undefined' && AuthManager.getUser()) {
             console.warn("AuthManager était prêt mais l'événement n'a pas été capturé ? Initialisation par fallback.");
             initializeApp();
         }
     }, 500); // 500ms
});