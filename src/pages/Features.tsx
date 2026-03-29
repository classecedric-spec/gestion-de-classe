
import React from 'react';
import {
    Smartphone, Zap,
    Layers, GraduationCap, BarChart3, Activity, Sparkles
} from 'lucide-react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';

const Features: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary/30">
            <PublicHeader solidBackground />

            <main className="max-w-7xl mx-auto px-6 py-24">
                {/* Hero */}
                <div className="text-center mb-32 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10"></div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-primary mb-6 backdrop-blur-md shadow-xl">
                        <Sparkles size={12} /> Des outils pour l'excellence
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                        Conçu pour <br />
                        <span className="bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">les enseignants.</span>
                    </h1>

                    <p className="text-xl text-grey-medium max-w-2xl mx-auto font-medium leading-relaxed">
                        Un écosystème complet qui transforme votre gestion de classe en une expérience fluide et agréable.
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
                    {/* Large Feature 1 */}
                    <div className="md:col-span-2 bg-surface/40 p-10 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -mr-16 -mt-16 transition-opacity"></div>

                        <div className="relative z-10 w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary mb-8 border border-white/5">
                            <Layers size={32} strokeWidth={1.5} />
                        </div>

                        <div>
                            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Structure Sur Mesure</h3>
                            <p className="text-grey-medium text-lg mb-8 max-w-md">Créez une hiérarchie pédagogique complexe : Niveaux, Classes et Groupes. Une flexibilité totale.</p>
                            <ul className="grid grid-cols-2 gap-4">
                                {["Multi-classes", "Sous-groupes", "Niveaux multiples"].map((d, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-grey-light font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div> {d}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Tall Feature 2 */}
                    <div className="md:row-span-2 bg-gradient-to-b from-surface/40 to-surface/20 p-10 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-white/5">
                            <Smartphone size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Mobile First</h3>
                        <p className="text-grey-medium text-lg mb-8">Ne restez pas derrière votre bureau. Validez les acquis en circulant dans la classe.</p>

                        <div className="mt-auto relative rounded-xl overflow-hidden border border-white/10 shadow-2xl skew-y-3 transform translate-y-8 group-hover:translate-y-4 transition-transform duration-500">
                            <img src="/assets/documentation/suivi.png" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" alt="Mobile UI" />
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-surface/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 mb-6 font-bold">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Suivi Intelligent</h3>
                        <p className="text-grey-medium">Algorithme de rotation pour n'oublier aucun élève.</p>
                    </div>

                    {/* Feature 4 */}
                    <div className="bg-surface/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6 font-bold">
                            <BarChart3 size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Vues Détaillées</h3>
                        <p className="text-grey-medium">Tableaux de bord par classe, groupe ou élève.</p>
                    </div>

                    {/* Wide Feature 5 */}
                    <div className="md:col-span-2 bg-surface/40 p-10 rounded-[2.5rem] border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 border border-white/5">
                                <GraduationCap size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Parcours Pédagogique</h3>
                            <p className="text-grey-medium text-lg">Définissez vos branches, sous-branches et modules pour une année scolaire structurée.</p>
                        </div>
                        <div className="flex-1 w-full bg-black/20 rounded-xl p-6 border border-white/5">
                            <div className="space-y-3">
                                {['Français', 'Mathématiques', 'Sciences'].map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white font-medium">{s}</span>
                                        <div className="w-20 h-1.5 bg-grey-dark/30 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${(3 - i) * 30}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-32 relative">
                    <div className="bg-gradient-to-br from-primary to-primary-dark p-12 md:p-20 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                        <h2 className="text-4xl md:text-6xl font-black text-text-dark mb-8 tracking-tighter leading-[0.9] relative z-10">
                            Prêt à enseigner <br className="hidden md:block" /> différemment ?
                        </h2>
                        <button className="inline-flex items-center gap-3 bg-text-dark text-primary font-black py-5 px-12 rounded-full hover:scale-105 transition-all shadow-xl text-xs uppercase tracking-widest relative z-10">
                            Commencer l'expérience
                            <Zap size={18} />
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Features;
