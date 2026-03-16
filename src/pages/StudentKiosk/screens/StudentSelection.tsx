import React from 'react';
import { LogOut } from 'lucide-react';

const StudentSelection: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-danger/10 rounded-[2rem] flex items-center justify-center border-2 border-danger/20 mb-8 shadow-[0_0_80px_rgba(239,68,68,0.15)] animate-pulse">
                <LogOut size={64} className="text-danger" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight uppercase italic">
                Session Fermée
            </h1>
            
            <div className="max-w-md w-full bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-danger/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <p className="text-xl md:text-2xl text-grey-medium font-medium leading-relaxed relative z-10">
                    Tu es déconnecté du kiosque.
                </p>
                <div className="h-px w-12 bg-white/10 mx-auto my-6 relative z-10" />
                <p className="text-sm md:text-base text-grey-dark font-medium relative z-10 leading-relaxed italic">
                    Scanne ton code ou demande à ton professeur d'ouvrir l'accès pour commencer.
                </p>
            </div>
            
            {/* Subtle background decoration */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[500px] h-[500px] bg-danger/5 rounded-full blur-[120px] pointer-events-none" />
        </div>
    );
};

export default StudentSelection;
