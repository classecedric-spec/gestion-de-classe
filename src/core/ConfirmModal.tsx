import React from 'react';
import { AlertTriangle } from 'lucide-react';
import BaseModal from './BaseModal';

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
    const handleConfirm = () => {
        onConfirm();
        if (!isLoading) onClose();
    };

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
                    onCancel={onClose}
                    onConfirm={handleConfirm}
                    confirmText={confirmText}
                    cancelText={cancelText}
                    confirmLoading={isLoading}
                    confirmVariant={variant === 'danger' ? 'danger' : 'primary'}
                />
            }
        >
            <p className="text-grey-light leading-relaxed">{message}</p>
        </BaseModal>
    );
};


export default ConfirmModal;
