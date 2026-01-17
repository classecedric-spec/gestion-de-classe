import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {


    return (
        <footer className="text-center text-grey-medium py-20 border-t border-border mt-20">

            <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs italic">G</div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestion de Classe</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">&copy; 2026 — Excellence Pédagogique Digitale</p>
        </footer>
    );
};

export default Footer;
