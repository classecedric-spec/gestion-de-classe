import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, LayoutDashboard, Users, GraduationCap, TrendingUp, ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { Badge, Button } from '../core';

const UserGuide: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans overflow-x-hidden flex flex-col selection:bg-primary/30 selection:text-white">
            <PublicHeader />

            <main className="w-full pt-32 pb-20">
                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-20 relative pt-10">
                    <Badge
                        variant="primary"
                        size="sm"
                        icon={<BookOpen size={12} />}
                        className="mb-8 shadow-xl shadow-black/20 backdrop-blur-md rounded-full px-4"
                    >
                        Documentation
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-semibold text-white mb-8 tracking-tighter leading-tight">
                        Mode d'emploi <br />
                        <span className="text-primary">GestionClasse</span>
                    </h1>

                    <p className="text-xl text-grey-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                        Découvrez comment maîtriser tous les outils de votre nouvelle classe numérique.
                        Simple, rapide et efficace.
                    </p>
                </section>

                {/* Dashboard Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                            <LayoutDashboard size={24} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                            Le Tableau de Bord
                        </h2>
                        <p className="text-lg text-grey-medium leading-relaxed">
                            Votre centre de commande. Visualisez en un coup d'œil l'état de votre classe, les présences du jour, et les tâches urgentes.
                        </p>
                        <ul className="space-y-3 text-grey-light">
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-primary" /> Vue d'ensemble rapide</li>
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-primary" /> Accès rapide aux modules récents</li>
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-primary" /> Notifications importantes</li>
                        </ul>
                    </div>
                    <div className="flex-1">
                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface border border-white/5">
                            <img src="/assets/documentation/dashboard.png" alt="Tableau de bord" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                {/* Students Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row-reverse items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-2">
                            <Users size={24} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                            Gestion des Élèves
                        </h2>
                        <p className="text-lg text-grey-medium leading-relaxed">
                            Accédez aux fiches individuelles de chaque élève. Gérez leurs informations, leurs groupes et suivez leur parcours scolaire année après année.
                        </p>
                        <ul className="space-y-3 text-grey-light">
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-blue-400" /> Fiches élèves détaillées</li>
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-blue-400" /> Gestion des groupes (Drag & Drop)</li>
                            <li className="flex items-center gap-3"><ChevronRight size={16} className="text-blue-400" /> Import/Export facile</li>
                        </ul>
                    </div>
                    <div className="flex-1">
                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface border border-white/5">
                            <img src="/assets/documentation/eleves.png" alt="Gestion des élèves" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                {/* Activities Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-2">
                            <GraduationCap size={24} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                            Activités & Parcours
                        </h2>
                        <p className="text-lg text-grey-medium leading-relaxed">
                            Organisez votre pédagogie. Créez des branches, des modules et des activités spécifiques pour chaque niveau.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs font-medium text-grey-light">Français</span>
                            <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs font-medium text-grey-light">Mathématiques</span>
                            <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs font-medium text-grey-light">Sciences</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface border border-white/5">
                            <img src="/assets/documentation/activites.png" alt="Activités" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                {/* Tracking Section */}
                <section className="max-w-7xl mx-auto px-6 md:px-12 mb-32 flex flex-col md:flex-row-reverse items-center gap-16">
                    <div className="flex-1 space-y-6">
                        <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 mb-2">
                            <TrendingUp size={24} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                            Suivi des Compétences
                        </h2>
                        <p className="text-lg text-grey-medium leading-relaxed">
                            Évaluez la progression. Validez les acquis en temps réel et générez des rapports de compétences précis pour les bulletins.
                        </p>
                    </div>
                    <div className="flex-1">
                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-surface border border-white/5">
                            <img src="/assets/documentation/suivi.png" alt="Suivi des compétences" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="max-w-4xl mx-auto px-6 mb-20">
                    <div className="bg-gradient-to-br from-surface to-background p-12 rounded-[3rem] border border-border text-center relative overflow-hidden group">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                            Prêt à commencer ?
                        </h2>
                        <p className="text-lg text-grey-medium mb-10 max-w-lg mx-auto">
                            Rejoignez dès maintenant l'application et configurez votre classe en quelques minutes.
                        </p>
                        <Button
                            as={Link}
                            to="/login"
                            className="inline-flex py-4 px-12 rounded-xl text-sm uppercase tracking-wider"
                            size="lg"
                            icon={ArrowRight}
                        >
                            Accéder à mon espace
                        </Button>
                    </div>
                </section>

                <Footer />
            </main>
        </div>
    );
};

export default UserGuide;
