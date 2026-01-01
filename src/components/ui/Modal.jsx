import React from 'react';

import clsx from 'clsx';

const Modal = ({ isOpen, onClose, title, icon, children, footer, className, noPadding = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content */}
            <div
                className={clsx(
                    "relative bg-surface border border-border/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col",
                    "!w-[90vw] !max-w-[90vw] !h-[90vh] !max-h-[90vh]", // Force 90% dimensions for tablet optimization
                    className
                )}
            >


                {/* Header */}
                <div className="p-6 pb-0 flex-none">
                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-3">
                        {icon && (
                            <div className="p-2 rounded-lg bg-primary/20 text-primary">
                                {icon}
                            </div>
                        )}
                        {title}
                    </h2>
                </div>

                {/* Body */}
                <div className={clsx(
                    "flex-1 overflow-y-auto custom-scrollbar",
                    noPadding ? "" : "p-6"
                )}>
                    {children}
                </div>

                {/* Footer (Optional) */}
                {footer && (
                    <div className="p-6 pt-0 flex-none flex gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
