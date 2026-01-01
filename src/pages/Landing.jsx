import { Link } from 'react-router-dom';
import { LogIn, Layers, Users, BookOpen, ChevronRight, CheckCircle2, Star, ShieldCheck, Zap } from 'lucide-react';

const Landing = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-12 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#b8955c] flex items-center justify-center text-[#1e1e1e] font-bold text-xl">
                        G
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">Gestion<span className="text-primary">Classe</span></span>
                </div>
                <Link
                    to="/login"
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-2.5 px-6 rounded-full transition-all font-medium text-sm hover:scale-105 active:scale-95"
                >
                    <LogIn size={16} />
                    Espace Enseignant
                </Link>
            </header>

            <main className="w-full pt-32 pb-20">

                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-32 relative">
                    {/* Background Effects */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
                    <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-grey-light mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-xl shadow-black/20 hover:bg-white/10 transition-colors cursor-default">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Version 1.0 disponible maintenant
                    </div>

                    {/* Title */}
                    <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        L'Excellence <br />
                        <span className="bg-gradient-to-r from-primary via-[#ead2a8] to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Pédagogique</span>
                    </h1>

                    {/* Description */}
                    <p className="text-xl md:text-2xl text-grey-medium mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 font-light">
                        Une suite complète pour gérer vos élèves, suivre leur progression et organiser votre enseignement. <span className="text-white font-medium">Simple. Puissant. Élégant.</span>
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        <Link
                            to="/login"
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-primary text-[#1e1e1e] font-bold py-4 px-10 rounded-full hover:bg-[#c4a46d] transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                        >
                            Commencer maintenant
                            <ChevronRight size={20} />
                        </Link>
                        <a href="#features" className="w-full md:w-auto flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-semibold py-4 px-10 rounded-full hover:bg-white/10 transition-all backdrop-blur-sm">
                            En savoir plus
                        </a>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="max-w-7xl mx-auto px-6 md:px-12 mb-40">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white mb-4">Tout ce dont vous avez besoin</h2>
                        <p className="text-grey-medium max-w-xl mx-auto">Une interface pensée pour les enseignants exigeants, alliant esthétique et fonctionnalité.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-all group hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform border border-primary/10">
                                <Users size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Structure Avancée</h3>
                            <p className="text-grey-light leading-relaxed text-sm">
                                Gérez une hiérarchie complexe : <span className="text-primary">Niveaux</span>, <span className="text-primary">Classes</span> et <span className="text-primary">Groupes</span>. Une organisation sans faille pour votre établissement.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-transparent rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform border border-blue-500/10">
                                <BookOpen size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Suivi Pédagogique</h3>
                            <p className="text-grey-light leading-relaxed text-sm">
                                Créez des parcours d'apprentissage détaillés avec <span className="text-blue-400">Activités</span> et <span className="text-blue-400">Modules</span>. Visualisez la progression en temps réel.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-[#121212] p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all group hover:-translate-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform border border-purple-500/10">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Performance & Fluidité</h3>
                            <p className="text-grey-light leading-relaxed text-sm">
                                Une interface réactive, des animations soignées et une expérience utilisateur optimisée pour le gain de temps.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Trust / Stats Section (Optional Decoration) */}
                <section className="mb-40 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm py-20">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                        <div>
                            <div className="text-4xl font-black text-white mb-2">100%</div>
                            <div className="text-sm text-grey-medium uppercase tracking-wider font-bold">Sécurisé</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">24/7</div>
                            <div className="text-sm text-grey-medium uppercase tracking-wider font-bold">Disponibilité</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">Clean</div>
                            <div className="text-sm text-grey-medium uppercase tracking-wider font-bold">Design</div>
                        </div>
                        <div>
                            <div className="text-4xl font-black text-white mb-2">Fast</div>
                            <div className="text-sm text-grey-medium uppercase tracking-wider font-bold">Performance</div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="max-w-5xl mx-auto px-6 mb-20">
                    <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] p-12 md:p-20 rounded-[2.5rem] border border-white/10 text-center relative overflow-hidden group">

                        {/* Interactive blur blobs */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 group-hover:opacity-50 transition-opacity duration-700">
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">
                                Prêt à transformer <br /> votre classe ?
                            </h2>
                            <p className="text-xl text-grey-medium mb-10 max-w-2xl mx-auto font-light">
                                Rejoignez une nouvelle ère de gestion pédagogique. Configurez votre espace en quelques minutes.
                            </p>

                            <Link
                                to="/login"
                                className="inline-flex items-center gap-3 bg-white text-black font-bold py-4 px-12 rounded-full hover:bg-gray-200 transition-all shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-1"
                            >
                                Créer un compte
                                <ChevronRight size={20} />
                            </Link>
                        </div>
                    </div>
                </section>

                <footer className="text-center text-grey-dark text-sm border-t border-white/5 pt-12 pb-12">
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <Link to="#" className="hover:text-white transition-colors">À propos</Link>
                        <Link to="#" className="hover:text-white transition-colors">Fonctionnalités</Link>
                        <Link to="#" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                    <p>&copy; 2025 Gestion de Classe — Fait avec passion.</p>
                </footer>
            </main>
        </div>
    );
};

export default Landing;
