import { Link } from 'react-router-dom';
import { LogIn, Layers, Users, BookOpen, ChevronRight, CheckCircle2, Star, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import Footer from '../components/Footer';

const Landing = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white transition-colors duration-500">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-12 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#b8955c] flex items-center justify-center text-text-dark font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        G
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase italic">
                        Gestion<span className="text-primary not-italic">Classe</span>
                    </span>
                </div>
                <Link
                    to="/login"
                    className="flex items-center gap-2 bg-white/5 hover:bg-primary text-white hover:text-text-dark border border-white/10 hover:border-primary py-2.5 px-6 rounded-xl transition-all font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 shadow-xl shadow-black/20"
                >
                    <LogIn size={16} />
                    Se connecter
                </Link>
            </header>

            <main className="w-full pt-32 pb-20">

                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-40 relative">
                    {/* Background Effects */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
                    <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-10"></div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border text-[10px] font-black uppercase tracking-widest text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-xl shadow-black/40 hover:bg-surface transition-colors cursor-default">
                        <Sparkles size={12} />
                        Version 1.2 est arrivée
                    </div>

                    {/* Title */}
                    <h1 className="text-5xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        LA GESTION DE CLASSE <br />
                        <span className="bg-gradient-to-r from-primary via-[#ead2a8] to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient uppercase">FACILITÉE</span>
                    </h1>

                    {/* Description */}
                    <p className="text-lg md:text-2xl text-grey-medium mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 font-medium">
                        Une suite intuitive pour orchestrer vos classes, suivre chaque progression et <span className="text-white underline decoration-primary/40 decoration-4 underline-offset-4">sublimer</span> votre enseignement quotidien.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        <Link
                            to="/login"
                            className="w-full md:w-auto flex items-center justify-center gap-4 bg-primary text-text-dark font-black py-5 px-12 rounded-2xl hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 text-xs uppercase tracking-widest"
                        >
                            Démarrer l'aventure
                            <ChevronRight size={18} />
                        </Link>
                        <Link to="/features" className="w-full md:w-auto flex items-center justify-center gap-4 bg-surface/50 border border-border text-white font-black py-5 px-12 rounded-2xl hover:bg-surface transition-all backdrop-blur-sm shadow-xl text-xs uppercase tracking-widest">
                            Découvrir les outils
                        </Link>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="max-w-7xl mx-auto px-6 md:px-12 mb-40">
                    <div className="text-center mb-20 relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-1 bg-primary/20 rounded-full"></div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight uppercase">Écosystème Intelligent</h2>
                        <p className="text-grey-medium max-w-xl mx-auto font-medium">L'alliance parfaite entre design épuré et puissance fonctionnelle.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            {
                                icon: Users,
                                title: "Structure Avancée",
                                desc: "Gérez une hiérarchie complexe : Niveaux, Classes et Groupes. Une organisation sans faille.",
                                color: "primary"
                            },
                            {
                                icon: BookOpen,
                                title: "Suivi Précis",
                                desc: "Parcours détaillés avec Activités et Modules. Visualisez la réussite en temps réel.",
                                color: "primary"
                            },
                            {
                                icon: Zap,
                                title: "Ultra Fluidité",
                                desc: "Une interface réactive et des animations soignées pour une expérience utilisateur premium.",
                                color: "primary"
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-surface/40 p-10 rounded-[2rem] border border-border hover:border-primary/50 transition-all group hover:-translate-y-3 relative overflow-hidden shadow-2xl backdrop-blur-sm">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-primary/10 shadow-lg">
                                    <feature.icon size={32} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">{feature.title}</h3>
                                <p className="text-grey-medium leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Trust / Stats Section */}
                <section className="mb-40 border-y border-border bg-surface/20 backdrop-blur-md py-24">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-16 text-center">
                        {[
                            { val: "100%", label: "Sécurisé" },
                            { val: "24/7", label: "Accessible" },
                            { val: "OUI", label: "Responsif" },
                            { val: "TOP", label: "Performant" }
                        ].map((stat, i) => (
                            <div key={i} className="group cursor-default">
                                <div className="text-6xl font-black text-white mb-2 group-hover:text-primary transition-colors duration-300 tracking-tighter italic">{stat.val}</div>
                                <div className="text-[10px] text-grey-medium uppercase tracking-[0.2em] font-black">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="max-w-6xl mx-auto px-6 mb-20">
                    <div className="bg-gradient-to-br from-surface to-background p-16 md:p-28 rounded-[4rem] border border-border text-center relative overflow-hidden group shadow-[0_0_100px_rgba(0,0,0,0.5)]">

                        {/* Interactive blobs */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000">
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-5xl md:text-7xl font-black text-white mb-10 tracking-tighter uppercase italic leading-[0.8]">
                                Prêt à <br /> <span className="text-primary not-italic">Révolutionner</span> <br /> votre classe ?
                            </h2>
                            <p className="text-lg md:text-xl text-grey-medium mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                                Rejoignez l'élite des enseignants modernes. Configurez votre espace de travail en moins de 2 minutes.
                            </p>

                            <Link
                                to="/login"
                                className="inline-flex items-center gap-4 bg-primary text-text-dark font-black py-5 px-16 rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-2xl shadow-primary/20 hover:shadow-white/20 hover:-translate-y-1 text-xs uppercase tracking-[0.15em]"
                            >
                                Créer mon compte
                                <ChevronRight size={20} />
                            </Link>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </div>
    );
};

export default Landing;
