import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

/**
 * Screen displayed when user is not authenticated
 */
export function UnauthenticatedScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                <User size={48} className="text-primary" />
            </div>

            <h2 className="text-3xl font-bold text-text-main mb-4">
                Connexion requise
            </h2>

            <p className="text-grey-medium max-w-lg text-lg leading-relaxed mb-8">
                Vous devez être connecté pour accéder à cette page.
            </p>

            <Link
                to="/login"
                className="px-6 py-3 bg-primary text-text-dark font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
                Se connecter
            </Link>
        </div>
    );
}
