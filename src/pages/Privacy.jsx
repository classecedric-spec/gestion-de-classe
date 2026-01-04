import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, EyeOff, Database, FileText, ChevronLeft } from 'lucide-react';
import Footer from '../components/Footer';

const Privacy = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary/30">
            {/* Header */}
            <header className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform group">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-text-dark font-black shadow-lg">G</div>
                    <span className="text-sm font-black uppercase tracking-widest text-white italic">Gestion<span className="text-primary not-italic">Classe</span></span>
                </Link>
                <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-grey-medium hover:text-primary transition-colors">
                    <ChevronLeft size={14} /> Retour à l'accueil
                </Link>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <div className="mb-20 text-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10"></div>
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8 border border-primary/20 shadow-xl">
                        <ShieldCheck size={40} />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">
                        VIE PRIVÉE & <br /> <span className="text-primary not-italic">CONFIDENTIALITÉ</span>
                    </h1>
                    <p className="text-grey-medium font-medium">Nous plaçons la protection de vos données et de celles de vos élèves au cœur de notre développement.</p>
                </div>

                <div className="space-y-12">
                    {/* Section 1 */}
                    <div className="bg-surface/30 p-8 md:p-10 rounded-[2.5rem] border border-border backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/10">
                                <Database size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Nature des données collectées</h2>
                        </div>
                        <div className="space-y-4 text-grey-light font-medium leading-relaxed">
                            <p>Nous collectons uniquement les informations nécessaires au bon fonctionnement de l'application pédagogique :</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Informations de l'enseignant (Nom, Prénom, Email, École)</li>
                                <li>Informations des élèves (Nom, Prénom, Niveau scolaire)</li>
                                <li>Suivi pédagogique (Progressions, réussites, besoins d'aide)</li>
                                <li>Préférences d'affichage et réglages de l'interface</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="bg-surface/30 p-8 md:p-10 rounded-[2.5rem] border border-border backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/10">
                                <Lock size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Sécurité & RGPD</h2>
                        </div>
                        <div className="space-y-4 text-grey-light font-medium leading-relaxed">
                            <p>L'application est conçue dans le respect des principes du RGPD (Règlement Général sur la Protection des Données) :</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Les données sont exclusivement stockées sur des serveurs sécurisés.</li>
                                <li>Aucune donnée n'est revendue à des tiers ou utilisée à des fins publicitaires.</li>
                                <li>L'accès aux données des élèves est strictement limité à l'enseignant titulaire du compte.</li>
                                <li>Vous disposez d'un droit d'accès, de rectification et de suppression totale de vos données via les paramètres de l'application.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="bg-surface/30 p-8 md:p-10 rounded-[2.5rem] border border-border backdrop-blur-sm shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/10">
                                <EyeOff size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Droit à l'image</h2>
                        </div>
                        <div className="space-y-4 text-grey-light font-medium leading-relaxed">
                            <p>Si vous téléchargez des photos d'élèves pour faciliter leur identification dans l'interface :</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Ces photos sont converties et stockées sous forme cryptée.</li>
                                <li>Elles ne sont visibles que par vous-même au sein de votre session sécurisée.</li>
                                <li>Nous recommandons d'obtenir l'accord parental classique pour l'utilisation d'outils numériques internes.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-20 text-center">
                    <p className="text-[10px] font-black text-grey-dark uppercase tracking-widest mb-4">Dernière mise à jour : Janvier 2026</p>
                    <Link to="/login" className="text-primary hover:text-white underline underline-offset-8 transition-colors text-sm font-bold uppercase tracking-widest">
                        Retour au Dashboard
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Privacy;
