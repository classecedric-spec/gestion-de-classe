import React from 'react';
import BaseModal, { BaseModalProps } from './BaseModal';

export interface FormModalProps extends Omit<BaseModalProps, 'footer'> {
    onSubmit: (e?: React.FormEvent) => void;
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    confirmDisabled?: boolean;
    confirmVariant?: 'primary' | 'danger' | 'success';
}

/**
 * FormModal
 * Un wrapper de BaseModal optimisé pour les formulaires.
 * Inclut automatiquement le footer avec les boutons Annuler/Confirmer (FormModal.Footer).
 */
export const FormModal: React.FC<FormModalProps> = ({
    children,
    onSubmit,
    loading = false,
    confirmText = 'Enregistrer',
    cancelText = 'Annuler',
    confirmDisabled = false,
    confirmVariant = 'primary',
    ...props
}) => {
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        onSubmit(e);
    };

    return (
        <BaseModal
            {...props}
            footer={
                <BaseModal.Footer
                    onCancel={props.onClose}
                    onConfirm={handleSubmit}
                    confirmText={confirmText}
                    cancelText={cancelText}
                    confirmLoading={loading}
                    confirmDisabled={confirmDisabled}
                    confirmVariant={confirmVariant}
                />
            }
        >
            <form onSubmit={handleSubmit}>
                {children}
            </form>
        </BaseModal>
    );
};

export default FormModal;
