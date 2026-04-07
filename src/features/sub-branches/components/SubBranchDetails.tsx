/**
 * Nom du module/fichier : SubBranchDetails.tsx
 * 
 * Données en entrée : 
 *   - `selectedSubBranch` : La spécialité choisie (ex: 'Grammaire').
 * 
 * Données en sortie : 
 *   - Un panneau d'affichage avec le détail de la sous-matière.
 *   - Information sur la branche parente.
 * 
 * Objectif principal : Montrer la fiche d'identité d'une spécialité (sous-branche). C'est ici qu'on vérifie à quelle grande catégorie elle appartient et, plus tard, quels modules d'apprentissage y sont rattachés.
 * 
 * Ce que ça affiche : 
 *   - Le logo et le nom de la spécialité.
 *   - Un badge avec le nom de la matière parente.
 *   - Des onglets pour voir les informations détaillées ou les contenus liés.
 */

import React, { useState } from 'react';
import { Layers, GitBranch, Info, FileText } from 'lucide-react';
import { SubBranchWithParent } from '../services/subBranchService';
import { Avatar, EmptyState, Badge, CardInfo, CardTabs } from '../../../core';

interface SubBranchDetailsProps {
    selectedSubBranch: SubBranchWithParent | null;
    rightContentRef: React.RefObject<HTMLDivElement | null>;
    headerHeight?: number;
}

/**
 * Composant présentant les détails d'une sous-branche et son lien de parenté.
 */
const SubBranchDetails: React.FC<SubBranchDetailsProps> = ({
    selectedSubBranch,
    rightContentRef,
    headerHeight
}) => {
    // Gestion de la navigation par onglets
    const [activeTab, setActiveTab] = useState('infos');

    // Message d'attente si rien n'est sélectionné
    if (!selectedSubBranch) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={Layers}
                    title="Sélectionnez une sous-branche"
                    description="Choisissez une sous-branche dans la liste pour voir ses détails."
                    size="md"
                />
            </div>
        );
    }

    const photo = (selectedSubBranch as any).photo_base64 || (selectedSubBranch as any).photo_url;

    return (
        <>
            {/* -- EN-TÊTE : IDENTITÉ DE LA SOUS-BRANCHE -- */}
            <CardInfo
                ref={rightContentRef}
                height={headerHeight}
            >
                <div className="flex gap-5 items-center">
                    <Avatar
                        size="lg"
                        src={photo}
                        icon={Layers}
                        className="bg-surface border-4 border-background"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {selectedSubBranch.nom}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            {/* Rappel de la branche parente via un badge */}
                            {selectedSubBranch.Branche && (
                                <Badge variant="secondary" size="sm" className="bg-white/5">
                                    <GitBranch size={14} className="mr-2" />
                                    {selectedSubBranch.Branche.nom}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardInfo>

            {/* -- CONTENU : DÉTAILS ET MODULES -- */}
            <CardTabs
                tabs={[
                    { id: 'infos', label: 'Informations', icon: Info },
                    { id: 'modules', label: 'Modules liés', icon: FileText }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            >
                {/* ONGLET 1 : FICHE TECHNIQUE */}
                {activeTab === 'infos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Nom de la sous-branche</label>
                                <p className="text-lg text-white font-medium">{selectedSubBranch.nom}</p>
                            </div>
                            <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Branche Appartenance</label>
                                <p className="text-white text-lg font-medium flex items-center gap-2">
                                    <GitBranch size={16} className="text-primary" />
                                    {selectedSubBranch.Branche?.nom || "Aucune"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ONGLET 2 : EXTENSIONS FUTURES */}
                {activeTab === 'modules' && (
                    <div className="p-8 text-center text-grey-medium italic opacity-60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        La liste des modules liés sera disponible prochainement dans cette vue.
                    </div>
                )}
            </CardTabs>
        </>
    );
};

export default React.memo(SubBranchDetails);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant choisit la sous-matière "Orthographe".
 * 2. Le composant s'actualise avec les données de "Orthographe".
 * 3. Il affiche un grand logo "Orthographe" et un badge mentionnant "Français" (son parent).
 * 4. L'enseignant consulte dans l'onglet "Informations" le résumé des liens hiérarchiques.
 * 5. L'enseignant sait alors exactement où se situe cette spécialité dans son organisation scolaire.
 */
