import React from 'react';
import { Package, Sparkles, Loader2, FileText } from 'lucide-react';
import { TypeMateriel, MaterialActivity } from '../services/materialService';

interface MaterialDetailsProps {
    selectedMateriel: TypeMateriel | null;
    linkedActivities: MaterialActivity[];
    loadingActivities: boolean;
}

const MaterialDetails: React.FC<MaterialDetailsProps> = ({ selectedMateriel, linkedActivities, loadingActivities }) => {
    if (!selectedMateriel) {
        return (
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium p-8 text-center">
                <div className="w-24 h-24 bg-surface/50 rounded-full flex items-center justify-center mb-6">
                    <Package size={48} className="opacity-50" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">Aucun matériel sélectionné</h2>
                <p>Sélectionnez un matériel dans la liste pour voir ses détails et les activités associées.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0">
                        <Package size={48} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-text-main">{selectedMateriel.nom}</h1>
                            {selectedMateriel.acronyme && (
                                <span className="text-2xl font-mono text-white/50 bg-white/5 px-2 py-1 rounded-lg">
                                    [{selectedMateriel.acronyme}]
                                </span>
                            )}
                        </div>
                        <p className="text-grey-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Utilisé dans {linkedActivities.length} activité(s)
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20 space-y-8">

                {/* Information Section */}
                <div>
                    <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                        <Package className="text-primary" size={24} />
                        Informations
                    </h3>
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

                {/* Activities Section */}
                <div>
                    <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                        <Sparkles className="text-accent" size={24} />
                        Activités liées
                        <span className="text-xs bg-white/5 text-grey-medium px-2 py-0.5 rounded-full ml-auto normal-case font-normal border border-white/5">
                            {linkedActivities.length} activités
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        {loadingActivities ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : linkedActivities.length === 0 ? (
                            <div className="text-center p-8 bg-surface/30 rounded-xl border border-dashed border-white/10 text-grey-medium">
                                Aucune activité n'utilise ce matériel pour le moment.
                            </div>
                        ) : (
                            linkedActivities.map(activity => (
                                <div key={activity.id} className="group flex items-center p-4 bg-surface/50 hover:bg-surface border border-white/5 hover:border-primary/20 rounded-xl transition-all">
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

                                            {/* Material Acronyms */}
                                            {activity.ActiviteMateriel && activity.ActiviteMateriel.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    {activity.ActiviteMateriel.some(am => am.TypeMateriel?.acronyme) && (
                                                        <span className="text-xs text-grey-medium opacity-50 mx-1">|</span>
                                                    )}
                                                    {activity.ActiviteMateriel
                                                        .map(am => am.TypeMateriel)
                                                        .filter((tm): tm is NonNullable<typeof tm> => !!tm?.acronyme)
                                                        .map((tm) => (
                                                            <span
                                                                key={tm.id}
                                                                title={tm.nom}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-grey-light border border-white/10"
                                                            >
                                                                {tm.acronyme}
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MaterialDetails);
