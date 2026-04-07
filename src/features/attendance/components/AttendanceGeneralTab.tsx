/**
 * Nom du module/fichier : AttendanceGeneralTab.tsx
 * 
 * Données en entrée : 
 *   - groups : Liste des classes/groupes d'élèves.
 *   - selectedGroup : Le groupe actuellement choisi par l'enseignant.
 *   - setups : Liste des types d'appels configurés (Matin, Cantine, etc.).
 *   - isSetupLocked : Indique si l'appel a déjà été validé (verrouillage de sécurité).
 * 
 * Données en sortie : 
 *   - Événements de sélection (changement de groupe ou de type d'appel).
 *   - Commandes de copie (recopier le matin vers l'après-midi).
 * 
 * Objectif principal : Fournir l'interface de "pilotage" de l'appel. C'est ici que l'enseignant choisit sa classe et le moment de la journée. Le composant permet aussi des actions de productivité comme le transfert rapide des présences du matin vers l'après-midi.
 */

import React from 'react';
import { Select } from '../../../core';
import { Settings, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { Group, SetupPresence } from '../services/attendanceService';
import { Button } from '../../../core';

interface AttendanceGeneralTabProps {
    groups: Group[];
    selectedGroup: Group | null;
    onSelectGroup?: (group: Group | undefined) => void;
    setups: SetupPresence[];
    selectedSetup: SetupPresence | null;
    onSelectSetup?: (setup: SetupPresence) => void;
    isSetupLocked: boolean;
    onUnlockEditing: () => void;
    onCopyPeriod: (source: string, target: string) => void;
    setConfirmModal: (state: any) => void;
}

/**
 * Composant d'onglet pour les réglages généraux de l'appel en cours.
 */
export const AttendanceGeneralTab: React.FC<AttendanceGeneralTabProps> = ({
    groups,
    selectedGroup,
    onSelectGroup,
    setups,
    selectedSetup,
    onSelectSetup,
    isSetupLocked,
    onUnlockEditing,
    onCopyPeriod,
    setConfirmModal
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* --- SECTION 1 : CHOIX DU GROUPE ET DU TYPE D'APPEL --- */}
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Menu déroulant pour changer de classe */}
                <Select
                    label="Groupe Actif"
                    options={groups.map(g => ({ value: g.id, label: g.nom }))}
                    value={selectedGroup?.id || ''}
                    onChange={e => onSelectGroup && onSelectGroup(groups.find(g => g.id === e.target.value))}
                    fullWidth
                />

                {/* Liste visuelle des types d'appels (Matin, Après-midi, etc.) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-grey-light uppercase tracking-wider">Configuration de Présence</label>
                    <div className="grid grid-cols-1 gap-2 p-1 bg-surface border border-white/10 rounded-xl max-h-[200px] overflow-y-auto custom-scrollbar">
                        {setups.map(s => (
                            <button
                                key={s.id}
                                disabled={isSetupLocked} // On ne peut plus changer de type si l'appel est commencé/verrouillé
                                onClick={() => onSelectSetup && onSelectSetup(s)}
                                className={clsx(
                                    "flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all text-left",
                                    selectedSetup?.id === s.id
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "hover:bg-white/5 text-grey-light border border-transparent",
                                    isSetupLocked && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isSetupLocked && selectedSetup?.id === s.id && <Settings size={14} className="animate-pulse" />}
                                    <span>{s.nom}</span>
                                </div>
                                {selectedSetup?.id === s.id && <Check size={16} />}
                            </button>
                        ))}
                        
                        {/* Message d'information si le verrouillage est actif */}
                        {isSetupLocked && (
                            <p className="p-3 text-[10px] text-primary bg-primary/5 rounded-b-lg font-bold uppercase tracking-wider">
                                Configuration verrouillée (Présences déjà encodées)
                            </p>
                        )}
                    </div>
                </div>

                {/* Bouton de secours pour forcer la modification en cas d'erreur de saisie */}
                <div className="pt-4 border-t border-white/10">
                    <button
                        onClick={onUnlockEditing}
                        className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-dashed border-primary/30 hover:border-primary transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <Settings size={18} />
                        <span>Réactiver l'édition des présences</span>
                    </button>
                </div>
            </div>

            {/* --- SECTION 2 : RACCOURCIS DE COPIE (Matin <-> Après-midi) --- */}
            <div className="mt-auto p-4 bg-surface/95 backdrop-blur-sm border-t border-white/10 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                    {/* Copie Matin vers Après-midi */}
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (!selectedGroup || !selectedSetup) return;
                            setConfirmModal({
                                isOpen: true,
                                title: "Copier les présences",
                                message: "Voulez-vous copier les données du matin vers l'après-midi ? Les données existantes de l'après-midi seront remplacées.",
                                onConfirm: () => onCopyPeriod('matin', 'apres_midi')
                            });
                        }}
                        className="bg-surface/50 border-white/10 hover:border-white/20"
                        icon={ChevronRight}
                    >
                        Matin → AM
                    </Button>

                    {/* Copie Après-midi vers Matin (cas plus rare) */}
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (!selectedGroup || !selectedSetup) return;
                            setConfirmModal({
                                isOpen: true,
                                title: "Copier les présences",
                                message: "Voulez-vous copier les données de l'après-midi vers le matin ? Les données existantes du matin seront remplacées.",
                                onConfirm: () => onCopyPeriod('apres_midi', 'matin')
                            });
                        }}
                        className="bg-surface/50 border-white/10 hover:border-white/20"
                        icon={ChevronLeft}
                    >
                        AM → Matin
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre l'onglet des réglages généraux.
 * 2. Il sélectionne sa classe (ex: 'GS').
 * 3. Il choisit le type d'appel (ex: 'Matin').
 * 4. Si des présences ont déjà été saisies, le système "verrouille" le choix pour éviter les accidents.
 * 5. Si l'enseignant veut gagner du temps l'après-midi :
 *    - Il clique sur "Matin → AM".
 *    - Une fenêtre de confirmation apparaît.
 *    - Si validé, toutes les présences du matin sont dupliquées pour l'après-midi.
 */
