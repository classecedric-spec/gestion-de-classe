import React from 'react';
import { Loader2, RotateCcw, Play, Check } from 'lucide-react';
import clsx from 'clsx';
import { getStatusInfo } from '../../lib/helpers/mobileEncodingHelpers';

interface ActivityItemProps {
    activity: any;
    currentStatus: string;
    isSaving: boolean;
    onUpdateStatus: (activityId: string, newStatus: string) => void;
}

/**
 * Component for displaying an activity with action buttons
 */
export const ActivityItem: React.FC<ActivityItemProps> = ({
    activity,
    currentStatus,
    isSaving,
    onUpdateStatus
}) => {
    const statusInfo = getStatusInfo(currentStatus);
    const materials = activity.ActiviteMateriel?.map((am: any) => am.TypeMateriel?.acronyme).filter(Boolean) || [];

    return (
        <div className="bg-surface/60 border border-white/5 rounded-xl p-3">
            {/* Activity Info */}
            <div className="flex items-start gap-3 mb-3">
                <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    statusInfo.color
                )}>
                    {statusInfo.icon && <statusInfo.icon size={14} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">
                        {activity.titre}
                    </p>
                    {materials.length > 0 && (
                        <p className="text-[9px] text-grey-medium mt-0.5">
                            {materials.join(' • ')}
                        </p>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => onUpdateStatus(activity.id, 'a_commencer')}
                    disabled={isSaving}
                    className={clsx(
                        "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                        currentStatus === 'a_commencer'
                            ? "bg-white/20 text-white border border-white/20"
                            : "bg-white/5 text-grey-medium border border-white/5 hover:bg-white/10"
                    )}
                >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Reset
                </button>
                <button
                    onClick={() => onUpdateStatus(activity.id, 'en_cours')}
                    disabled={isSaving}
                    className={clsx(
                        "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                        currentStatus === 'en_cours'
                            ? "bg-primary text-black border border-primary"
                            : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                    )}
                >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    En cours
                </button>
                <button
                    onClick={() => onUpdateStatus(activity.id, 'termine')}
                    disabled={isSaving}
                    className={clsx(
                        "py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1",
                        currentStatus === 'termine'
                            ? "bg-success text-white border border-success"
                            : "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                    )}
                >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Fait
                </button>
            </div>
        </div>
    );
};
