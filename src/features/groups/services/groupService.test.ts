/**
 * ============================================================
 * Nom du module/fichier : groupService.test.ts
 *
 * Données en entrée : Des données fictives de groupes (simulées par des "mocks"),
 *   injectées à la place de la vraie base de données.
 *
 * Données en sortie : Un rapport indiquant si chaque scénario testé a passé (✓)
 *   ou échoué (✗), avec le détail de ce qui ne va pas.
 *
 * Objectif principal : Être la "Suite de vérification automatique" du `groupService`.
 *   Ce fichier joue le rôle d'un technicien qualité : il appelle les fonctions du
 *   service avec des données fictives et vérifie que le résultat est bien celui attendu.
 *   Cela permet de s'assurer qu'une modification future ne casse pas ce qui marchait.
 *
 * Ce que ça affiche : Un rapport de tests dans le terminal (via `npm run test`).
 *   Exemple : ✓ getGroups should return groups list (2ms)
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from './groupService';
import { IGroupRepository } from '../repositories/IGroupRepository';
import { Tables } from '../../../types/supabase';

/**
 * On crée un "double fictif" (mock) de la base de données.
 * Chaque méthode est remplacée par une fausse fonction (`vi.fn()`) qui ne fait rien
 * par défaut, mais qu'on peut programmer pour retourner n'importe quelle valeur simulée.
 * Ainsi, les tests sont RAPIDES (pas de réseau) et PRÉVISIBLES (pas de données réelles).
 */
const mockRepository = {
    getGroups: vi.fn(),
    getGroup: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
} as unknown as IGroupRepository;

// Bloc principal regroupant tous les tests du GroupService.
describe('GroupService', () => {
    let groupService: GroupService;

    // Avant chaque test : on recrée un service propre et on efface les mémos des mocks.
    // Cela garantit que les tests sont indépendants et ne s'affectent pas mutuellement.
    beforeEach(() => {
        vi.clearAllMocks();
        groupService = new GroupService(mockRepository);
    });

    // === TEST 1 : Récupération de la liste des groupes ===
    describe('getGroups', () => {
        it('should return groups list', async () => {
            // On prépare le "faux serveur" pour retourner cette liste simulée.
            const mockGroups = [{ id: 'g1', nom: 'Groupe 1' }] as Tables<'Groupe'>[];
            vi.mocked(mockRepository.getGroups).mockResolvedValue(mockGroups);

            // On appelle la vraie méthode du service.
            const result = await groupService.getGroups();

            // On vérifie que le service a bien transmis la demande au dépôt.
            expect(mockRepository.getGroups).toHaveBeenCalled();
            // Et que le résultat reçu correspond à ce que le faux serveur a renvoyé.
            expect(result).toEqual(mockGroups);
        });
    });

    // === TEST 2 : Création d'un nouveau groupe ===
    describe('createGroup', () => {
        it('should create group successfully', async () => {
            // Le faux serveur est programmé pour renvoyer ce groupe "fraîchement créé".
            const newGroup = { id: 'g_new', nom: 'New Group' } as Tables<'Groupe'>;
            vi.mocked(mockRepository.createGroup).mockResolvedValue(newGroup);

            // On appelle la création avec des données en entrée.
            const result = await groupService.createGroup({ nom: 'New Group' } as any);

            // On vérifie que les bonnes données ont été transmises au dépôt.
            expect(mockRepository.createGroup).toHaveBeenCalledWith(expect.objectContaining({ nom: 'New Group' }));
            // Et que le résultat est bien le groupe créé par le faux serveur.
            expect(result).toEqual(newGroup);
        });
    });
});

/**
 * ============================================================
 * LOGIGRAMME — Flux logique de groupService.test.ts
 * ============================================================
 * 1. L'enseignant (ou le développeur) lance les tests avec la commande `npm run test`.
 *
 * 2. Le moteur de test (Vitest) découvre ce fichier car son nom se termine par `.test.ts`.
 *
 * 3. Pour chaque bloc `describe`, un groupe de tests est identifié.
 *    Pour chaque `it(...)`, un scénario précis est exécuté.
 *
 * 4. Avant chaque test individuel, `beforeEach` prépare un service propre
 *    et efface les données laissées par le test précédent.
 *
 * 5. TEST getGroups :
 *    - On dit au mock : "Quand on t'appelle, retourne cette liste fictive."
 *    - On appelle le service → il appelle le mock → on vérifie le résultat.
 *    - ✓ Si ça correspond → test "VERT" (succès)
 *    - ✗ Si ça ne correspond pas → test "ROUGE" (échec, le développeur doit corriger)
 *
 * 6. TEST createGroup : même logique, mais pour la création.
 *
 * 7. À la fin, un résumé s'affiche : "2 tests passés, 0 échouté."
 * ============================================================
 */
