import React from 'react';
import { Layers, ChevronDown, ArrowRight } from 'lucide-react';
import { Card, Button } from '../../../core';

interface BulkIndexSectionProps {
    branches: any[];
    allStudents: any[];
    selectedBulkBranch: string;
    setSelectedBulkBranch: (value: string) => void;
    selectedBulkIndex: number;
    setSelectedBulkIndex: (value: number) => void;
    isUpdatingBulk: boolean;
    isLoadingBulkData: boolean;
    handleBulkAdjustIndices: (adjustment: number) => Promise<void>;
    handleBulkUpdateIndices: () => Promise<void>;
}

export const BulkIndexSection: React.FC<BulkIndexSectionProps> = ({
    branches,
    allStudents,
    selectedBulkBranch,
    setSelectedBulkBranch,
    selectedBulkIndex,
    setSelectedBulkIndex,
    isUpdatingBulk,
    isLoadingBulkData,
    handleBulkAdjustIndices,
    handleBulkUpdateIndices
}) => {
    return (
        <Card variant="glass" className="p-6">
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Layers size={20} className="text-primary" /> Mise à jour groupée des Indices
            </h2>
            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Branche</label>
                        <div className="relative">
                            <select
                                title="Sélectionner la branche pour la mise à jour groupée"
                                value={selectedBulkBranch}
                                onChange={(e) => setSelectedBulkBranch(e.target.value)}
                                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer pr-10"
                            >
                                <option value="">Sélectionner une branche</option>
                                {branches.map((b: any) => (
                                    <option key={b.id} value={b.id}>{b.nom}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-64 space-y-2">
                        <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Indice de performance</label>
                        <div className="relative">
                            <select
                                title="Sélectionner l'indice de performance cible"
                                value={selectedBulkIndex}
                                onChange={(e) => setSelectedBulkIndex(parseInt(e.target.value))}
                                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer pr-10"
                            >
                                <option value={100}>100% (Tout vérifier)</option>
                                <option value={75}>75% (3/4)</option>
                                <option value={66}>66% (2/3)</option>
                                <option value={50}>50% (1/2)</option>
                                <option value={33}>33% (1/3)</option>
                                <option value={25}>25% (1/4)</option>
                                <option value={0}>0% (Aucun)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-white/5 gap-4">
                    <div className="flex-1 space-y-1">
                        <p className="text-[11px] text-grey-medium leading-tight max-w-md">
                            <span className="text-warning font-bold">Attention:</span> Cette action modifiera l'indice pour <span className="text-white font-bold">{allStudents.length} élèves</span>.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                            <button
                                onClick={() => handleBulkAdjustIndices(-10)}
                                disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                                className="px-4 py-2 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-black disabled:opacity-30"
                            >
                                -10%
                            </button>
                            <button
                                onClick={() => handleBulkAdjustIndices(10)}
                                disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                                className="px-4 py-2 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-black disabled:opacity-30"
                            >
                                +10%
                            </button>
                        </div>
                        <Button
                            onClick={handleBulkUpdateIndices}
                            disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                            loading={isUpdatingBulk}
                            icon={ArrowRight}
                            className="flex-1 md:flex-none"
                        >
                            Fixer à {selectedBulkIndex}%
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
