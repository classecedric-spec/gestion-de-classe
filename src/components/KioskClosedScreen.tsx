/**
 * ============================================================
 * COMPOSANT : KioskClosedScreen
 * ============================================================
 * Rôle : Affiche un écran de fermeture automatique du kiosque
 *        quand l'heure dépasse 16h (heure de Bruxelles).
 *        Remplace le contenu du kiosque de façon totalement
 *        opaque — aucune action n'est possible.
 *
 * Props :
 *   - timeNow : string — heure actuelle (ex: "16:02")
 * ============================================================
 */

import React from 'react';
import { Lock, Clock } from 'lucide-react';

interface KioskClosedScreenProps {
    timeNow: string;
}

const KioskClosedScreen: React.FC<KioskClosedScreenProps> = ({ timeNow }) => {
    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background text-center px-6"
            aria-live="assertive"
        >
            {/* Décoration de fond */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px]" />
            </div>

            {/* Icône cadenas */}
            <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center border-2 border-primary/20 mb-8 shadow-[0_0_80px_rgba(var(--color-primary-rgb),0.15)] animate-pulse">
                <Lock size={48} className="text-primary" />
            </div>

            {/* Titre */}
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight uppercase italic">
                Kiosque Fermé
            </h1>

            {/* Heure actuelle */}
            <div className="flex items-center gap-2 text-grey-medium mb-8">
                <Clock size={16} />
                <span className="font-mono text-lg font-semibold">{timeNow}</span>
            </div>

            {/* Message explicatif */}
            <div className="max-w-md w-full bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                <p className="text-xl text-grey-medium font-medium leading-relaxed">
                    Le kiosque se ferme automatiquement à{' '}
                    <span className="text-white font-bold">16h00</span>.
                </p>
                <div className="h-px w-12 bg-white/10 mx-auto my-6" />
                <p className="text-sm text-grey-dark font-medium italic leading-relaxed">
                    Merci de contacter votre professeur pour y accéder de nouveau.
                </p>
            </div>
        </div>
    );
};

export default KioskClosedScreen;
