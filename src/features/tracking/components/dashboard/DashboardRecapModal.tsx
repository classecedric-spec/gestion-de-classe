/**
 * Nom du module/fichier : DashboardRecapModal.tsx
 * 
 * Données en entrée : 
 *   - `itemToDelete` : L'objet représentant le travail d'un élève que l'enseignant souhaite retirer de sa vue.
 *   - `onCancel` : Fonction pour fermer la modale sans action.
 *   - `onConfirm` : Fonction pour valider la suppression de l'élément.
 * 
 * Données en sortie : 
 *   - Une fenêtre de confirmation (pop-up) qui surgit au centre du tableau de bord.
 * 
 * Objectif principal : Servir de "Filet de sécurité" (Garde-fou). Avant de supprimer un élève du suivi en cours, l'application demande une confirmation visuelle pour éviter les erreurs de manipulation.
 * 
 * Ce que ça affiche : Une boîte élégante avec une icône de corbeille rouge, le nom du module et un avertissement clair demandant si l'on veut vraiment retirer l'élément de la liste.
 */

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DashboardRecapModalProps {
    itemToDelete: any; // Utilise any pour l'instant, idéalement typé via ProgressionItem.
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Fenêtre de confirmation pour le retrait d'un élément du suivi.
 */
export const DashboardRecapModal: React.FC<DashboardRecapModalProps> = ({
    itemToDelete,
    onCancel,
    onConfirm
}) => {
    // Si aucun élément n'est en attente de suppression, ce composant est "invisible"
    if (!itemToDelete) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                {/* Icône d'alerte visuelle (Corbeille rouge) */}
                <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                </div>
                
                {/* Message de confirmation personnalisé */}
                <h2 className="text-xl font-bold text-text-main mb-2">Retirer du suivi ?</h2>
                <p className="text-sm text-grey-medium mb-6">
                    Êtes-vous sûr de vouloir retirer <span className="text-white font-bold">{itemToDelete.eleve?.prenom} {itemToDelete.eleve?.nom}</span> de la liste de suivi ?
                </p>

                {/* Boutons de commande */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                    >
                        Retirer
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant survole une fiche élève sur le dashboard et clique sur la petite icône de suppression.
 * 2. L'application stocke l'élève concerné dans l'état `itemToDelete`.
 * 3. Cette fenêtre `DashboardRecapModal` surgit immédiatement au centre de l'écran avec un fond flouté.
 * 4. L'enseignant lit le message et vérifie qu'il s'agit du bon élève (ex: Julie).
 * 5. Décision :
 *    - S'il clique sur "Annuler" : la fenêtre se ferme et Julie reste dans la liste.
 *    - S'il clique sur "Retirer" : l'application lance l'action de suppression en base de données et Julie disparaît de l'écran.
 */
export default DashboardRecapModal;
