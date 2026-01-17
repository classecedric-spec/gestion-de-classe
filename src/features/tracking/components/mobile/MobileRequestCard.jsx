import React from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getInitials } from '../../../../lib/utils';

const MobileRequestCard = ({
    req,
    isExpanded,
    helpers,
    onExpand,
    onStatusUpdate,
    onClear
}) => {
    return (
        <div
            onClick={() => !req.is_suivi && req.etat !== 'besoin_d_aide' && onExpand(req.id, req.activite?.id)}
            className={clsx(
                "bg-surface border border-white/10 rounded-2xl p-4 shadow-xl active:scale-[0.98] transition-all relative group",
                !req.is_suivi && req.etat !== 'besoin_d_aide' && "cursor-pointer",
                isExpanded && "ring-2 ring-primary/50 border-primary/50"
            )}
        >
            {/* Delete Button - For Aide (besoin_d_aide) AND Suivi */}
            {(req.is_suivi || req.etat === 'besoin_d_aide') && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(req); }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10"
                >
                    <X size={16} strokeWidth={3} />
                </button>
            )}

            <div className="flex w-full items-center gap-3">
                {/* Photo */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/5 shrink-0 bg-surface-light shadow-inner">
                    {req.eleve?.photo_base64 ? (
                        <img src={req.eleve.photo_base64} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-primary">
                            {getInitials(req.eleve)}
                        </div>
                    )}
                </div>

                {/* Text Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h2 className="text-base font-black text-white truncate leading-tight">
                        {req.eleve?.prenom} {req.eleve?.nom}
                    </h2>

                    {!req.is_suivi && req.activite?.Module?.nom && (
                        <div className="ml-[10%] w-[90%]">
                            <p className="text-[11px] text-primary/80 font-medium uppercase tracking-tight truncate">
                                {req.activite.Module.nom}
                            </p>
                        </div>
                    )}

                    {!req.is_suivi && req.activite?.titre && (
                        <div className="ml-[20%] w-[80%]">
                            <p className="text-[10px] text-grey-light font-medium truncate">
                                {req.activite.titre}
                            </p>
                        </div>
                    )}
                </div>

                {/* Badge Status */}
                <div className="shrink-0 flex items-center justify-end">
                    <div className={clsx(
                        "px-2 py-1 rounded-md font-black uppercase tracking-wider text-[10px] whitespace-nowrap",
                        req.is_suivi
                            ? "bg-primary text-black border border-primary"
                            : req.etat === 'a_verifier'
                                ? "bg-[#8B5CF6] text-white border border-[#8B5CF6]"
                                : req.etat === 'ajustement'
                                    ? "bg-orange-500 text-white border border-orange-500"
                                    : "bg-[#A0A8AD] text-white border border-[#A0A8AD]"
                    )}>
                        {req.is_suivi ? 'Suivi' : (req.etat === 'a_verifier' ? 'Vérif' : (req.etat === 'ajustement' ? 'Ajust.' : 'Aide'))}
                    </div>
                </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'non_valide'); }}
                            className="py-2.5 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-xl border border-danger/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            Non Valide
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'status_quo'); }}
                            className="py-2.5 bg-white/5 hover:bg-white/10 text-grey-medium hover:text-white rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            A refaire
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(req, 'valide'); }}
                            className="py-2.5 bg-success hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-success/20 text-[10px] font-black uppercase tracking-tighter transition-all"
                        >
                            Validé
                        </button>
                    </div>

                    {/* Helpers */}
                    {req.etat === 'besoin_d_aide' && (
                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Users size={12} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium">Peut t'aider :</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {helpers ? (
                                    helpers.length > 0 ? (
                                        helpers.map(helper => (
                                            <div key={helper.id} className="flex items-center gap-2 bg-white/5 px-2 py-1.5 rounded-xl border border-white/5 pr-3">
                                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                    {helper.photo_base64 ? (
                                                        <img src={helper.photo_base64} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-surface-light flex items-center justify-center text-[8px] font-black text-primary uppercase">
                                                            {getInitials(helper)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-grey-light truncate max-w-[100px]">
                                                    {helper.prenom} {helper.nom}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-grey-dark italic py-1">Personne n'a encore fini cette activité.</p>
                                    )
                                ) : (
                                    <div className="flex items-center gap-2 py-1">
                                        <Loader2 size={12} className="animate-spin text-primary" />
                                        <span className="text-[10px] font-bold text-grey-medium uppercase tracking-widest">Recherche...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileRequestCard;
