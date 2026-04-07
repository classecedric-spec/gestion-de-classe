/**
 * Nom du module/fichier : SubBranches.tsx
 * 
 * Données en entrée : 
 *   - Liste des sous-branches (via le Hook `useSubBranches`).
 *   - Liste des branches parentes (via le Hook `useBranches`).
 * 
 * Données en sortie : 
 *   - Interface de gestion des spécialités ou "sous-matières".
 *   - Actions de création, modification et suppression de sous-branches.
 * 
 * Objectif principal : Offrir une vue d'ensemble et un outil de gestion pour toutes les sous-matières créées, indépendamment de leur branche parente. C'est l'endroit idéal pour faire du "nettoyage" ou de la création en masse de spécialités (ex: ajouter 'Dictée', 'Rédaction', 'Lecture' d'un coup).
 * 
 * Ce que ça affiche : 
 *   - À gauche : Une barre de recherche et la liste de toutes les sous-matières.
 *   - À droite : Les détails de la sous-matière sélectionnée (incluant sa branche parente).
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Layers } from 'lucide-react';
import { useSubBranches } from '../features/sub-branches/hooks/useSubBranches';
import { useBranches } from '../features/branches/hooks/useBranches';
import SubBranchList from '../features/sub-branches/components/SubBranchList';
import SubBranchDetails from '../features/sub-branches/components/SubBranchDetails';
import AddSubBranchModal from '../features/branches/components/AddSubBranchModal';
import { useInAppMigration } from '../hooks/useInAppMigration';
import { ConfirmModal, CardInfo, Badge, SearchBar } from '../core';

/**
 * Composant de page principal pour la gestion globale des sous-matières (Sous-branches).
 */
const SubBranches: React.FC = () => {
    // On récupère les données et les actions via le Hook dédié aux sous-matières
    const {
        filteredSubBranches,
        loading,
        searchTerm,
        setSearchTerm,
        selectedSubBranch,
        setSelectedSubBranch,
        createSubBranch,
        updateSubBranch,
        deleteSubBranch,
    } = useSubBranches();

    // On a aussi besoin des branches parentes pour pouvoir les proposer lors d'une création
    const { branches: availableBranches } = useBranches();

    // Système de migration pour assurer la cohérence des données local/serveur
    useInAppMigration(filteredSubBranches, 'SousBranche', 'sousbranche');

    // États pour gérer les fenêtres surgissantes
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subBranchToEdit, setSubBranchToEdit] = useState<any>(null);
    const [subBranchToDelete, setSubBranchToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- SYNCHRONISATION DES HAUTEURS POUR LE DESIGN ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        /** Aligne la colonne de gauche sur celle de droite (ou inversement) pour un aspect "pro". */
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [filteredSubBranches.length, selectedSubBranch, searchTerm]);

    // --- GESTIONNAIRES D'ACTIONS (HANDLERS) ---

    /** Ouvre la fenêtre pour ajouter une nouvelle sous-matière. */
    const handleOpenCreate = () => {
        setSubBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    /** Ouvre la fenêtre pour modifier une spécialité existante. */
    const handleEdit = (subBranch: any) => {
        setSubBranchToEdit(subBranch);
        setIsAddModalOpen(true);
    };

    /** Enregistre les changements (création ou modification). */
    const handleModalSubmit = async (subBranchData: any) => {
        let success = false;
        if (subBranchToEdit) {
            success = await updateSubBranch(subBranchToEdit.id, subBranchData);
        } else {
            success = await createSubBranch(subBranchData);
        }

        if (success) {
            setIsAddModalOpen(false);
        }
    };

    /** Confirme et exécute la suppression d'une sous-matière. */
    const handleDeleteConfirm = async () => {
        if (!subBranchToDelete) return;
        setIsDeleting(true);
        const success = await deleteSubBranch(subBranchToDelete.id);
        setIsDeleting(false);
        if (success) {
            // Si on supprime celle qu'on visualisait, on remet l'affichage à zéro
            if (selectedSubBranch?.id === subBranchToDelete.id) {
                setSelectedSubBranch(null);
            }
            setSubBranchToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            
            {/* COLONNE GAUCHE : RECHERCHE ET LISTE GLOBALE (25%) */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <Layers className="text-primary" size={24} />
                            Sous-branches
                        </h2>
                        <Badge variant="primary" size="xs">{filteredSubBranches.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher une sous-branche..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                {/* Liste de toutes les sous-matières affichées à plat */}
                <SubBranchList
                    subBranches={filteredSubBranches}
                    loading={loading}
                    selectedSubBranch={selectedSubBranch}
                    onSelect={setSelectedSubBranch}
                    onOpenAdd={handleOpenCreate}
                    onEdit={handleEdit}
                    onDelete={setSubBranchToDelete}
                />
            </div>

            {/* COLONNE DROITE : DÉTAILS ET APPARTENANCE (75%) */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <SubBranchDetails
                    selectedSubBranch={selectedSubBranch}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* MODALE DE SUPPRESSION */}
            <ConfirmModal
                isOpen={!!subBranchToDelete}
                onClose={() => setSubBranchToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer la sous-branche ?"
                message={`Êtes-vous sûr de vouloir supprimer la sous-branche "${subBranchToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* MODALE D'AJOUT / MODIFICATION */}
            <AddSubBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                branches={availableBranches}
                subBranchToEdit={subBranchToEdit}
            />
        </div>
    );
};

export default SubBranches;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur la page pour voir toutes ses spécialités (Sous-branches).
 * 2. Une liste complète est chargée, triée par nom ou par branche parente.
 * 3. Au clic sur une sous-matière (ex: 'Calcul') :
 *    - Le panneau de droite s'ouvre pour confirmer que 'Calcul' appartient aux 'Mathématiques'.
 * 4. Si l'enseignant veut créer une nouvelle spécialité :
 *    - Il ouvre la fenêtre d'ajout.
 *    - Il tape le nom (ex: 'Dictée') et choisit 'Français' comme parent.
 * 5. L'interface se met à jour instantanément pour montrer la nouvelle rattachée.
 */
