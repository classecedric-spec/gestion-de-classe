import React from 'react';
import { AuthMode } from '../../hooks/useAuthForm';

interface AuthFooterProps {
    mode: AuthMode;
    onSwitchMode: (mode: AuthMode) => void;
}

export const AuthFooter: React.FC<AuthFooterProps> = ({ mode, onSwitchMode }) => {
    return (
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-sm text-grey-medium">
                {mode === 'FORGOT' ? (
                    <button
                        onClick={() => onSwitchMode('LOGIN')}
                        className="text-white hover:text-primary font-semibold transition-colors"
                    >
                        ← Retour à la connexion
                    </button>
                ) : (
                    <>
                        {mode === 'SIGNUP' ? 'Déjà membre ? ' : "Pas encore de compte ? "}
                        <button
                            onClick={() => onSwitchMode(mode === 'SIGNUP' ? 'LOGIN' : 'SIGNUP')}
                            className="text-white hover:text-primary font-bold transition-colors ml-1"
                        >
                            {mode === 'SIGNUP' ? 'Se connecter' : "S'inscrire"}
                        </button>
                    </>
                )}
            </p>
        </div>
    );
};
