import React from 'react';
import clsx from 'clsx';

interface TBIHelpPanelProps {
    helpRequests: any[];
    onHelpStatusClick: (requestId: string) => void;
}

export const TBIHelpPanel: React.FC<TBIHelpPanelProps> = ({
    helpRequests,
    onHelpStatusClick
}) => {
    return (
        <div className="bg-surface/50 border-r border-white/10 flex flex-col overflow-hidden w-[40%]">
            <div className="h-[26px] px-2 bg-surface/90 border-b border-white/10 flex items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                    Demandes d'aide ({helpRequests.length})
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
                {helpRequests.map(request => (
                    <div key={request.id} className="mb-1 bg-white/5 rounded-lg p-2 border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 px-1">
                                <div className="text-[10px] font-bold text-white truncate">{request.eleve?.prenom} {request.eleve?.nom}</div>
                                <div className="text-[8px] text-primary/80 truncate">
                                    {request.activite?.Module?.nom ? `${request.activite.Module.nom} • ` : ''}
                                    {request.activite?.titre || "Suivi personnalisé"}
                                </div>
                            </div>
                            <button
                                onClick={() => onHelpStatusClick(request.id)}
                                className={clsx(
                                    "px-2 py-1 rounded text-[9px] font-bold shrink-0 hover:opacity-80",
                                    request.etat === 'besoin_d_aide' ? "bg-gray-400 text-white" : "bg-violet-500 text-white"
                                )}
                            >OK</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
