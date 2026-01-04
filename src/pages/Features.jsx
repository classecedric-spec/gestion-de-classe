import React from 'react';
import { Link } from 'react-router-dom';
import {
    Users, BookOpen, Smartphone, ShieldCheck, Zap,
    Layers, GraduationCap, BarChart3, Clock, LayoutDashboard,
    ChevronLeft, Sparkles, Activity
} from 'lucide-react';
import Footer from '../components/Footer';

const Features = () => {
    const featuresList = [
        {
            icon: Layers,
            title: "Structure Organisationnelle",
            desc: "Créez une hiérarchie sur mesure avec Niveaux, Classes et Groupes. Idéal pour les écoles primaires et les environnements multi-niveaux.",
            details: ["Multi-classes par compte", "Groupes de travail dynamiques", "Gestion des niveaux scolaires"]
        },
        {
            icon: GraduationCap,
            title: "Suivi Pédagogique",
            desc: "Suivez chaque élève individuellement à travers des parcours d'apprentissage structurés en branches, sous-branches et modules.",
            details: ["Validation par compétences", "Historique complet", "Statuts configurables"]
        },
        {
            icon: Smartphone,
            title: "Interface Mobile (iPhone)",
            desc: "Une version web optimisée pour mobile pour valider les acquis directement en classe, sans quitter les élèves des yeux.",
            details: ["Mode 'Quick Action'", "Compteur de demandes d'aide", "Suivi automatique intelligent"]
        },
        {
            icon: Activity,
            title: "Suivi Automatique",
            desc: "Algorithme intelligent qui sélectionne les élèves prioritaires pour le suivi en fonction de leur importance et de leur rotation.",
            details: ["Pondération personnalisée", "Rotation équilibrée", "Gain de temps majeur"]
        },
        {
            icon: BarChart3,
            title: "Tableau d'Avancement",
            desc: "Visualisez en un coup d'œil l'état de la classe par module ou par élève avec des codes couleurs intuitifs.",
            details: ["Export PDF (prochainement)", "Filtres multicritères", "Vue globale ou détaillée"]
        },
        {
            icon: ShieldCheck,
            title: "Sécurité & Confidentialité",
            desc: "Vos données sont chiffrées et protégées. Nous respectons strictement la vie privée des élèves et des enseignants.",
            details: ["Conformité RGPD", "Hébergement sécurisé", "Validation admin des comptes"]
        }
    ];

    return (
        <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary/30">
            {/* Header / Nav */}
            <header className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-text-dark font-black">G</div>
                    <span className="text-sm font-black uppercase tracking-widest text-white italic">Gestion<span className="text-primary not-italic">Classe</span></span>
                </Link>
                <Link to="/login" className="px-5 py-2 bg-primary text-text-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-primary/10">
                    Se Connecter
                </Link>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-20">
                {/* Hero */}
                <div className="text-center mb-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10"></div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border text-[10px] font-black uppercase tracking-widest text-primary mb-6 shadow-xl">
                        <Sparkles size={12} /> Des outils pour l'excellence
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">
                        CONÇU POUR <br /> <span className="text-primary not-italic underline decoration-primary/20 decoration-8 underline-offset-4">LES ENSEIGNANTS</span>
                    </h1>
                    <p className="text-lg md:text-xl text-grey-medium max-w-2xl mx-auto font-medium">
                        Découvrez comment notre écosystème simplifie votre quotidien et maximise l'impact de votre pédagogie.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuresList.map((f, i) => (
                        <div key={i} className="bg-surface/30 p-8 rounded-[2rem] border border-border hover:border-primary/50 transition-all group hover:-translate-y-2 relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform border border-primary/10">
                                <f.icon size={28} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3 tracking-tight uppercase italic">{f.title}</h3>
                            <p className="text-sm text-grey-medium mb-6 leading-relaxed font-medium">{f.desc}</p>
                            <ul className="space-y-2">
                                {f.details.map((detail, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-[11px] font-bold text-grey-light uppercase tracking-wide">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                                        {detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-32 p-12 md:p-20 bg-gradient-to-br from-surface to-background border border-border rounded-[3rem] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary rounded-full blur-[100px]"></div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">
                        PRÊT À <span className="text-primary not-italic">SIMPLIFIER</span> <br /> VOTRE VIE ?
                    </h2>
                    <Link to="/login" className="inline-flex items-center gap-3 bg-primary text-text-dark font-black py-4 px-12 rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-xl shadow-primary/20 text-xs uppercase tracking-widest">
                        Commencer Maintenant
                        <Zap size={18} />
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Features;
