import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import clsx from 'clsx';

/**
 * BaseModal - Composant modal réutilisable
 * Fournit structure, animations et gestion des événements communs
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - État d'ouverture du modal
 * @param {function} props.onClose - Fonction de fermeture
 * @param {string} props.title - Titre du modal
 * @param {React.ReactNode} props.children - Contenu principal
 * @param {React.ReactNode} props.footer - Contenu du footer (boutons)
 * @param {string} props.size - Taille du modal (sm, md, lg, xl, full)
 * @param {boolean} props.closeOnBackdrop - Fermer en cliquant sur le backdrop (défaut: false)
 * @param {boolean} props.showCloseButton - Afficher bouton X (défaut: true)
 */
const BaseModal = ({
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
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-[95vw]'
    };

    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };

    // Gestion touche Escape
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Bloquer le scroll du body quand modal ouvert
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
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
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}

                {/* Body - scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
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

BaseModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
    footer: PropTypes.node,
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
    closeOnBackdrop: PropTypes.bool,
    showCloseButton: PropTypes.bool,
    className: PropTypes.string
};

/**
 * BaseModal.Footer - Helper component pour footer standardisé
 */
BaseModal.Footer = ({ onCancel, onConfirm, confirmText = 'Confirmer', cancelText = 'Annuler', confirmDisabled = false, confirmLoading = false }) => {
    return (
        <div className="flex gap-3 justify-end">
            <button
                onClick={onCancel}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-grey-light font-bold transition-all active:scale-95"
            >
                {cancelText}
            </button>
            <button
                onClick={onConfirm}
                disabled={confirmDisabled || confirmLoading}
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-text-dark font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {confirmLoading && <div className="w-4 h-4 border-2 border-text-dark/20 border-t-text-dark rounded-full animate-spin" />}
                {confirmText}
            </button>
        </div>
    );
};

BaseModal.Footer.propTypes = {
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    confirmDisabled: PropTypes.bool,
    confirmLoading: PropTypes.bool
};

export default BaseModal;
