import React from 'react';
import { ArrowLeft, Users, BookOpen } from 'lucide-react';

interface MobileEncodingHeaderProps {
    step: 'groups' | 'students' | 'modules';
    selectedGroup: any | null;
    selectedStudent: any | null;
    onBack: () => void;
    onNavigateHome: () => void;
}

/**
 * Component for displaying the mobile encoding header with navigation
 */
export const MobileEncodingHeader: React.FC<MobileEncodingHeaderProps> = ({
    step,
    selectedGroup,
    selectedStudent,
    onBack,
    onNavigateHome
}) => {
    return (
        <header className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-grey-medium hover:text-white hover:bg-white/10 transition-all border border-white/5"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-black text-white uppercase tracking-tight truncate">
                        {step === 'groups' && 'Sélectionner un groupe'}
                        {step === 'students' && selectedGroup?.nom}
                        {step === 'modules' && `${selectedStudent?.prenom} ${selectedStudent?.nom}`}
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                        {step === 'students' && <><Users size={10} /> Sélectionner un élève</>}
                        {step === 'modules' && <><BookOpen size={10} /> {selectedStudent?.Niveau?.nom || 'Tous niveaux'}</>}
                    </div>
                </div>

                {step !== 'groups' && (
                    <button
                        onClick={onNavigateHome}
                        className="text-[10px] font-bold text-grey-medium uppercase tracking-wider hover:text-primary transition-colors"
                    >
                        Accueil
                    </button>
                )}
            </div>
        </header>
    );
};
