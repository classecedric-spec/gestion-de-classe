import React from 'react';
import { Trash2 } from 'lucide-react';

interface DashboardRecapModalProps {
    itemToDelete: any; // Using any for now, ideally typed as ProgressionItem
    onCancel: () => void;
    onConfirm: () => void;
}

export const DashboardRecapModal: React.FC<DashboardRecapModalProps> = ({
    itemToDelete,
    onCancel,
    onConfirm
}) => {
    if (!itemToDelete) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-surface border border-white/10 rounded-2xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">Retirer du suivi ?</h2>
                <p className="text-sm text-grey-medium mb-6">
                    Êtes-vous sûr de vouloir retirer <span className="text-white font-bold">{itemToDelete.eleve?.prenom} {itemToDelete.eleve?.nom}</span> de la liste de suivi ?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-danger hover:bg-danger/90 text-white rounded-xl font-bold shadow-lg shadow-danger/20 flex items-center justify-center gap-2"
                    >
                        Retirer
                    </button>
                </div>
            </div>
        </div>
    );
};
