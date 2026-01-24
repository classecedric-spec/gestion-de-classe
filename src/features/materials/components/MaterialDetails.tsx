import React from 'react';
import { Package, Sparkles, FileText } from 'lucide-react';
import { TypeMateriel, MaterialActivity } from '../services/materialService';
import { Badge, Avatar, EmptyState } from '../../../components/ui';

interface MaterialDetailsProps {
    selectedMateriel: TypeMateriel | null;
    linkedActivities: MaterialActivity[];
    loadingActivities: boolean;
}

const MaterialDetails: React.FC<MaterialDetailsProps> = ({ selectedMateriel, linkedActivities, loadingActivities }) => {
    if (!selectedMateriel) {
        return (
            <EmptyState
                icon={Package}
                title="Aucun matériel sélectionné"
                description="Sélectionnez un matériel dans la liste pour voir ses détails et les activités associées."
                size="lg"
                className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl"
            />
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="xl"
                        icon={Package}
                        className="bg-surface border-4 border-background"
                    />
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold text-text-main">{selectedMateriel.nom}</h1>
                            {selectedMateriel.acronyme && (
                                <Badge variant="secondary" size="md" className="font-mono">
                                    {selectedMateriel.acronyme}
                                </Badge>
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
                        <Badge variant="secondary" size="sm" className="ml-auto">
                            {linkedActivities.length} activités
                        </Badge>
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        {loadingActivities ? (
                            <div className="flex justify-center p-8">
                                <Avatar loading size="md" initials="" />
                            </div>
                        ) : linkedActivities.length === 0 ? (
                            <EmptyState
                                icon={Sparkles}
                                title="Aucune activité"
                                description="Aucune activité n'utilise ce matériel pour le moment."
                                size="md"
                                className="border-2 border-dashed border-white/5 rounded-xl"
                            />
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
                                                            <Badge
                                                                key={tm.id}
                                                                variant="secondary"
                                                                size="sm"
                                                                className="font-mono"
                                                            >
                                                                {tm.acronyme}
                                                            </Badge>
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
