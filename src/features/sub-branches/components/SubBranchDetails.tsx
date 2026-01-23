import React from 'react';
import { Layers, GitBranch } from 'lucide-react';
import { SubBranchWithParent } from '../services/subBranchService';

interface SubBranchDetailsProps {
    selectedSubBranch: SubBranchWithParent | null;
}

const SubBranchDetails: React.FC<SubBranchDetailsProps> = ({ selectedSubBranch }) => {
    if (!selectedSubBranch) {
        return (
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium">
                <Layers size={64} className="mb-4 opacity-50" />
                <p className="text-xl">Sélectionnez une sous-branche pour voir les détails</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0 overflow-hidden relative group">
                        {selectedSubBranch.photo_base64 ? (
                            <img src={selectedSubBranch.photo_base64} alt={selectedSubBranch.nom || ''} className="w-full h-full object-cover" />
                        ) : (
                            <Layers size={48} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-text-main mb-2">{selectedSubBranch.nom}</h1>
                        <div className="flex items-center gap-4 text-grey-medium">
                            {selectedSubBranch.Branche && (
                                <span className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm">
                                    <GitBranch size={14} />
                                    {selectedSubBranch.Branche.nom}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                    <Layers className="text-primary" size={24} />
                    Informations
                </h3>

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
        </div>
    );
};

export default React.memo(SubBranchDetails);
