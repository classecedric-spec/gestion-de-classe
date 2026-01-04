import React, { useEffect, useRef } from 'react';
import { AlertCircle, X, Check } from 'lucide-react';
import clsx from 'clsx';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmer", cancelText = "Annuler", isDangerous = false }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-md m-4 glow-border animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            isDangerous ? "bg-danger/20 text-danger" : "bg-primary/20 text-primary"
                        )}>
                            <AlertCircle size={18} />
                        </div>
                        <h3 className="font-bold text-lg text-text-main">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/5 text-grey-medium transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-grey-light leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-surface/50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-grey-medium hover:text-white hover:bg-white/5 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-lg transition-all active:scale-95",
                            isDangerous
                                ? "bg-danger hover:bg-danger-light shadow-danger/20"
                                : "bg-primary hover:bg-primary-light shadow-primary/20"
                        )}
                    >
                        {isDangerous ? <AlertCircle size={16} /> : <Check size={16} />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
