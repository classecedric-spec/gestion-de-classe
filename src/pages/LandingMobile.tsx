import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, ChevronRight, Sparkles, Users, BookOpen, Zap, Smartphone, ArrowRight } from 'lucide-react';

const LandingMobile: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white">

            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-4 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-text-dark font-black text-sm shadow-lg shadow-primary/20">
                        G
                    </div>
                    <span className="text-base font-black text-white tracking-tight">
                        Gestion<span className="text-primary">Classe</span>
                    </span>
                </div>
                <Link
                    to="/login"
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-full transition-all font-bold text-[10px] uppercase tracking-wider backdrop-blur-md"
                >
                    <LogIn size={14} />
                    Connexion
                </Link>
            </header>

            <main className="w-full pt-24 pb-12 px-5">

                {/* Hero Section */}
                <section className="text-center mb-16 relative">
                    {/* Background Effect */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] -z-10 animate-pulse-slow"></div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-primary mb-6 shadow-lg backdrop-blur-md">
                        <Sparkles size={10} />
                        Version 2.0
                    </div>

                    {/* Title */}
                    <h1 className="text-5xl font-black text-white mb-5 tracking-tighter leading-[0.95]">
                        Gestion <br />
                        <span className="bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">Classe.</span>
                    </h1>

                    {/* Description */}
                    <p className="text-sm text-grey-medium mb-8 leading-relaxed font-medium px-2">
                        L'outil ultime pour les enseignants exigeants. Simplifiez tout, maintenant.
                    </p>

                    {/* CTA Button */}
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-3 bg-primary text-text-dark font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 text-xs uppercase tracking-widest mb-4 hover:scale-[1.02] transition-transform"
                    >
                        Démarrer
                        <ChevronRight size={16} />
                    </Link>

                    <Link
                        to="/features"
                        className="w-full flex items-center justify-center gap-2 bg-surface/40 border border-white/10 text-white font-bold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider backdrop-blur-md"
                    >
                        Explorer
                    </Link>
                </section>

                {/* Features Cards */}
                <section className="mb-16 space-y-4">
                    {[
                        {
                            icon: Users,
                            title: "Classes & Groupes",
                            desc: "Structurez votre école en quelques clics."
                        },
                        {
                            icon: BookOpen,
                            title: "Suivi Pédagogique",
                            desc: "Compétences, parcours, réussite."
                        },
                        {
                            icon: Zap,
                            title: "Rapidité Éclair",
                            desc: "Pensé pour la classe, pas le bureau."
                        }
                    ].map((feature, idx) => (
                        <div
                            key={idx}
                            className="bg-surface/40 p-6 rounded-[2rem] border border-white/5 flex items-center gap-5 backdrop-blur-sm shadow-lg"
                        >
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary shrink-0 border border-white/5">
                                <feature.icon size={22} strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white mb-1 uppercase tracking-tight">{feature.title}</h3>
                                <p className="text-xs text-grey-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Stats */}
                <section className="mb-16 bg-surface/30 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                    <div className="grid grid-cols-2 gap-8 relative z-10">
                        {[
                            { val: "100%", label: "Privé" },
                            { val: "24/7", label: "Actif" },
                            { val: "OUI", label: "Mobile" },
                            { val: "TOP", label: "Design" }
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl font-black text-white mb-1 tracking-tighter italic">{stat.val}</div>
                                <div className="text-[9px] text-grey-medium uppercase tracking-widest font-bold">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Mobile App CTA */}
                <section className="mb-16">
                    <div className="bg-gradient-to-br from-surface/60 to-surface/40 p-8 rounded-[2.5rem] border border-white/5 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-full opacity-40">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px]"></div>
                        </div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 border border-primary/10 shadow-inner">
                                <Smartphone size={32} />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                                Sur votre mobile
                            </h3>
                            <p className="text-sm text-grey-medium mb-8 leading-relaxed max-w-[200px] mx-auto">
                                Installez l'application pour valider les compétences en circulant dans la classe.
                            </p>

                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 bg-primary text-text-dark font-black py-4 px-10 rounded-2xl shadow-lg shadow-primary/20 text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                            >
                                Commencer
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="text-center text-grey-medium py-8 border-t border-white/5 mt-auto px-5 bg-black/20 backdrop-blur-lg">

                <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">&copy; 2026 — GestionClasse</p>
            </footer>
        </div>
    );
};

export default LandingMobile;
