import React, { useState } from 'react';
import { Layers, GitBranch, Info, FileText } from 'lucide-react';
import { SubBranchWithParent } from '../services/subBranchService';
import { Avatar, EmptyState, Badge, CardInfo, CardTabs } from '../../../core';

interface SubBranchDetailsProps {
    selectedSubBranch: SubBranchWithParent | null;
    rightContentRef: React.RefObject<HTMLDivElement | null>;
    headerHeight?: number;
}

const SubBranchDetails: React.FC<SubBranchDetailsProps> = ({
    selectedSubBranch,
    rightContentRef,
    headerHeight
}) => {
    const [activeTab, setActiveTab] = useState('infos');

    if (!selectedSubBranch) {
        return (
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={Layers}
                    title="Sélectionnez une sous-branche"
                    description="Choisissez une sous-branche dans la liste pour voir ses détails."
                    size="md"
                />
            </div>
        );
    }

    const photo = (selectedSubBranch as any).photo_base64 || (selectedSubBranch as any).photo_url;

    return (
        <>
            <CardInfo
                ref={rightContentRef}
                height={headerHeight}
            >
                <div className="flex gap-5 items-center">
                    <Avatar
                        size="lg"
                        src={photo}
                        icon={Layers}
                        className="bg-surface border-4 border-background"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {selectedSubBranch.nom}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            {selectedSubBranch.Branche && (
                                <Badge variant="secondary" size="sm" className="bg-white/5">
                                    <GitBranch size={14} className="mr-2" />
                                    {selectedSubBranch.Branche.nom}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardInfo>

            <CardTabs
                tabs={[
                    { id: 'infos', label: 'Informations', icon: Info },
                    { id: 'modules', label: 'Modules liés', icon: FileText }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            >
                {activeTab === 'infos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Nom de la sous-branche</label>
                                <p className="text-lg text-white font-medium">{selectedSubBranch.nom}</p>
                            </div>
                            <div className="bg-surface/50 p-6 rounded-xl border border-white/5">
                                <label className="text-xs font-bold text-grey-medium uppercase block mb-2">Branche Appartenance</label>
                                <p className="text-white text-lg font-medium flex items-center gap-2">
                                    <GitBranch size={16} className="text-primary" />
                                    {selectedSubBranch.Branche?.nom || "Aucune"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'modules' && (
                    <div className="p-8 text-center text-grey-medium italic opacity-60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        La liste des modules liés sera disponible prochainement dans cette vue.
                    </div>
                )}
            </CardTabs>
        </>
    );
};

export default React.memo(SubBranchDetails);
