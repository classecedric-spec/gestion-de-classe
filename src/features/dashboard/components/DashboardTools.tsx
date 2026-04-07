/**
 * Nom du module/fichier : DashboardTools.tsx
 * 
 * Données en entrée : 
 *   - selectedGroup : Le groupe (classe) sélectionné pour les outils de génération.
 *   - groups : Liste de toutes les classes de l'enseignant.
 *   - isGenerating : État de chargement lors de la création d'un PDF.
 *   - onOpenRandomPicker : Fonction pour lancer l'outil de tirage au sort (La Main Innocente).
 * 
 * Données en sortie : Un panneau composé de boutons d'accès rapide et d'outils utilitaires.
 * 
 * Objectif principal : Centraliser les "outils du quotidien" de l'enseignant. Ce composant combine :
 *   1. Des raccourcis vers les fonctions majeures (Appel, Suivi, Gestion des classes).
 *   2. Un centre de téléchargement pour générer des listes de devoirs/ateliers par classe.
 *   3. Des gadgets ludiques comme le tirage au sort d'un élève.
 */

import React from 'react';
import { Settings2, CheckSquare, LayoutList, GraduationCap, FileText, Users, Zap } from 'lucide-react';
import { Button, Select } from '../../../core';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Group } from '../../attendance/services/attendanceService';

interface DashboardToolsProps {
    selectedGroup: Group | null;
    groups: Group[];
    onGroupChange: (group: Group | undefined) => void;
    isGenerating: boolean;
    handleGenerateGroupTodoList: () => void;
    onOpenRandomPicker: () => void;
    onOpenHomework?: () => void;
    onOpenNoiseMeter?: () => void;
}

/**
 * Panneau d'outils et de raccourcis du tableau de bord.
 */
const DashboardTools: React.FC<DashboardToolsProps> = ({
    selectedGroup,
    groups,
    onGroupChange,
    isGenerating,
    handleGenerateGroupTodoList,
    onOpenRandomPicker,
}) => {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* --- SECTION 1 : RACCOURCIS DE CONFIGURATION --- */}
            <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-8">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                    <Settings2 className="text-primary" /> Configuration & Actions
                </h2>
                <div className="space-y-4">
                    <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                        <h3 className="text-xs font-black text-grey-medium uppercase tracking-widest mb-3">Accès Rapide</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'Faire l\'appel', icon: CheckSquare, path: '/dashboard/presence', color: 'bg-emerald-500' },
                                { label: 'Suivi Global', icon: LayoutList, path: '/dashboard/suivi', color: 'bg-primary' },
                                { label: 'Gestion Classes', icon: GraduationCap, path: '/dashboard/user/classes', color: 'bg-amber-500' }
                            ].map(action => (
                                <Button
                                    key={action.label}
                                    variant="ghost"
                                    onClick={() => navigate(action.path)}
                                    className="justify-start gap-4 p-4 border border-white/5 hover:bg-white/5"
                                >
                                    <div className={clsx("p-2 rounded-lg text-white shrink-0", action.color)}>
                                        <action.icon size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-text-main">{action.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECTION 2 : CENTRE DE TÉLÉCHARGEMENT & GADGETS --- */}
            <section className="md:col-span-2 bg-gradient-to-br from-surface to-background p-8 rounded-3xl border border-white/5">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-3 mb-8">
                    <FileText className="text-warning" /> Centre de téléchargement
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* GÉNÉRATEUR DE PDF : Création de listes de travail par classe */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                <Users size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">Listes par Groupe</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">Générez un livret A5 contenant les listes de travail pour chaque élève du groupe sélectionné.</p>

                        {/* Sélecteur de groupe pour la génération */}
                        <Select
                            label="Sélectionner un groupe"
                            value={selectedGroup?.id || ''}
                            onChange={(e: any) => {
                                const group = groups?.find(g => g.id === e.target.value);
                                onGroupChange(group);
                            }}
                            options={[
                                { value: '', label: 'Choisir un groupe...' },
                                ...(groups || []).map(group => ({ value: group.id, label: group.nom }))
                            ]}
                            fullWidth
                        />

                        <Button
                            onClick={handleGenerateGroupTodoList}
                            loading={isGenerating}
                            disabled={!selectedGroup}
                            className="w-full"
                        >
                            Lancer l'impression
                        </Button>
                    </div>

                    {/* LA MAIN INNOCENTE : Outil de tirage au sort aléatoire */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
                                <Zap size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">La Main Innocente</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">Tirage au sort d'un élève avec animation.</p>
                        <Button
                            onClick={onOpenRandomPicker}
                            variant="primary"
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            Lancer le tirage
                        </Button>
                    </div>

                    {/* EMPLACEMENT RÉSERVÉ : Modules en cours de développement */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                <CheckSquare size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">Check-up Devoirs</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">En développement...</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardTools;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. INITIALISATION : Le composant affiche les raccourcis vers les autres modules de l'application.
 * 2. NAVIGATION : Si l'enseignant clique sur "Faire l'appel", l'application change de page via `navigate`.
 * 3. SÉLECTION : L'enseignant choisit une classe dans la liste déroulante pour les outils PDF.
 * 4. GÉNÉRATION : Au clic sur "Imprimer", le service de génération de PDF est sollicité.
 * 5. DIVERTISSEMENT : Le bouton "La Main Innocente" ouvre une modale spéciale de tirage au sort.
 */
