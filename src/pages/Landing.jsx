import { Link, Navigate } from 'react-router-dom';
import { Layers, Users, BookOpen, ChevronRight, CheckCircle2, Star, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { isMobilePhone } from '../lib/utils';


const Landing = () => {
    // Redirect mobile phone users to the mobile version
    if (isMobilePhone()) {
        return <Navigate to="/mobile" replace />;
    }

    return (
        <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white transition-colors duration-500">
            <PublicHeader />

            <main className="w-full pt-32 pb-20">

                <section className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-32 relative pt-20">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/50 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-xl shadow-black/20 backdrop-blur-md">
                        <Sparkles size={12} />
                        <span>Nouvelle Version 1.2</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-semibold text-white mb-8 tracking-tighter leading-[0.95] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Gestion de classe. <br />
                        <span className="bg-gradient-to-b from-primary via-primary-light to-primary-dark bg-clip-text text-transparent">Réinventée.</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-grey-medium mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 font-medium tracking-tight">
                        La puissance d'un outil professionnel, la simplicité d'une app quotidienne. <br className="hidden md:block" />
                        Conçu pour les enseignants qui exigent le meilleur.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        <Link
                            to="/login"
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-white text-black font-semibold py-4 px-8 rounded-full hover:scale-105 transition-all shadow-xl shadow-white/10 text-sm"
                        >
                            Commencer maintenant
                        </Link>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full md:w-auto flex items-center justify-center gap-2 text-white hover:text-primary font-medium py-4 px-8 rounded-full hover:bg-white/5 transition-all text-sm cursor-pointer"
                        >
                            Découvrir les fonctionnalités
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="mt-24 relative max-w-5xl mx-auto perspective-1000 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-primary/20 bg-surface">
                            <img src="/assets/documentation/dashboard.png" alt="Dashboard" className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
                    </div>
                </section>

                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-40">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-surface/30 p-8 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all group backdrop-blur-sm">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Confidentialité Totale</h3>
                            <p className="text-grey-medium leading-relaxed">Vos données et celles de vos élèves sont chiffrées et protégées. Conforme RGPD.</p>
                        </div>

                        <div className="bg-surface/30 p-8 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all group backdrop-blur-sm md:col-span-1 bg-gradient-to-b from-surface/50 to-surface/30">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Performance Éclair</h3>
                            <p className="text-grey-medium leading-relaxed">Une interface fluide qui répond instantanément. Zéro temps de chargement.</p>
                        </div>

                        <div className="bg-surface/30 p-8 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all group backdrop-blur-sm">
                            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                                <Layers size={24} />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Organisation Zen</h3>
                            <p className="text-grey-medium leading-relaxed">Classes, groupes, niveaux. Tout est structuré pour vous libérer l'esprit.</p>
                        </div>
                    </div>
                </section>

                <section id="features" className="max-w-7xl mx-auto px-6 md:px-12 mb-40 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-grey-light">
                            Gestion Illimitée
                        </div>
                        <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                            Vos élèves. <br />
                            <span className="text-grey-dark">Au bout des doigts.</span>
                        </h2>
                        <p className="text-xl text-grey-medium leading-relaxed font-medium max-w-md">
                            Accédez aux fiches détaillées, gérez les groupes et suivez les parcours individuels avec une aisance déconcertante.
                        </p>
                        <ul className="space-y-4 pt-4">
                            {['Fiches complètes', 'Tri intelligent', 'Groupes dynamiques'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-grey-light">
                                    <CheckCircle2 size={18} className="text-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-surface transform group-hover:scale-[1.02] transition-transform duration-500">
                            <img src="/assets/documentation/eleves.png" alt="Gestion Élèves" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-40 flex flex-col md:flex-row-reverse items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-grey-light">
                            Suivi Pédagogique
                        </div>
                        <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                            La réussite. <br />
                            <span className="text-grey-dark">Visualisée.</span>
                        </h2>
                        <p className="text-xl text-grey-medium leading-relaxed font-medium max-w-md">
                            Identifiez les besoins en un coup d'œil grâce aux indicateurs de progression. Validez les compétences en temps réel.
                        </p>
                        <Link to="/login" className="inline-flex items-center gap-2 text-primary hover:text-white font-medium transition-colors mt-4">
                            Voir comment ça marche <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="flex-1 relative group">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-surface transform group-hover:scale-[1.02] transition-transform duration-500">
                            <img src="/assets/documentation/suivi.png" alt="Suivi Global" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                <section className="max-w-5xl mx-auto px-6 md:px-12 mb-40 text-center">
                    <div className="mb-16 space-y-6">
                        <h2 className="text-4xl md:text-6xl font-semibold text-white tracking-tight">
                            Activités & Modules
                        </h2>
                        <p className="text-xl text-grey-medium max-w-2xl mx-auto font-medium">
                            Créez vos propres parcours d'apprentissage. Organisez par branche, sous-branche et niveau.
                        </p>
                    </div>
                    <div className="relative group max-w-4xl mx-auto">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-white/20 to-primary rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
                        <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-surface">
                            <img src="/assets/documentation/activites.png" alt="Activités" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                <section className="mb-40 py-20 border-y border-white/5 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6 text-center">
                        <div className="grid md:grid-cols-3 gap-12">
                            {[
                                { q: "L'interface est d'une clarté absolue. Je ne perds plus de temps.", a: "Marie L., Enseignante CM1" },
                                { q: "Enfin un outil qui comprend vraiment nos besoins quotidiens.", a: "Thomas B., Directeur" },
                                { q: "Le suivi des élèves est devenu un jeu d'enfant.", a: "Sarah J., Professeur des écoles" }
                            ].map((review, i) => (
                                <div key={i} className="space-y-4">
                                    <div className="flex justify-center text-primary mb-4">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="currentColor" className="text-primary" />)}
                                    </div>
                                    <p className="text-xl font-medium text-white italic leading-relaxed">"{review.q}"</p>
                                    <p className="text-sm font-bold text-grey-dark uppercase tracking-widest">{review.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-6 mb-20">
                    <div className="bg-gradient-to-br from-surface to-background p-16 md:p-28 rounded-[4rem] border border-border text-center relative overflow-hidden group shadow-[0_0_100px_rgba(0,0,0,0.5)]">

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
