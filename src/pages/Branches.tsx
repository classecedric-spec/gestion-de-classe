/**
 * Nom du module/fichier : Branches.tsx
 * 
 * Données en entrée : 
 *   - Liste des matières (via le Hook `useBranches`).
 *   - Termes de recherche utilisateur.
 * 
 * Données en sortie : 
 *   - Interface de gestion des matières principales.
 *   - Actions de création, modification et suppression de branches.
 * 
 * Objectif principal : Offrir une page de configuration pour définir les grandes matières de l'école (ex: Français, Mathématiques, Éveil). C'est ici que l'enseignant organise son "arborescence" pédagogique. La page permet de classer les matières par glisser-déposer et d'accéder aux détails de chaque branche.
 * 
 * Ce que ça affiche : 
 *   - À gauche : Une barre de recherche et la liste ordonnable des matières.
 *   - À droite : Le panneau de détails de la matière sélectionnée (incluant ses sous-matières).
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { GitBranch } from 'lucide-react';
import { useBranches } from '../features/branches/hooks/useBranches';
import BranchList from '../features/branches/components/BranchList';
import BranchDetails from '../features/branches/components/BranchDetails';
import AddBranchModal from '../features/branches/components/AddBranchModal';
import { useInAppMigration } from '../hooks/useInAppMigration';
import { ConfirmModal, CardInfo, SearchBar, Badge } from '../core';

/**
 * Composant de page principal pour la gestion de l'arborescence des matières (Branches).
 */
const Branches: React.FC = () => {
    // On extrait toute la logique métier (données et actions) du Hook spécialisé
    const {
        loading,
        filteredBranches,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        subBranches,
        createBranch,
        updateBranch,
        deleteBranch,
        reorderBranches,
        reorderSubBranches
    } = useBranches();

    // Système de migration interne (synchronisation des données locales vers la base de données)
    useInAppMigration(filteredBranches, 'Branche', 'branche');
    useInAppMigration(subBranches, 'SousBranche', 'sousbranche');

    // États locaux pour gérer l'affichage des fenêtres surgissantes (Modales)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [branchToEdit, setBranchToEdit] = useState<any>(null);
    const [branchToDelete, setBranchToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- SYNCHRONISATION VISUELLE DES HAUTEURS ---
    // Ces références servent à s'assurer que les colonnes gauche et droite ont la même taille pour le design.
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        /** Recalcule la hauteur maximale entre les deux colonnes pour aligner l'interface. */
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
    }, [filteredBranches.length, selectedBranch, searchTerm]);

    // --- GESTIONS DES ACTIONS UTILISATEUR (HANDLERS) ---
    
    /** Ouvre la fenêtre de création d'une nouvelle matière. */
    const handleOpenCreate = () => {
        setBranchToEdit(null);
        setIsAddModalOpen(true);
    };

    /** Ouvre la fenêtre de modification pour une matière existante. */
    const handleEdit = (branch: any) => {
        setBranchToEdit(branch);
        setIsAddModalOpen(true);
    };

    /** Enregistre les données issues de la modale (création ou mise à jour). */
    const handleModalSubmit = async (branchData: any) => {
        if (branchToEdit) {
            await updateBranch(branchToEdit.id, branchData);
        } else {
            await createBranch(branchData);
        }
        setIsAddModalOpen(false);
    };

    /** Supprime définitivement une matière après confirmation. */
    const handleDeleteConfirm = async () => {
        if (!branchToDelete) return;
        setIsDeleting(true);
        const success = await deleteBranch(branchToDelete.id);
        setIsDeleting(false);
        if (success) {
            // Si on supprime la branche qu'on était en train de regarder, on désélectionne tout
            if (selectedBranch?.id === branchToDelete.id) {
                setSelectedBranch(null);
            }
            setBranchToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            
            {/* COLONNE GAUCHE : RECHErche ET LISTE DES MATIÈRES (Largeur 25%) */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <GitBranch className="text-primary" size={24} />
                            Branches
                        </h2>
                        <Badge variant="primary" size="xs">{filteredBranches.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher une branche..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                {/* Liste interactive permettant de cliquer ou de réorganiser les blocs */}
                <BranchList
                    branches={filteredBranches}
                    loading={loading}
                    selectedBranch={selectedBranch}
                    onSelect={setSelectedBranch}
                    onOpenAdd={handleOpenCreate}
                    onEdit={handleEdit}
                    onDelete={setBranchToDelete}
                    onReorder={reorderBranches}
                />
            </div>

            {/* COLONNE DROITE : DÉTAILS DE LA MATIÈRE SÉLECTIONNÉE (Largeur 75%) */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <BranchDetails
                    selectedBranch={selectedBranch}
                    subBranches={subBranches}
                    onReorderSub={reorderSubBranches}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* MODALES ET POPUPS DE CONFIRMATION */}
            <ConfirmModal
                isOpen={!!branchToDelete}
                onClose={() => setBranchToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer la branche ?"
                message={`Êtes-vous sûr de vouloir supprimer la branche "${branchToDelete?.nom}" ? Toutes les sous-branches associées seront supprimées.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            <AddBranchModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                branchToEdit={branchToEdit}
            />
        </div>
    );
};

export default Branches;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre la page des Branches.
 * 2. Il voit la liste de ses matières à gauche.
 * 3. S'il veut trouver une matière précise, il utilise la barre de recherche.
 * 4. S'il veut changer l'ordre (ex: mettre le Français en premier), il fait glisser la ligne correspondante.
 * 5. Quand il clique sur une matière :
 *    - Le panneau de droite s'actualise pour montrer les sous-matières (ex: Grammaire, Orthographe pour le Français).
 * 6. S'il clique sur l'icône de suppression (croix rouge) :
 *    - Une fenêtre de confirmation apparaît avant de supprimer définitivement la donnée.
 */
