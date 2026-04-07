/**
 * Nom du module/fichier : ISystemRepository.ts
 * 
 * Données en entrée : N/A (Interface technique).
 * 
 * Données en sortie : N/A (Contrat de services système).
 * 
 * Objectif principal : Définir quelles sont les actions de maintenance disponibles pour le système. C'est le "règlement intérieur" que doit respecter n'importe quel service de stockage (Supabase ou autre) pour être autorisé à gérer la maintenance de l'application.
 * 
 * Ce que ça définit : 
 *   - L'obligation de savoir réparer les progressions des élèves.
 *   - L'obligation de savoir injecter des données de test.
 *   - L'obligation de savoir tout supprimer proprement.
 */

export interface ISystemRepository {
    /**
     * Mission : Vérifier l'intégrité des tableaux de suivi des élèves.
     */
    checkAndFixProgressions(): Promise<number>;

    /**
     * Mission : Créer un "faux" univers de classe pour les tests.
     */
    generateDemoData(userId: string): Promise<void>;

    /**
     * Mission : Effacer toutes les données liées à un compte utilisateur.
     */
    hardReset(userId: string): Promise<void>;
}

/**
 * LOGIGRAMME DE CONTRAT :
 * 
 * 1. DÉFINITION -> L'interface dit : "Si tu veux être le dépôt système, tu dois savoir faire 'hardReset'".
 * 2. GARANTIE -> Cela garantit que le reste de l'application pourra toujours appeler ces fonctions de secours, peu importe comment elles sont codées derrière.
 */
