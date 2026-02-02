import React from 'react';
import { X, Check, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValidationDebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studentName: string;
    action: string; // 'valide', 'non_valide', 'status_quo'
    initialScore: number;
    adjustment: number;
    finalScore: number;
}

const ValidationDebugModal: React.FC<ValidationDebugModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    studentName,
    action,
    initialScore,
    adjustment,
    finalScore
}) => {
    if (!isOpen) return null;

    const getActionLabel = () => {
        switch (action) {
            case 'valide': return { label: 'Validation', color: 'text-success', bg: 'bg-success/20' };
            case 'non_valide': return { label: 'Besoin d\'aide', color: 'text-purple-400', bg: 'bg-purple-500/20' };
            case 'status_quo': return { label: 'Status Quo', color: 'text-orange-400', bg: 'bg-orange-500/20' };
            default: return { label: action, color: 'text-white', bg: 'bg-white/10' };
        }
    };

    const actionInfo = getActionLabel();

    const getImpactDescription = () => {
        if (adjustment < 0) return "L'élève maîtrise : La probabilité de contrôle diminue.";
        if (adjustment > 0) return "L'élève a du mal : La probabilité de contrôle augmente.";
        return "Aucun changement sur la fréquence de contrôle.";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Activity size={18} className="text-primary" />
                        Debug Validation
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-grey-medium">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Context */}
                    <div className="text-center">
                        <p className="text-grey-medium text-sm mb-1">Élève concerné</p>
                        <h2 className="text-xl font-bold text-white">{studentName}</h2>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${actionInfo.bg} ${actionInfo.color}`}>
                            {actionInfo.label}
                        </div>
                    </div>

                    {/* Calculation Visual */}
                    <div className="bg-background rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-grey-medium">Probabilité actuelle</span>
                            <span className="font-mono font-bold text-white">{initialScore.toFixed(0)}%</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-grey-medium">Ajustement</span>
                            <div className={`font-mono font-bold flex items-center gap-1 ${adjustment > 0 ? 'text-red-400' : adjustment < 0 ? 'text-success' : 'text-grey-medium'}`}>
                                {adjustment > 0 ? <TrendingUp size={14} /> : adjustment < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                                {adjustment > 0 ? '+' : ''}{adjustment}%
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Nouvelle Probabilité</span>
                            <span className={`font-mono text-xl font-bold ${adjustment > 0 ? 'text-orange-400' : 'text-success'}`}>
                                {finalScore.toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="text-xs text-center text-grey-medium italic px-4">
                        "{getImpactDescription()}"
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="p-4 bg-background/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-grey-medium hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-black bg-white hover:bg-grey-light transition-colors flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValidationDebugModal;
