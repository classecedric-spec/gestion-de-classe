import { supabase } from './supabaseClient';
import { toast } from 'sonner';

/**
 * Helper générique pour exécuter des requêtes Supabase avec gestion d'erreurs
 * @param {Promise} query - La requête Supabase à exécuter
 * @param {string} errorMessage - Message d'erreur personnalisé
 * @returns {Promise} Les données ou lance une erreur
 */
export async function fetchWithErrorHandling(query, errorMessage = 'Erreur lors de la requête') {
    const { data, error } = await query;

    if (error) {
        console.error(errorMessage, error);
        toast.error(errorMessage);
        throw error;
    }

    return data;
}

/**
 * Récupère l'utilisateur actuellement connecté
 * @returns {Promise<Object>} L'utilisateur connecté
 */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        throw error;
    }

    if (!user) {
        throw new Error('Aucun utilisateur connecté');
    }

    return user;
}

/**
 * Récupère des données d'une table avec filtres optionnels
 * @param {string} table - Nom de la table
 * @param {Object} options - Options de requête
 * @returns {Promise<Array>} Les données
 */
export async function fetchTableData(table, options = {}) {
    const {
        select = '*',
        filters = [],
        orderBy = null,
        limit = null
    } = options;

    let query = supabase.from(table).select(select);

    // Appliquer les filtres
    filters.forEach(filter => {
        const [column, operator, value] = filter;
        query = query[operator](column, value);
    });

    // Tri
    if (orderBy) {
        const { column, ascending = true } = orderBy;
        query = query.order(column, { ascending });
    }

    // Limite
    if (limit) {
        query = query.limit(limit);
    }

    return fetchWithErrorHandling(
        query,
        `Erreur lors de la récupération des données de ${table}`
    );
}

/**
 * Insert
e des données dans une table
 * @param {string} table - Nom de la table
 * @param {Object|Array} data - Données à insérer
 * @returns {Promise} Résultat de l'insertion
 */
export async function insertData(table, data) {
    return fetchWithErrorHandling(
        supabase.from(table).insert(data).select(),
        `Erreur lors de l'insertion dans ${table}`
    );
}

/**
 * Met à jour des données dans une table
 * @param {string} table - Nom de la table
 * @param {Object} updates - Données à mettre à jour
 * @param {Array} filters - Filtres pour la mise à jour [[column, operator, value]]
 * @returns {Promise} Résultat de la mise à jour
 */
export async function updateData(table, updates, filters = []) {
    let query = supabase.from(table).update(updates);

    filters.forEach(filter => {
        const [column, operator, value] = filter;
        query = query[operator](column, value);
    });

    return fetchWithErrorHandling(
        query.select(),
        `Erreur lors de la mise à jour de ${table}`
    );
}

/**
 * Supprime des données d'une table
 * @param {string} table - Nom de la table
 * @param {Array} filters - Filtres pour la suppression [[column, operator, value]]
 * @returns {Promise} Résultat de la suppression
 */
export async function deleteData(table, filters = []) {
    let query = supabase.from(table).delete();

    filters.forEach(filter => {
        const [column, operator, value] = filter;
        query = query[operator](column, value);
    });

    return fetchWithErrorHandling(
        query,
        `Erreur lors de la suppression dans ${table}`
    );
}

/**
 * Récupère les étudiants de l'utilisateur actuel
 * @param {Object} options - Options supplémentaires (filters, orderBy, etc.)
 * @returns {Promise<Array>} Liste des étudiants
 */
export async function fetchUserStudents(options = {}) {
    const user = await getCurrentUser();

    const filters = [
        ['titulaire_id', 'eq', user.id],
        ...(options.filters || [])
    ];

    return fetchTableData('Eleve', {
        select: options.select || `
            id,
            nom,
            prenom,
            photo_base64,
            classe_id,
            niveau_id,
            date_naissance,
            Classe (nom),
            Niveau (nom)
        `,
        filters,
        orderBy: options.orderBy || { column: 'nom', ascending: true }
    });
}

/**
 * Récupère les groupes de l'utilisateur actuel
 * @returns {Promise<Array>} Liste des groupes
 */
export async function fetchUserGroups() {
    const user = await getCurrentUser();

    return fetchTableData('Groupe', {
        filters: [['user_id', 'eq', user.id]],
        orderBy: { column: 'nom', ascending: true }
    });
}

/**
 * Récupère les classes de l'utilisateur actuel
 * @returns {Promise<Array>} Liste des classes
 */
export async function fetchUserClasses() {
    const user = await getCurrentUser();

    return fetchTableData('Classe', {
        filters: [['titulaire_id', 'eq', user.id]],
        orderBy: { column: 'nom', ascending: true }
    });
}
