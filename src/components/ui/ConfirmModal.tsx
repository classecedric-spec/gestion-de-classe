import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

export type ConfirmModalVariant = 'warning' | 'danger' | 'info';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmModalVariant;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmation",
    message = "Êtes-vous sûr de vouloir continuer ?",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "warning"
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const variantStyles: Record<ConfirmModalVariant, { icon: string; button: string }> = {
        warning: {
            icon: 'text-yellow-500',
            button: 'bg-yellow-500 hover:bg-yellow-600 text-white'
        },
        danger: {
            icon: 'text-red-500',
            button: 'bg-red-500 hover:bg-red-600 text-white'
        },
        info: {
            icon: 'text-primary',
            button: 'bg-primary hover:bg-primary-light text-text-dark'
        }
    };

    const styles = variantStyles[variant] || variantStyles.info;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg bg-white/5", styles.icon)}>
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-text-main">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-grey-medium hover:text-white transition-colors"
                        aria-label="Fermer"
                        title="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-grey-light leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-grey-light hover:text-white transition-all font-medium"
                        type="button"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-bold transition-all",
                            styles.button
                        )}
                        type="button"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
