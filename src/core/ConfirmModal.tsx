import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BaseModal from './BaseModal';

export type ConfirmModalVariant = 'warning' | 'danger' | 'info';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onCancel?: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmModalVariant;
    isLoading?: boolean;
    securityText?: string;
    securityPlaceholder?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title = "Confirmation",
    message = "Êtes-vous sûr de vouloir continuer ?",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "warning",
    isLoading = false,
    securityText,
    securityPlaceholder = "Tapez le texte de sécurité ici"
}) => {
    const [inputValue, setInputValue] = React.useState('');

    const handleConfirm = () => {
        if (securityText && inputValue !== securityText) return;
        onConfirm();
        if (!isLoading) onClose();
    };

    const isConfirmDisabled = securityText ? inputValue !== securityText : false;

    const variantColors = {
        warning: 'text-yellow-500',
        danger: 'text-red-500',
        info: 'text-primary'
    };

    const iconColor = variantColors[variant] || variantColors.info;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            icon={
                <div className={iconColor}>
                    <AlertTriangle size={24} />
                </div>
            }
            footer={
                <BaseModal.Footer
                    onCancel={onCancel || onClose}
                    onConfirm={handleConfirm}
                    confirmText={confirmText}
                    cancelText={cancelText}
                    confirmLoading={isLoading}
                    confirmDisabled={isConfirmDisabled}
                    confirmVariant={variant === 'danger' ? 'danger' : 'primary'}
                />
            }
        >
            <div className="space-y-4">
                <p className="text-grey-light leading-relaxed">{message}</p>
                
                {securityText && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black uppercase tracking-widest text-grey-medium">
                            Veuillez taper <span className="text-white bg-white/10 px-1 rounded">"{securityText}"</span> pour confirmer
                        </label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-grey-medium/30 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder={securityPlaceholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </BaseModal>
    );
};


export default ConfirmModal;
