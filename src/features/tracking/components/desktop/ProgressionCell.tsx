import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { getStatusShortLabel, getStatusLabel } from '../../../../lib/helpers/statusHelpers';

export type ProgressionStatus = 'a_commencer' | 'en_cours' | 'besoin_d_aide' | 'a_verifier' | 'ajustement' | 'termine';

interface ActivityLevel {
    niveau_id: string;
    statut_exigence?: string | null;
}

interface ActivityMaterial {
    TypeMateriel: {
        acronyme: string | null;
    } | null;
}

export interface Activity {
    id: string;
    titre: string;
    ActiviteNiveau?: ActivityLevel[];
    ActiviteMateriel?: ActivityMaterial[];
}

interface ProgressionCellProps {
    activity: Activity;
    currentStatus?: ProgressionStatus | string;
    onStatusClick: (activityId: string, status: ProgressionStatus, currentStatus: string) => void;
    studentLevelId?: string;
}

/**
 * ProgressionCell
 * Individual activity cell with status buttons
 */
const ProgressionCell: React.FC<ProgressionCellProps> = ({
    activity,
    currentStatus,
    onStatusClick,
    studentLevelId
}) => {
    // Filter activity by level
    if (studentLevelId) {
        const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
        if (activityLevels.length > 0 && !activityLevels.includes(studentLevelId)) {
            return null;
        }
    }

    const isLocked = currentStatus === 'a_verifier';

    const handleToggleStatus = (newStatus: ProgressionStatus) => {
        // Only lock if we are NOT trying to validate (moving to 'termine')
        if (isLocked && newStatus !== 'termine') return;

        const statusStr = typeof currentStatus === 'string' ? currentStatus : 'a_commencer';
        if (currentStatus === newStatus) {
            onStatusClick(activity.id, 'a_commencer', statusStr);
        } else {
            onStatusClick(activity.id, newStatus, statusStr);
        }
    };

    const isNotStarted = !currentStatus || currentStatus === 'a_commencer';

    return (
        <div className={clsx(
            "p-2.5 rounded-xl border transition-all flex flex-col gap-2.5 h-full",
            isLocked
                ? "bg-purple-900/10 border-purple-500/30 ring-1 ring-purple-500/10"
                : "bg-white/[0.03] border-white/5"
        )}>
            {/* Title Zone (Top, Full Width) */}
            <div className="w-full min-w-0">
                <span className={clsx(
                    "text-xs leading-tight transition-all text-left block",
                    isLocked ? "font-bold text-[#8B5CF6]" : (isNotStarted ? "font-bold underline text-white" : "font-semibold text-gray-400 opacity-80"),
                    currentStatus === 'termine' && "text-success opacity-100",
                    currentStatus === 'besoin_d_aide' && "text-grey-medium opacity-100",
                    currentStatus === 'ajustement' && "text-[#F59E0B] opacity-100"
                )}>
                    {activity.titre}
                    {activity.ActiviteMateriel && activity.ActiviteMateriel.length > 0 && (
                        <span className="ml-1 opacity-50 font-normal no-underline">
                            [{activity.ActiviteMateriel.map(am => am.TypeMateriel?.acronyme).filter(Boolean).join(', ')}]
                        </span>
                    )}
                </span>
            </div>

            {/* Buttons Zone (Bottom, One Line) */}
            <div className="grid grid-cols-3 gap-1.5 w-full mt-auto">
                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('besoin_d_aide')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border truncate px-1",
                        isLocked && "opacity-20 grayscale cursor-not-allowed",
                        currentStatus === 'besoin_d_aide'
                            ? "bg-[#A0A8AD] text-white border-[#A0A8AD] shadow-sm"
                            : "bg-black/20 border-white/5 text-grey-medium hover:border-grey-medium/40"
                    )}
                    title="Besoin d'aide"
                >
                    Aide
                </button>

                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('ajustement')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border truncate px-1",
                        isLocked && "opacity-20 grayscale cursor-not-allowed",
                        currentStatus === 'ajustement'
                            ? "bg-[#F59E0B] text-black border-[#F59E0B] shadow-sm"
                            : "bg-black/20 border-white/5 text-grey-medium hover:border-[#F59E0B]/40"
                    )}
                    title={getStatusLabel('ajustement')}
                >
                    {getStatusShortLabel('ajustement')}
                </button>

                <button
                    disabled={isLocked}
                    onClick={() => handleToggleStatus('termine')}
                    className={clsx(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-1 shrink-0 truncate px-1",
                        isLocked
                            ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm ring-2 ring-purple-500/50 scale-100 opacity-90 cursor-not-allowed"
                            : ((currentStatus === 'termine' || currentStatus === 'a_verifier')
                                ? (currentStatus === 'a_verifier'
                                    ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm"
                                    : "bg-success text-white border-success shadow-sm")
                                : "bg-black/20 border-white/5 text-grey-medium hover:border-success/40")
                    )}
                    title={currentStatus === 'termine' ? 'Validé' : (isLocked ? 'À vérifier' : 'Valider')}
                >
                    {isLocked ? (
                        <>
                            <ShieldCheck size={11} className="shrink-0" />
                            <span className="truncate">À vérifier</span>
                        </>
                    ) : (
                        <>
                            <Check size={11} className={clsx("shrink-0", currentStatus !== 'termine' && "opacity-50")} />
                            <span className="truncate">{currentStatus === 'termine' ? 'Validé' : 'Valider'}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default React.memo(ProgressionCell);
