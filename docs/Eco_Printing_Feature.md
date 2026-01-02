# Nouvelles Fonctionnalités : Impression Éco (A5)

## Résumé
J'ai ajouté une nouvelle option d'impression pour les listes de travail des groupes, permettant d'économiser du papier en imprimant deux fiches élèves par page A4.

## Changements Apportés
1.  **Nouveau Bouton "Éco (A5)"** : Ajouté dans l'onglet "Boutons d'action" de la page Groupe.
2.  **Logique de Fusion (2-up)** : 
    *   Le système génère d'abord les fiches individuelles.
    *   Il crée ensuite un nouveau document A4 en mode **Paysage**.
    *   Il place **2 fiches A5** (redimensionnées) côte à côte sur chaque page A4.
    *   Une **ligne noire verticale** est dessinée au centre pour faciliter le découpage.
3.  **Pagination Intelligente** : Les numéros de page (ex: 1/1) restent spécifiques à chaque élève, même une fois fusionnés.

## Utilisation
1.  Allez sur la page d'un Groupe.
2.  Cliquez sur l'onglet **"Boutons d'action"**.
3.  Cliquez sur **"Éco (A5)"**.
4.  Imprimez le PDF généré en taille réelle (A4 Paysage). Vous obtiendrez 2 listes par feuille.

## Fichiers Modifiés
*   `src/pages/Groups.jsx` : Logique de génération et interface utilisateur.
