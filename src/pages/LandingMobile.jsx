import { Link } from 'react-router-dom';
import { LogIn, ChevronRight, Sparkles, Users, BookOpen, Zap, Smartphone, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const LandingMobile = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white">

            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-4 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#b8955c] flex items-center justify-center text-text-dark font-black text-sm shadow-lg shadow-primary/20">
                        G
                    </div>
                    <span className="text-base font-black text-white tracking-tight">
                        Gestion<span className="text-primary">Classe</span>
                    </span>
                </div>
                <Link
                    to="/login"
                    className="flex items-center gap-1.5 bg-primary text-text-dark py-2 px-4 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20"
                >
                    <LogIn size={14} />
                    Connexion
                </Link>
            </header>

            <main className="w-full pt-24 pb-12 px-5">

                {/* Hero Section */}
                <section className="text-center mb-16 relative">
                    {/* Background Effect */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[80px] -z-10"></div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/60 border border-border text-[9px] font-bold uppercase tracking-widest text-primary mb-6 shadow-lg">
                        <Sparkles size={10} />
                        Version 1.2
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl font-black text-white mb-5 tracking-tight leading-[1.1]">
                        La gestion de classe{' '}
                        <span className="bg-gradient-to-r from-primary via-[#ead2a8] to-primary bg-clip-text text-transparent">
                            facilitée
                        </span>
                    </h1>

                    {/* Description */}
                    <p className="text-sm text-grey-medium mb-8 leading-relaxed font-medium px-2">
                        Une suite intuitive pour orchestrer vos classes et suivre chaque progression.
                    </p>

                    {/* CTA Button */}
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-3 bg-primary text-text-dark font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 text-xs uppercase tracking-widest mb-4"
                    >
                        Démarrer
                        <ChevronRight size={16} />
                    </Link>

                    <Link
                        to="/features"
                        className="w-full flex items-center justify-center gap-2 bg-surface/60 border border-border text-white font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider"
                    >
                        Découvrir les outils
                    </Link>
                </section>

                {/* Features Cards */}
                <section className="mb-16">
                    <h2 className="text-lg font-black text-white mb-6 text-center uppercase tracking-tight">
                        Écosystème Intelligent
                    </h2>

                    <div className="space-y-4">
                        {[
                            {
                                icon: Users,
                                title: "Structure Avancée",
                                desc: "Niveaux, Classes et Groupes. Organisation parfaite."
                            },
                            {
                                icon: BookOpen,
                                title: "Suivi Précis",
                                desc: "Parcours détaillés. Visualisez la réussite."
                            },
                            {
                                icon: Zap,
                                title: "Ultra Fluide",
                                desc: "Interface réactive et animations premium."
                            }
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className="bg-surface/50 p-5 rounded-2xl border border-border flex items-start gap-4 backdrop-blur-sm"
                            >
                                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/10">
                                    <feature.icon size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white mb-1 uppercase tracking-tight">{feature.title}</h3>
                                    <p className="text-xs text-grey-medium leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Stats */}
                <section className="mb-16 bg-surface/30 border border-border rounded-3xl p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { val: "100%", label: "Sécurisé" },
                            { val: "24/7", label: "Accessible" },
                            { val: "OUI", label: "Responsif" },
                            { val: "TOP", label: "Performant" }
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl font-black text-white mb-1 tracking-tight italic">{stat.val}</div>
                                <div className="text-[9px] text-grey-medium uppercase tracking-widest font-bold">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Mobile App CTA */}
                <section className="mb-16">
                    <div className="bg-gradient-to-br from-surface to-background p-8 rounded-3xl border border-border text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-40">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px]"></div>
                        </div>

                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center text-primary mx-auto mb-5 border border-primary/10">
                                <Smartphone size={28} />
                            </div>

                            <h3 className="text-xl font-black text-white mb-3 tracking-tight">
                                Application Mobile
                            </h3>
                            <p className="text-xs text-grey-medium mb-6 leading-relaxed">
                                Installez l'application sur votre téléphone pour un accès rapide.
                            </p>

                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 bg-primary text-text-dark font-black py-3 px-8 rounded-xl shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest"
                            >
                                Commencer
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white mb-4 tracking-tight leading-tight">
                        Prêt à <span className="text-primary">révolutionner</span> votre classe ?
                    </h2>
                    <p className="text-xs text-grey-medium mb-6 leading-relaxed">
                        Rejoignez les enseignants modernes. Configurez votre espace en 2 minutes.
                    </p>
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-3 bg-primary text-text-dark font-black py-4 px-8 rounded-2xl shadow-xl shadow-primary/30 text-xs uppercase tracking-widest"
                    >
                        Créer mon compte
                        <ChevronRight size={16} />
                    </Link>
                </section>

            </main>

            {/* Footer */}
            <footer className="text-center text-grey-medium py-8 border-t border-border mt-auto px-5">
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                    <Link to="/" className="text-[10px] uppercase tracking-widest font-bold hover:text-primary transition-colors">Accueil</Link>
                    <Link to="/features" className="text-[10px] uppercase tracking-widest font-bold hover:text-primary transition-colors">Fonctionnalités</Link>
                    <Link to="/privacy" className="text-[10px] uppercase tracking-widest font-bold hover:text-primary transition-colors">Confidentialité</Link>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3 opacity-50">
                    <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px] italic">G</div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Gestion de Classe</span>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-30">&copy; 2026 — Excellence Pédagogique</p>
            </footer>
        </div>
    );
};

export default LandingMobile;
