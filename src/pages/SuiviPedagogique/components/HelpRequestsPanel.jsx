import React from 'react';
import PropTypes from 'prop-types';
import { Check, Users, Loader2, X } from 'lucide-react';
import { getInitials } from '../../../lib/utils';
import clsx from 'clsx';
import { toast } from 'sonner';

/**
 * HelpRequestsPanel
 * Displays help requests with expansion for helpers
 */
const HelpRequestsPanel = ({
    helpRequests,
    expandedRequestId,
    helpersCache,
    itemToDelete,
    onExpand,
    onStatusClick,
    onSetItemToDelete
}) => {
    return (
        <>
            <div
                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                style={{ containerType: 'inline-size' }}
            >
                {helpRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-grey-medium opacity-50 space-y-2">
                        <Check size={24} />
                        <p className="text-xs">Aucun suivi en cours</p>
                    </div>
                ) : (
                    helpRequests.map(req => (
                        <div key={req.id} className="relative group/card">
                            {/* Delete Button */}
                            {req.etat !== 'a_verifier' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (req.is_suivi) {
                                            onSetItemToDelete(req);
                                        } else {
                                            onStatusClick(req.activite.id, 'a_commencer', req.eleve.id);
                                            toast("Retiré de la liste");
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 z-10 p-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-100 sm:opacity-0 group-hover/card:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                    title="Retirer"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}

                            <div
                                onClick={() => !req.is_suivi && req.etat === 'besoin_d_aide' && onExpand(req.id, req.activite?.id)}
                                className={clsx(
                                    "px-1.5 py-1.5 bg-surface rounded-xl border border-white/5 shadow-sm transition-all animate-in slide-in-from-bottom-2 group select-none hover:bg-surface/60",
                                    (!req.is_suivi && req.etat === 'besoin_d_aide') ? "cursor-pointer hover:border-white/20" : "cursor-default",
                                    expandedRequestId === req.id && "bg-surface-light border-primary/20 ring-1 ring-primary/10"
                                )}
                            >
                                <div className="flex w-full">
                                    {/* 0-20%: Photo Zone (Centered vertically) */}
                                    <div className="w-[20%] flex items-center justify-center p-0.5 shrink-0">
                                        <div className="w-full aspect-square rounded-full overflow-hidden border border-white/10 shadow-inner">
                                            {req.eleve?.photo_base64 ? (
                                                <img src={req.eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-surface-light flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {getInitials(req.eleve || {})}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 20-75%: Text Zone (Staircase effect, Centered vertically) */}
                                    <div className="w-[60%] flex flex-col justify-center pr-6 relative shrink-0">
                                        {/* Line 1: Student Name (Starts at 25%) */}
                                        <h4 className="font-bold text-white truncate w-full" style={{ fontSize: 'clamp(12px, 4.5cqw, 24px)' }}>
                                            {req.eleve?.prenom} {req.eleve?.nom}
                                        </h4>

                                        {/* Line 2: Module Name (Reduced indent) */}
                                        <div className="ml-[10%] w-[90%]">
                                            <p className="font-medium text-primary/80 truncate" style={{ fontSize: 'clamp(10px, 3.5cqw, 20px)' }}>
                                                {/* Fallback if module name not explicitly available */}
                                                {req.activite?.Module?.nom || 'Module'}
                                            </p>
                                        </div>

                                        {/* Line 3: Activity Name (Reduced indent) */}
                                        < div className="ml-[20%] w-[80%]">
                                            <p className="text-grey-light truncate" style={{ fontSize: 'clamp(9px, 3cqw, 18px)' }}>
                                                {req.activite?.titre || 'Activité'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 75-100%: Action Zone (Centered, 5px from edge) */}
                                    <div className="w-[20%] flex items-center justify-end pr-[5px] shrink-0">
                                        <div
                                            className={clsx(
                                                "px-2 py-1 rounded-md font-black uppercase tracking-wider transition-colors shadow-sm whitespace-nowrap",
                                                req.is_suivi
                                                    ? "bg-primary text-black border border-primary"
                                                    : (req.etat === 'a_verifier'
                                                        ? "bg-[#8B5CF6] text-white border border-[#8B5CF6]"
                                                        : "bg-[#A0A8AD] text-white border border-[#A0A8AD]")
                                            )}
                                            style={{ fontSize: 'clamp(8px, 2.5cqw, 16px)' }}
                                        >
                                            {req.is_suivi ? 'Suivi' : (req.etat === 'a_verifier' ? 'Vérif' : 'Aide')}
                                        </div>
                                    </div>
                                </div>

                                {/* Helpers expansion */}
                                {expandedRequestId === req.id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users size={10} className="text-primary" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-grey-medium">Aide possible :</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {helpersCache[req.id] ? (
                                                helpersCache[req.id].length > 0 ? (
                                                    helpersCache[req.id].map(helper => (
                                                        <div key={helper.id} className="flex items-center gap-1.5 bg-white/5 px-1.5 py-1 rounded-lg border border-white/5">
                                                            <div className="w-5 h-5 rounded-md overflow-hidden border border-white/10 shrink-0">
                                                                {helper.photo_base64 ? (
                                                                    <img src={helper.photo_base64} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-surface-light flex items-center justify-center text-[7px] font-bold text-primary">
                                                                        {getInitials(helper)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-grey-light truncate max-w-[100px]">
                                                                {helper.prenom} {helper.nom}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[9px] text-grey-dark italic">Aucun camarade n'a encore validé.</p>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 size={10} className="animate-spin text-primary" />
                                                    <span className="text-[9px] font-bold text-grey-medium uppercase tracking-widest">Recherche...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

HelpRequestsPanel.propTypes = {
    helpRequests: PropTypes.array.isRequired,
    expandedRequestId: PropTypes.string,
    helpersCache: PropTypes.object.isRequired,
    itemToDelete: PropTypes.object,
    onExpand: PropTypes.func.isRequired,
    onStatusClick: PropTypes.func.isRequired,
    onSetItemToDelete: PropTypes.func.isRequired
};

export default HelpRequestsPanel;
