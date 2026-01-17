
import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, LineChart, Users, Layers, BookOpen, Settings, Fingerprint, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
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
            image: '/assets/documentation/eleves.png',
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
            image: '/assets/documentation/presence.png',
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
            <PublicHeader />

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
                    <div className="lg:col-span-9 space-y-32">
                        {sections.map((section, index) => (
                            <section key={section.id} id={section.id} className="scroll-mt-40 group">
                                <div className={clsx(
                                    "flex flex-col gap-16 items-center",
                                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                                )}>

                                    {/* Text Content */}
                                    <div className="flex-1 space-y-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                                            <section.icon size={12} />
                                            {section.title}
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[0.95]">
                                            {section.title === 'Tableau de bord' && <>Votre journée. <br /><span className="text-grey-dark">En un clin d'œil.</span></>}
                                            {section.title === 'Suivi' && <>Progression. <br /><span className="text-grey-dark">Maîtrisée.</span></>}
                                            {section.title === 'Utilisateurs' && <>Vos élèves. <br /><span className="text-grey-dark">Au centre.</span></>}
                                            {section.title === 'Activités' && <>Parcours. <br /><span className="text-grey-dark">Sur mesure.</span></>}
                                            {section.title === 'Présence' && <>Appel. <br /><span className="text-grey-dark">Simplifié.</span></>}
                                            {section.title === 'Paramètres' && <>Votre espace. <br /><span className="text-grey-dark">Personnalisé.</span></>}
                                        </h2>
                                        <div className="text-lg text-grey-medium leading-relaxed font-medium">
                                            {section.content}
                                        </div>
                                    </div>

                                    {/* Image Content */}
                                    {section.image && (
                                        <div className="flex-1 w-full max-w-xl">
                                            <div className="relative group/image">
                                                {/* Glow effect */}
                                                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2.5rem] blur-[50px] opacity-0 group-hover/image:opacity-100 transition-opacity duration-700"></div>

                                                {/* Image Frame */}
                                                <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-surface transform group-hover/image:scale-[1.02] transition-transform duration-500">
                                                    <div className="absolute top-0 left-0 w-full h-8 bg-black/20 backdrop-blur-md border-b border-white/5 flex items-center gap-2 px-4">
                                                        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                                        <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                                                        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                                    </div>
                                                    <img
                                                        src={section.image}
                                                        alt={`Aperçu ${section.title}`}
                                                        className="w-full h-auto object-cover pt-8" // pt-8 to clear the "browser bar"
                                                    />
                                                    {/* Reflection */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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
