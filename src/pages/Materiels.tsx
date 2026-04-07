/**
 * Nom du module/fichier : Materiels.tsx
 * 
 * Données en entrée : 
 *   - L'état global du matériel via le hook `useMaterials`.
 * 
 * Données en sortie : 
 *   - Une interface complète avec une barre de recherche, une liste latérale et un panneau de détails.
 *   - Fenêtres surgissantes pour l'ajout, la modification et la confirmation de suppression.
 * 
 * Objectif principal : Offrir à l'enseignant un "Inventaire" ou un "Placard numérique". C'est ici qu'il gère tout l'équipement de la classe. L'écran est divisé pour permettre de chercher un objet à gauche et de voir instantanément à droite quelles leçons l'utilisent, sans changer de page.
 * 
 * Ce que ça orchestre : 
 *   - La synchronisation visuelle (hauteur des boîtes) pour que l'interface reste élégante.
 *   - L'ouverture des formulaires (Modales) selon les actions de l'utilisateur.
 *   - La sécurité lors de la suppression (demande de confirmation).
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Package } from 'lucide-react';
import { useMaterials } from '../features/materials/hooks/useMaterials';
import MaterialList from '../features/materials/components/MaterialList';
import MaterialDetails from '../features/materials/components/MaterialDetails';
import AddMaterialModal from '../features/materials/components/AddMaterialModal';
import { TypeMateriel } from '../features/materials/services/materialService';
import { ConfirmModal, CardInfo, Badge, SearchBar } from '../core';

/**
 * Page principale "Matériel".
 * Coordonne la liste, les détails et les actions CRUD.
 */
const Materiels: React.FC = () => {
    // Récupération de toute la logique métier depuis le "cerveau" (hook)
    const {
        filteredMateriels,
        loading,
        searchTerm,
        setSearchTerm,
        selectedMateriel,
        setSelectedMateriel,
        linkedActivities,
        loadingActivities,
        createMateriel,
        updateMateriel,
        deleteMateriel,
    } = useMaterials();

    // États locaux pour gérer l'affichage des fenêtres surgissantes
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [materielToEdit, setMaterielToEdit] = useState<TypeMateriel | null>(null);
    const [materielToDelete, setMaterielToDelete] = useState<TypeMateriel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Synchronisation de la Hauteur ---
    // Ces références permettent de s'assurer que les boîtes de gauche et de droite ont la même taille visuelle.
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
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
    }, [filteredMateriels.length, selectedMateriel, searchTerm]);

    // GESTIONNAIRES D'ACTIONS (Handlers)
    
    // Ouvre le formulaire pour créer un nouvel objet
    const handleOpenCreate = () => {
        setMaterielToEdit(null);
        setIsAddModalOpen(true);
    };

    // Ouvre le formulaire pour modifier un objet existant
    const handleOpenEdit = (materiel: TypeMateriel) => {
        setMaterielToEdit(materiel);
        setIsAddModalOpen(true);
    };

    // Enregistre les changements du formulaire (Création ou Modification)
    const handleModalSubmit = async (materialData: { nom: string; acronyme: string | null }) => {
        let success = false;
        if (materielToEdit) {
            success = await updateMateriel(materielToEdit.id, materialData);
        } else {
            success = await createMateriel(materialData);
        }

        if (success) {
            setIsAddModalOpen(false);
        }
    };

    // Exécute la suppression après confirmation de l'utilisateur
    const handleDeleteConfirm = async () => {
        if (!materielToDelete) return;
        setIsDeleting(true);
        const success = await deleteMateriel(materielToDelete.id);
        setIsDeleting(false);
        if (success) {
            if (selectedMateriel?.id === materielToDelete.id) {
                setSelectedMateriel(null);
            }
            setMaterielToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Colonne de gauche (25%) : Liste et Recherche */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                            <Package className="text-primary" size={24} />
                            Matériel
                        </h2>
                        <Badge variant="primary" size="xs">{filteredMateriels.length} Total</Badge>
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="space-y-4">
                        <SearchBar
                            placeholder="Rechercher un matériel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />
                    </div>
                </CardInfo>

                {/* Liste réelle des matériels */}
                <MaterialList
                    materiels={filteredMateriels}
                    loading={loading}
                    selectedMateriel={selectedMateriel}
                    onSelect={setSelectedMateriel}
                    onOpenAdd={handleOpenCreate}
                    onOpenEdit={handleOpenEdit}
                    onDelete={setMaterielToDelete}
                />
            </div>

            {/* Colonne de droite (75%) : Fiche Détail détaillée */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                <MaterialDetails
                    selectedMateriel={selectedMateriel}
                    linkedActivities={linkedActivities}
                    loadingActivities={loadingActivities}
                    rightContentRef={rightContentRef}
                    headerHeight={headerHeight}
                />
            </div>

            {/* FENÊTRES SURGISSANTES (MODALES) */}
            
            {/* Fenêtre de confirmation de suppression */}
            <ConfirmModal
                isOpen={!!materielToDelete}
                onClose={() => setMaterielToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Supprimer le matériel ?"
                message={`Êtes-vous sûr de vouloir supprimer "${materielToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Formulaire d'ajout/modification */}
            <AddMaterialModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleModalSubmit}
                materielToEdit={materielToEdit}
            />
        </div>
    );
};

export default Materiels;

/**
 * LOGIGRAMME DE PAGE :
 * 
 * 1. CHARGEMENT -> La page demande au "Cerveau" (Hook) de charger tout le matériel.
 * 2. AFFICHAGE -> Les colonnes de gauche (liste) et droite (détails) s'affichent.
 * 3. INTERACTION -> 
 *    - Si l'enseignant cherche : La liste de gauche se réduit instantanément.
 *    - Si l'enseignant clique sur un objet : Le détail de droite se met à jour pour montrer ses activités liées.
 *    - Si l'enseignant clique sur "Nouveau" : Un formulaire recouvre l'écran pour la saisie.
 * 4. MISE À JOUR -> Chaque action réussie force l'interface à se rafraîchir sans recharger toute la page.
 */
