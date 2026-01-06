
import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, LineChart, Users, Layers, BookOpen, Settings, Fingerprint, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const Fonctionnement = () => {
    const [activeSection, setActiveSection] = useState('dashboard');

    const sections = [
        {
            id: 'dashboard',
            title: 'Tableau de bord',
            icon: LayoutDashboard,
            image: '/assets/documentation/dashboard.png',
            content: (
                <>
                    <p>Le tableau de bord centralise toutes les informations essentielles pour démarrer votre journée.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Accès Rapide :</strong> Sélectionnez un groupe et générez instantanément les listes de travail au format PDF.</li>
                        <li><strong>Vue d'ensemble :</strong> Visualisez vos élèves par niveau avec leurs photos pour une identification rapide.</li>
                        <li><strong>Indicateurs :</strong> Repérez d'un coup d'œil les élèves nécessitant une attention particulière grâce aux pastilles de statut.</li>
                    </ul>
                </>
            )
        },
        {
            id: 'suivi',
            title: 'Suivi',
            icon: LineChart,
            image: '/assets/documentation/suivi.png',
            content: (
                <>
                    <p>Le module de suivi offre deux vues complémentaires pour gérer la progression des élèves.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Encodage :</strong> Une interface dédiée pour valider les compétences élève par élève. Cliquez sur une activité pour changer son statut (Non commencé, En cours, Validé).</li>
                        <li><strong>Suivi des groupes :</strong> Un tableau synthétique pour visualiser l'avancement global de la classe sur un module spécifique.</li>
                        <li><strong>Minuteur intégré :</strong> Lancez un compte à rebours pour rythmer les ateliers directement depuis l'interface.</li>
                    </ul>
                </>
            )
        },
        {
            id: 'users',
            title: 'Utilisateurs',
            icon: Users,
            content: (
                <>
                    <p>Gérez l'ensemble de votre effectif scolaire avec simplicité.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Fiches Élèves :</strong> Créez des profils détaillés avec photo, date de naissance et informations de contact des parents.</li>
                        <li><strong>Organisation :</strong> Structurez votre classe en groupes de travail flexibles et assignez des niveaux spécifiques.</li>
                        <li><strong>Gestion des Adultes :</strong> Ajoutez des collaborateurs (enseignants remplaçants, AESH) avec des droits d'accès adaptés.</li>
                    </ul>
                </>
            )
        },
        {
            id: 'activities',
            title: 'Activités',
            icon: Layers,
            image: '/assets/documentation/activites.png',
            content: (
                <>
                    <p>Construisez votre programme pédagogique grâce à une structure arborescente intuitive.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Hiérarchie :</strong> Organisez vos matières (Branches) et thématiques (Sous-branches) de manière logique (ex: Français &gt; Grammaire &gt; Le Verbe).</li>
                        <li><strong>Détails des Activités :</strong> Définissez les objectifs, les consignes et associez le **matériel requis** pour chaque tâche.</li>
                        <li><strong>Modules :</strong> Regroupez plusieurs activités en modules temporels pour planifier l'année scolaire.</li>
                    </ul>
                </>
            )
        },
        {
            id: 'presence',
            title: 'Présence',
            icon: Fingerprint,
            content: (
                <>
                    <p>Un outil rapide pour la gestion administrative quotidienne.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Appel Rapide :</strong> Marquez les présents et les absents en quelques clics depuis votre tablette ou ordinateur.</li>
                        <li><strong>Historique :</strong> Retrouvez facilement les dates d'absence et gérez les justficatifs.</li>
                    </ul>
                </>
            )
        },
        {
            id: 'settings',
            title: 'Paramètres',
            icon: Settings,
            image: '/assets/documentation/parametres.png',
            content: (
                <>
                    <p>Adaptez l'application à vos besoins personnels.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-4 text-grey-medium">
                        <li><strong>Profil :</strong> Mettez à jour vos informations personnelles et sécurisez votre compte.</li>
                        <li><strong>Préférences :</strong> Activez ou désactivez les notifications et personnalisez l'affichage des listes.</li>
                        <li><strong>Configuration École :</strong> Définissez les périodes scolaires et les jours fériés.</li>
                    </ul>
                </>
            )
        }
    ];

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -120; // Offset for fixed header
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    // Intersection Observer to update active section on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: '-20% 0px -60% 0px' }
        );

        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-background text-text-main font-sans flex flex-col selection:bg-primary/30 selection:text-white transition-colors duration-500">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full h-20 flex items-center justify-between px-6 md:px-12 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#b8955c] flex items-center justify-center text-text-dark font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        G
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase italic">
                        Gestion<span className="text-primary not-italic">Classe</span>
                    </span>
                </Link>
                <Link
                    to="/login"
                    className="flex items-center gap-2 bg-white/5 hover:bg-primary text-white hover:text-text-dark border border-white/10 hover:border-primary py-2 px-4 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95"
                >
                    Connexion
                </Link>
            </header>

            <main className="w-full pt-32 pb-20 flex-grow px-6 md:px-12 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border text-[10px] font-black uppercase tracking-widest text-primary mb-6 shadow-xl shadow-black/40">
                        <BookOpen size={12} />
                        Guide d'utilisation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase">
                        Comment ça <span className="text-primary">marche</span> ?
                    </h1>
                    <p className="text-grey-medium max-w-2xl mx-auto text-lg">
                        Découvrez comment notre suite d'outils interconnectés simplifie votre quotidien d'enseignant.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Sidebar Navigation */}
                    <aside className="lg:col-span-3 hidden lg:block">
                        <div className="sticky top-32 space-y-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={clsx(
                                        "w-full text-left py-3 px-4 rounded-xl transition-all duration-300 flex items-center gap-3 group border border-transparent",
                                        activeSection === section.id
                                            ? "bg-surface border-border/50 text-white shadow-lg"
                                            : "hover:bg-surface/50 text-grey-medium hover:text-grey-light"
                                    )}
                                >
                                    <span className={clsx(
                                        "p-1.5 rounded-lg transition-colors",
                                        activeSection === section.id ? "bg-primary text-text-dark" : "bg-white/5 group-hover:bg-white/10 text-grey-medium"
                                    )}>
                                        <section.icon size={16} />
                                    </span>
                                    <span className="font-bold text-xs uppercase tracking-wider">{section.title}</span>
                                    {activeSection === section.id && (
                                        <ChevronRight size={14} className="ml-auto text-primary animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="lg:col-span-9 space-y-24">
                        {sections.map((section) => (
                            <section key={section.id} id={section.id} className="scroll-mt-32">
                                <div className="bg-surface/30 backdrop-blur-sm border border-border rounded-3xl p-8 md:p-12 relative overflow-hidden group hover:border-primary/30 transition-colors duration-500">
                                    <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700"></div>

                                    <div className="flex items-center gap-4 mb-8 relative z-10 w-full md:w-auto">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center text-primary border border-primary/10 shadow-lg shrink-0">
                                            <section.icon size={24} />
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tight uppercase">{section.title}</h2>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
                                        <div className="order-2 md:order-1 text-grey-light leading-relaxed text-lg">
                                            {section.content}
                                        </div>
                                        {section.image && (
                                            <div className="order-1 md:order-2">
                                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
                                                    <img
                                                        src={section.image}
                                                        alt={`Aperçu ${section.title}`}
                                                        className="w-full h-auto object-cover"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Fonctionnement;
