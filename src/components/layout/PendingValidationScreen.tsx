import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

/**
 * Screen displayed when user account is pending admin validation
 */
export function PendingValidationScreen() {
    return (
        <div className="absolute inset-0 bg-surface z-[60] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 shadow-[0_0_30px_rgba(217,185,129,0.1)]">
                <ShieldCheck size={48} className="text-primary" />
            </div>

            <h2 className="text-3xl font-bold text-text-main mb-4">
                Compte en attente de validation
            </h2>

            <p className="text-grey-medium max-w-lg text-lg leading-relaxed">
                Votre compte a été créé avec succès, mais nécessite une
                <span className="text-primary font-bold"> validation manuelle</span> de l'administrateur.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4">
                <div className="px-6 py-3 bg-surface border border-white/5 rounded-xl text-sm text-grey-dark">
                    <span className="opacity-70">En attente de : </span>
                    <span className="font-mono text-primary font-bold">validation_admin = true</span>
                </div>

                <Link
                    to="/dashboard/settings?tab=profil"
                    className="text-primary hover:text-white underline underline-offset-4 text-sm transition-colors"
                >
                    Accéder à mon profil
                </Link>
            </div>
        </div>
    );
}
