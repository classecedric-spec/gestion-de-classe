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
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <Select
                    label="Groupe Actif"
                    options={groups.map(g => ({ value: g.id, label: g.nom }))}
                    value={selectedGroup?.id || ''}
                    onChange={e => onSelectGroup && onSelectGroup(groups.find(g => g.id === e.target.value))}
                    fullWidth
                />

                <div className="space-y-2">
                    <label className="text-xs font-bold text-grey-light uppercase tracking-wider">Configuration de Présence</label>
                    <div className="grid grid-cols-1 gap-2 p-1 bg-surface border border-white/10 rounded-xl max-h-[200px] overflow-y-auto custom-scrollbar">
                        {setups.map(s => (
                            <button
                                key={s.id}
                                disabled={isSetupLocked}
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
                        {isSetupLocked && (
                            <p className="p-3 text-[10px] text-primary bg-primary/5 rounded-b-lg font-bold uppercase tracking-wider">
                                Configuration verrouillée (Présences déjà encodées)
                            </p>
                        )}
                    </div>
                </div>

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

            <div className="mt-auto p-4 bg-surface/95 backdrop-blur-sm border-t border-white/10 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
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
