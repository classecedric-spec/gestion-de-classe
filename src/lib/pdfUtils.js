import { supabase } from './supabaseClient';

/**
 * Fetches and processes PDF data for a single student.
 * 
 * CAHIER DES CHARGES - Génération PDF Individuel :
 * 1. Filtrage strict : Uniquement les activités de l'enfant (ID_enfant) dans des modules "en_cours"
 * 2. Tri en cascade : Date de fin module (plus ancien en premier) > Branche > Alphabétique
 * 3. Mise en page : Données élève + activités filtrées/triées
 * 
 * @param {string} studentId - UUID de l'élève (ID_enfant)
 * @param {string|null} studentNiveauId - UUID du niveau de l'élève (pour filtrage optionnel)
 * @returns {Promise<Object|null>} - Données PDF ou null si aucune activité
 */
export const fetchStudentPdfData = async (studentId, studentNiveauId) => {
    // ========================================
    // ÉTAPE 1 : RÉCUPÉRATION DES DONNÉES
    // ========================================
    // Récupère UNIQUEMENT les progressions de l'enfant (filtrage par ID_enfant)
    const { data: progressionData, error: progError } = await supabase
        .from('Progression')
        .select(`
            id,
            etat,
            date_limite,
            Activite (
                id,
                titre,
                ordre,
                ActiviteNiveau ( niveau_id ),
                Module (
                    id,
                    nom,
                    date_fin,
                    statut,
                    branche_id,
                    SousBranche (
                        id,
                        ordre,
                        Branche ( id, nom, ordre )
                    )
                )
            )
        `)
        .eq('eleve_id', studentId); // FILTRAGE STRICT : Identité enfant

    if (progError) throw progError;

    // ========================================
    // ÉTAPE 2 : FILTRAGE STRICT
    // ========================================
    const filteredProgressions = (progressionData || []).filter(p => {
        // Règle 1 : L'activité et son module doivent exister
        if (!p.Activite?.Module) return false;

        // Règle 2 : STATUT TEMPOREL - Uniquement les modules "en_cours"
        // Exclusion automatique des modules "archivés" ou "en préparation"
        if (p.Activite.Module.statut !== 'en_cours') return false;

        // Règle 3 : États d'activité à afficher (To-Do List)
        // On inclut : à commencer, en cours, à domicile
        // On exclut : terminé, besoin d'aide, à vérifier, ajustement
        const validStates = ['a_commencer', 'en_cours', 'a_domicile'];
        if (!validStates.includes(p.etat)) return false;

        // Règle 4 : Filtrage par niveau (optionnel)
        if (studentNiveauId && p.Activite.ActiviteNiveau?.length > 0) {
            const hasMatchingLevel = p.Activite.ActiviteNiveau.some(
                an => an.niveau_id === studentNiveauId
            );
            if (!hasMatchingLevel) return false;
        }

        return true;
    });

    // Si aucune activité ne correspond aux critères, retourner null
    if (filteredProgressions.length === 0) return null;

    // ========================================
    // ÉTAPE 3 : REGROUPEMENT PAR MODULE
    // ========================================
    const moduleMap = {};
    filteredProgressions.forEach(p => {
        const mod = p.Activite.Module;
        if (!moduleMap[mod.id]) {
            moduleMap[mod.id] = {
                id: mod.id,
                title: mod.nom,
                dueDate: mod.date_fin,
                branchOrder: mod.SousBranche?.Branche?.ordre || 999,
                branchName: mod.SousBranche?.Branche?.nom || '',
                sbOrder: mod.SousBranche?.ordre || 999,
                activities: []
            };
        }
        moduleMap[mod.id].activities.push({
            name: p.Activite.titre,
            order: p.Activite.ordre || 0,
            etat: p.etat,
            dateLimite: p.date_limite
        });
    });

    // ========================================
    // ÉTAPE 4 : TRI EN CASCADE (PRIORITÉ)
    // ========================================
    const sortedModules = Object.values(moduleMap).sort((a, b) => {
        // PRIORITÉ 1 : Date de Fin du Module (plus ancien en premier = échéance proche)
        if (a.dueDate && b.dueDate) {
            const dateComparison = new Date(a.dueDate) - new Date(b.dueDate);
            if (dateComparison !== 0) return dateComparison;
        } else if (a.dueDate) return -1; // Modules avec date en premier
        else if (b.dueDate) return 1;

        // PRIORITÉ 2 : Par Branche (ordre de branche)
        if (a.branchOrder !== b.branchOrder) {
            return a.branchOrder - b.branchOrder;
        }

        // PRIORITÉ 3 : Par Sous-Branche (ordre de sous-branche)
        if (a.sbOrder !== b.sbOrder) {
            return a.sbOrder - b.sbOrder;
        }

        // PRIORITÉ 4 : Par Ordre Alphabétique (nom du module)
        return a.title.localeCompare(b.title);
    });

    // Tri des activités au sein de chaque module (par ordre défini)
    sortedModules.forEach(m => {
        m.activities.sort((a, b) => a.order - b.order);
    });

    if (sortedModules.length === 0) return null;

    return { modules: sortedModules };
};
