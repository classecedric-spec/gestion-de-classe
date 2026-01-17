import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const PublicHeader = ({ solidBackground = false }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            const heroHeight = window.innerHeight * 0.8;
            setIsVisible(scrollPosition > heroHeight);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Accueil', to: '/' },
        { label: 'Fonctionnalités', to: '/features' },
        { label: 'Fonctionnement', to: '/fonctionnement' },
        { label: 'Confidentialité', to: '/privacy' },
    ];

    return (
        <>
            <header className={clsx(
                "fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-12 z-50 border-b border-border transition-transform duration-300",
                solidBackground ? "bg-background" : "bg-background/80 backdrop-blur-xl",
                isVisible ? "translate-y-0" : "-translate-y-full"
            )}>
                <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-text-dark font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        G
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase italic">
                        Gestion<span className="text-primary not-italic">Classe</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="text-sm font-medium text-grey-light hover:text-primary transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <Link
                    to="/login"
                    className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-primary text-white hover:text-text-dark border border-white/10 hover:border-primary py-2.5 px-6 rounded-xl transition-all font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl shadow-black/20"
                >
                    <LogIn size={16} />
                    Se Connecter
                </Link>

                <button
                    onClick={toggleMobileMenu}
                    className="md:hidden p-2 text-white hover:text-primary transition-colors"
                    aria-label="Menu"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
                    onClick={closeMobileMenu}
                />
            )}

            <aside
                className={clsx(
                    "fixed top-0 right-0 h-full w-[280px] bg-surface border-l border-border shadow-2xl z-50 md:hidden transition-transform duration-300 ease-out",
                    isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <span className="text-lg font-black text-white uppercase tracking-tight">
                            Menu
                        </span>
                        <button
                            onClick={closeMobileMenu}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-grey-medium hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={closeMobileMenu}
                                className="flex items-center px-4 py-3 rounded-xl text-text-main hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-border">
                        <Link
                            to="/login"
                            onClick={closeMobileMenu}
                            className="flex items-center justify-center gap-2 bg-primary text-text-dark py-3 px-6 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-primary-light transition-all shadow-lg shadow-primary/20 w-full"
                        >
                            <LogIn size={18} />
                            Se Connecter
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default PublicHeader;
