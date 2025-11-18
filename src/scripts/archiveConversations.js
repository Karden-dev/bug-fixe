// src/scripts/archiveConversations.js

// CONFIGURATION
// Exécuter toutes les 3 heures
const ARCHIVE_INTERVAL_MS = 1000 * 60 * 60 * 1; 

let db; // Le pool de connexions de la base de données

/**
 * Exécute le cycle d'archivage.
 */
const runArchiveCycle = async () => {
    if (!db) {
        console.error('[ArchiveService] Le service n\'est pas initialisé (DB manquante).');
        return;
    }
    
    console.log('[ArchiveService] Lancement du cycle d\'archivage...');

    try {
        // Statuts considérés comme "terminés" et pouvant être archivés
        const terminalStatuses = [
            'delivered', 
            'cancelled', 
            'failed_delivery', 
            'returned'
        ];

        const query = `
            UPDATE orders
            SET is_archived = 1
            WHERE status IN (?)
            AND is_archived = 0;
        `;

        const [result] = await db.execute(query, [terminalStatuses]);
        
        if (result.affectedRows > 0) {
            console.log(`[ArchiveService] ${result.affectedRows} conversation(s) archivée(s).`);
        }

    } catch (error) {
        console.error('[ArchiveService] Erreur lors du cycle d\'archivage:', error.message);
    }
};

/**
 * Initialise le service d'archivage.
 * @param {object} dbPool Le pool de connexion DB principal de l'application.
 */
const init = (dbPool) => {
    console.log("[ArchiveService] Initialisé avec la connexion DB.");
    db = dbPool;
    
    if (process.env.NODE_ENV !== 'test') {
        console.log(`[ArchiveService] Démarrage du moteur d'archivage (Intervalle: ${ARCHIVE_INTERVAL_MS / 1000}s).`);
        // Lancer immédiatement au démarrage, puis toutes les X heures
        runArchiveCycle(); 
        setInterval(runArchiveCycle, ARCHIVE_INTERVAL_MS);
    }
};

module.exports = {
    init
};