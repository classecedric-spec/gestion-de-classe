/**
 * Nom du module/fichier : MaterialDetails.tsx
 * 
 * Données en entrée : 
 *   - `selectedMateriel` : L'objet choisi (ex: 'Règle') ou `null` si rien n'est sélectionné.
 *   - `linkedActivities` : Liste des leçons qui utilisent cet objet.
 *   - `loadingActivities` : État de chargement pendant la recherche des liens.
 * 
 * Données en sortie : 
 *   - Affichage structuré des informations dans le panneau de droite.
 * 
 * Objectif principal : Présenter une fiche complète sur un matériel spécifique. L'enseignant peut y voir le nom complet, l'acronyme, et surtout la liste de toutes les activités pédagogiques qui nécessitent cet objet. C'est l'outil indispensable pour savoir si un matériel est "indispensable" ou "libre".
 * 
 * Ce que ça affiche : 
 *   - Un en-tête avec l'icône, le nom et le nombre d'activités liées.
 *   - Un système d'onglets (Informations / Activités liées).
 *   - La liste cliquable des activités (nom de la leçon et son module).
 */

import React, { useState } from 'react';
import { Package, Sparkles, FileText, Info } from 'lucide-react';
import { TypeMateriel, MaterialActivity } from '../services/materialService';
import { Badge, Avatar, EmptyState, CardInfo, CardTabs } from '../../../core';

interface MaterialDetailsProps {
    selectedMateriel: TypeMateriel | null;
    linkedActivities: MaterialActivity[];
    loadingActivities: boolean;
    rightContentRef: React.RefObject<HTMLDivElement | null>;
    headerHeight?: number;
}

/**
 * Composant de vue détaillée pour un matériel.
 */
const MaterialDetails: React.FC<MaterialDetailsProps> = ({
    selectedMateriel,
    linkedActivities,
    loadingActivities,
    rightContentRef,
    headerHeight
}) => {
    const [activeTab, setActiveTab] = useState('infos');

    // Cas où rien n'est sélectionné dans la liste de gauche
    if (!selectedMateriel) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={Package}
                    title="Aucun matériel sélectionné"
                    description="Sélectionnez un matériel dans la liste pour voir ses détails et les activités associées."
                    size="md"
                />
            </div>
        );
    }

    return (
        <>
            {/* 1. En-tête des détails (Avatar + Nom) */}
            <CardInfo
                ref={rightContentRef}
                height={headerHeight}
            >
                <div className="flex gap-5 items-center">
                    <Avatar
                        size="lg"
                        icon={Package}
                        className="bg-surface border-4 border-background"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-cq-xl font-bold text-text-main truncate">
                                {selectedMateriel.nom}
                            </h2>
                            {selectedMateriel.acronyme && (
                                <Badge variant="secondary" size="sm" className="font-mono bg-white/5">
                                    {selectedMateriel.acronyme}
                                </Badge>
                            )}
                        </div>
                        <p className="text-cq-base text-grey-medium mt-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            Utilisé dans {linkedActivities.length} activité(s)
                        </p>
                    </div>
                </div>
            </CardInfo>

            {/* 2. Système d'onglets */}
            <CardTabs
                tabs={[
                    { id: 'infos', label: 'Informations', icon: Info },
                    { id: 'activities', label: 'Activités liées', icon: Sparkles }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            >
                {/* Onglet 1 : Infos Générales */}
                {activeTab === 'infos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Nom du matériel</label>
                                <p className="text-lg text-white font-medium">{selectedMateriel.nom}</p>
                            </div>
                            {selectedMateriel.acronyme && (
                                <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                    <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Acronyme</label>
                                    <p className="text-white text-lg font-mono font-medium">{selectedMateriel.acronyme}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Onglet 2 : Liste des activités (leçons) qui utilisent ce matériel */}
                {activeTab === 'activities' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingActivities ? (
                            <div className="flex justify-center p-8">
                                <Avatar loading size="md" initials="" />
                            </div>
                        ) : linkedActivities.length === 0 ? (
                            <EmptyState
                                icon={Sparkles}
                                title="Aucune activité"
                                description="Aucune activité n'utilise ce matériel pour le moment."
                                size="md"
                                className="border-2 border-dashed border-white/5 rounded-xl"
                            />
                        ) : (
                            linkedActivities.map(activity => (
                                <div
                                    key={activity.id}
                                    className="group flex items-center p-4 bg-surface/40 hover:bg-surface border border-white/5 hover:border-primary/20 rounded-xl transition-all"
                                >
                                    <div className="p-2 bg-background rounded-lg text-primary mr-4 opacity-70 group-hover:opacity-100">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">{activity.titre}</h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                            {activity.Module && (
                                                <p className="text-xs text-grey-medium flex items-center gap-1">
                                                    Module: <span className="text-white/70">{activity.Module.nom}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </CardTabs>
        </>
    );
};

export default React.memo(MaterialDetails);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ENTRÉE -> Le composant reçoit un `selectedMateriel`.
 * 2. CHARGEMENT -> S'il n'y en a pas, il affiche un message invitant à cliquer dans la liste de gauche.
 * 3. INFOS -> SI sélectionné : Il affiche les informations de base (Nom/Acronyme).
 * 4. RECHERCHE -> En parallèle, il surveille si des activités sont liées (via `linkedActivities`).
 * 5. AFFICHAGE -> L'enseignant peut basculer d'onglet pour voir soit les infos, soit la liste des leçons concernées.
 */
