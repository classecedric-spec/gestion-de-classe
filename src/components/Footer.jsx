import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();

    const handleNavigation = (path) => {
        navigate(path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="text-center text-grey-medium py-20 border-t border-border mt-20">
            <div className="flex flex-wrap items-center justify-center gap-10 mb-10">
                <button onClick={() => handleNavigation('/')} className="text-xs uppercase tracking-widest font-black hover:text-primary transition-colors cursor-pointer">Accueil</button>
                <button onClick={() => handleNavigation('/features')} className="text-xs uppercase tracking-widest font-black hover:text-primary transition-colors cursor-pointer">Fonctionnalités</button>
                <button onClick={() => handleNavigation('/privacy')} className="text-xs uppercase tracking-widest font-black hover:text-primary transition-colors cursor-pointer">Confidentialité</button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs italic">G</div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion de Classe</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">&copy; 2026 — Excellence Pédagogique Digitale</p>
        </footer>
    );
};

export default Footer;
