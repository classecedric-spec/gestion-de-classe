import React, { useEffect, ReactNode, FormEvent } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export type BaseModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: BaseModalSize;
    closeOnBackdrop?: boolean;
    showCloseButton?: boolean;
    className?: string;
}

/**
 * BaseModal - Composant modal réutilisable
 * Fournit structure, animations et gestion des événements communs
 */
const BaseModal: React.FC<BaseModalProps> & { Footer: React.FC<BaseModalFooterProps> } = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnBackdrop = false,
    showCloseButton = true,
    className
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes: Record<BaseModalSize, string> = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-[95vw]'
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={clsx(
                    'bg-surface rounded-2xl shadow-2xl w-full animate-in zoom-in-95 duration-200',
                    'border border-border/10 overflow-hidden flex flex-col max-h-[90vh]',
                    sizes[size],
                    className
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-border/10 bg-input/30">
                        {title && (
                            <h2 className="text-xl font-black uppercase tracking-wide text-text-main">
                                {title}
                            </h2>
                        )}

                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 text-grey-medium hover:text-text-main transition-all active:scale-95"
                                aria-label="Fermer"
                                title="Fermer"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body - scrollable */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-border/10 bg-input/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export interface BaseModalFooterProps {
    onCancel: () => void;
    onConfirm?: (e: FormEvent | React.MouseEvent) => void;
    confirmText?: string;
    cancelText?: string;
    confirmDisabled?: boolean;
    confirmLoading?: boolean;
    confirmVariant?: 'primary' | 'danger' | 'success';
}

/**
 * BaseModal.Footer - Helper component pour footer standardisé
 */
BaseModal.Footer = ({
    onCancel,
    onConfirm,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    confirmDisabled = false,
    confirmLoading = false,
    confirmVariant = 'primary'
}) => {
    const variants = {
        primary: 'bg-primary hover:bg-primary/90 text-text-dark',
        danger: 'bg-danger hover:bg-danger/90 text-white',
        success: 'bg-success hover:bg-success/90 text-white'
    };

    return (
        <div className="flex gap-3 justify-end">
            <button
                onClick={onCancel}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-grey-light font-bold transition-all active:scale-95"
                type="button"
            >
                {cancelText}
            </button>
            {onConfirm && (
                <button
                    onClick={onConfirm}
                    disabled={confirmDisabled || confirmLoading}
                    className={clsx(
                        'px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2',
                        variants[confirmVariant],
                        confirmVariant === 'primary' ? 'shadow-primary/20' :
                            confirmVariant === 'danger' ? 'shadow-danger/20' : 'shadow-success/20'
                    )}
                    type="button"
                >
                    {confirmLoading && <div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin" />}
                    {confirmText}
                </button>
            )}
        </div>
    );
};

export default BaseModal;
