import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PdfProgressProps {
    isGenerating: boolean;
    progressText?: string;
    progressPercentage?: number;
    className?: string;
}

/**
 * PdfProgress - Shared component to display PDF generation progress.
 * Consistent UI between Dashboard and Groups pages.
 */
const PdfProgress: React.FC<PdfProgressProps> = ({
    isGenerating,
    progressText,
    progressPercentage = 0,
    className
}) => {
    if (!isGenerating) return null;

    return (
        <div className={clsx(
            "p-6 bg-primary/10 border border-primary/20 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-500",
            className
        )}>
            <div className="flex items-center gap-3 text-primary">
                <Loader2 className="animate-spin" size={20} />
                <p className="text-sm font-black uppercase tracking-widest">Génération en cours...</p>
            </div>

            {progressText && (
                <div className="p-3 bg-background/50 rounded-xl border border-primary/30">
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="animate-pulse">✏️</span> {progressText}
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-grey-light">
                    <span className="mt-0.5">📄</span>
                    <p>Création des fiches individuelles pour chaque élève du groupe.</p>
                </div>
                <div className="flex items-start gap-2 text-xs text-grey-light">
                    <span className="mt-0.5">⏱️</span>
                    <p>Cette opération peut prendre quelques instants selon le nombre d'élèves.</p>
                </div>
                <div className="flex items-start gap-2 text-xs text-grey-light">
                    <span className="mt-0.5">✨</span>
                    <p>Le PDF se téléchargera automatiquement une fois prêt.</p>
                </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-grey-medium italic">
                    💡 Astuce : Appuyez sur <kbd className="px-1.5 py-0.5 bg-background rounded text-primary font-mono text-[9px] border border-white/10 uppercase">ESC</kbd> pour annuler
                </p>
                <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PdfProgress;
