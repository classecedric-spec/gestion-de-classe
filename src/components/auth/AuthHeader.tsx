import React from 'react';
import { AuthMode } from '../../hooks/useAuthForm';

interface AuthHeaderProps {
    mode: AuthMode;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ mode }) => {
    let title = '';
    let subtitle = '';

    switch (mode) {
        case 'FORGOT':
            title = 'Récupération';
            subtitle = 'Un email pour réinitialiser le mot de passe';
            break;
        case 'SIGNUP':
            title = 'Bienvenue';
            subtitle = 'Créez votre espace enseignant';
            break;
        case 'LOGIN':
        default:
            title = 'Bon retour';
            subtitle = 'Accédez à votre tableau de bord';
            break;
    }

    return (
        <div className="text-center mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-text-dark font-black text-xl shadow-lg shadow-primary/20 mx-auto mb-6 transform hover:rotate-12 transition-transform duration-300">
                G
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                {title}
            </h1>
            <p className="text-grey-medium font-medium text-sm">
                {subtitle}
            </p>
        </div>
    );
};
