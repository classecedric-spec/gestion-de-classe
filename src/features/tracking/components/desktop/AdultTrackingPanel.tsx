import React from 'react';
import { User as UserIcon, Activity, Plus, X, Trash2, ChevronDown, Loader2, Save } from 'lucide-react';
import { Adult, ActivityType, AdultActivity } from '../../hooks/useAdultTracking';

interface AdultTrackingPanelProps {
    adultActivities: AdultActivity[];
    showModal: boolean;
    allAdults: Adult[];
    activityTypes: ActivityType[];
    currentAdult: string | null;
    currentActivity: string | null;
    loadingAdults: boolean;
    onAddClick: () => void;
    onAdultChange: (adultId: string) => void;
    onActivityChange: (activityId: string) => void;
    onSave: (adultId: string, activityId: string) => void;
    onDelete: (id: string) => void;
    onCloseModal: () => void;
}

/**
 * AdultTrackingPanel
 * Panel for tracking adult activities with modal for adding
 */
const AdultTrackingPanel: React.FC<AdultTrackingPanelProps> = ({
    adultActivities,
    showModal,
    allAdults,
    activityTypes,
    currentAdult,
    currentActivity,
    loadingAdults,
    onAddClick,
    onAdultChange,
    onActivityChange,
    onSave,
    onDelete,
    onCloseModal
}) => {
    return (
        <>
            {/* Panel Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-light">Actions Adultes</span>
                    </div>
                    <button
                        onClick={onAddClick}
                        className="p-1 px-2.5 bg-primary/20 text-primary border border-primary/20 rounded-md hover:bg-primary/30 transition-all active:scale-95"
                        title="Ajouter une action adulte"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {adultActivities.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-grey-medium opacity-30 gap-2 grayscale">
                            <Activity size={24} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-center">Aucune action enregistrée aujourd'hui</span>
                        </div>
                    ) : (
                        adultActivities.map(act => (
                            <div key={act.id} className="bg-surface/40 border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-3 group animate-in slide-in-from-right-2 hover:bg-surface/60 transition-colors">
                                <div className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-[10px] shrink-0 shadow-inner">
                                    {act.Adulte?.prenom?.[0] || '?'}{act.Adulte?.nom?.[0] || '?'}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <p className="text-[11px] font-bold text-white truncate shrink-0">
                                        {act.Adulte?.prenom || 'Inconnu'}
                                    </p>
                                    <span className="w-1 h-1 rounded-full bg-white/10 shrink-0"></span>
                                    <p className="text-[10px] text-white font-bold uppercase tracking-wider truncate">
                                        {act.TypeActiviteAdulte?.label || 'Action'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDelete(act.id)}
                                    className="p-1.5 text-grey-medium hover:text-danger opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Adult Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <UserIcon className="text-primary" />
                                Action Adulte
                            </h2>
                            <button onClick={onCloseModal} className="text-grey-medium hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {/* Adult Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium ml-1">Choisir l'adulte</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                        <UserIcon size={16} />
                                    </div>
                                    <select
                                        value={currentAdult || ''}
                                        onChange={(e) => onAdultChange(e.target.value)}
                                        className="w-full bg-surface/40 border border-white/10 rounded-xl pl-10 pr-10 py-3.5 text-[11px] font-bold uppercase tracking-wider text-text-main appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer hover:bg-surface/60 group-hover:border-primary/30"
                                    >
                                        <option value="" disabled className="bg-surface">Sélectionner un adulte...</option>
                                        {allAdults.map(adult => (
                                            <option key={adult.id} value={adult.id} className="bg-surface">
                                                {adult.prenom} {adult.nom}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none group-hover:text-primary transition-colors">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>

                            {/* Activity Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium ml-1">Choisir l'action</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                        <Activity size={16} />
                                    </div>
                                    <select
                                        value={currentActivity || ''}
                                        onChange={(e) => onActivityChange(e.target.value)}
                                        className="w-full bg-surface/40 border border-white/10 rounded-xl pl-10 pr-10 py-3.5 text-[11px] font-bold uppercase tracking-wider text-text-main appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer hover:bg-surface/60 group-hover:border-primary/30"
                                    >
                                        <option value="" disabled className="bg-surface">Sélectionner une action...</option>
                                        {activityTypes.map(type => (
                                            <option key={type.id} value={type.id} className="bg-surface">
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none group-hover:text-primary transition-colors">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={!currentAdult || !currentActivity || loadingAdults}
                                onClick={() => currentAdult && currentActivity && onSave(currentAdult, currentActivity)}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-text-dark font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all disabled:opacity-30 active:scale-95 mt-4"
                            >
                                {loadingAdults ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Valider l'action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdultTrackingPanel;
