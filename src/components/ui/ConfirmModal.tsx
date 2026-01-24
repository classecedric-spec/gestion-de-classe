import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button';

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
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmation",
    message = "Êtes-vous sûr de vouloir continuer ?",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "warning",
    isLoading = false
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        // Optionnellement différer onClose si isLoading est géré par l'appelant
        if (!isLoading) onClose();
    };

    const variantStyles: Record<ConfirmModalVariant, { icon: string }> = {
        warning: {
            icon: 'text-yellow-500'
        },
        danger: {
            icon: 'text-red-500'
        },
        info: {
            icon: 'text-primary'
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
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        loading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
