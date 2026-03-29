import React from 'react';
import { Lock, EyeOff, Database } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';

const Privacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-main font-sans selection:bg-primary/30">
            <PublicHeader solidBackground />

            <main className="max-w-3xl mx-auto px-6 py-24">
                <div className="mb-24">
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">
                        Confidentialité. <br />
                        <span className="text-grey-dark">D'abord.</span>
                    </h1>
                    <p className="text-xl text-grey-medium font-medium leading-loose">
                        Votre confiance est notre priorité absolue. Nous avons conçu GestionClasse pour protéger vos données et celles de vos élèves par défaut.
                    </p>
                </div>

                <div className="space-y-24">
                    {/* Section 1 */}
                    <section className="border-t border-white/10 pt-12">
                        <div className="flex items-start gap-6 mb-8">
                            <Database size={32} className="text-primary shrink-0 mt-1" />
                            <h2 className="text-3xl font-bold text-white tracking-tight">Données collectées</h2>
                        </div>
                        <div className="pl-14 text-lg text-grey-light leading-relaxed space-y-6">
                            <p>Nous collectons strictement le minimum nécessaire au fonctionnement pédagogique :</p>
                            <ul className="grid gap-4">
                                {[
                                    "Identité de l'enseignant (Nom, Email professionnel)",
                                    "Liste des élèves (Prénom, Nom, Niveau)",
                                    "Données pédagogiques (Progression, Compétences)",
                                    "Paramètres d'interface"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-grey-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="border-t border-white/10 pt-12">
                        <div className="flex items-start gap-6 mb-8">
                            <Lock size={32} className="text-primary shrink-0 mt-1" />
                            <h2 className="text-3xl font-bold text-white tracking-tight">Sécurité & RGPD</h2>
                        </div>
                        <div className="pl-14 text-lg text-grey-light leading-relaxed space-y-6">
                            <p>
                                L'application respecte les normes les plus strictes. Vos données sont hébergées sur des serveurs sécurisés en Europe.
                            </p>
                            <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 text-base">
                                <p className="mb-4 text-white font-bold">Vos droits (RGPD)</p>
                                <p className="text-grey-medium">
                                    Vous restez seul propriétaire de vos données. Vous pouvez à tout moment demander l'export complet ou la suppression définitive de votre compte et de toutes les données associées depuis votre espace personnel.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section className="border-t border-white/10 pt-12">
                        <div className="flex items-start gap-6 mb-8">
                            <EyeOff size={32} className="text-primary shrink-0 mt-1" />
                            <h2 className="text-3xl font-bold text-white tracking-tight">Photos & Médias</h2>
                        </div>
                        <div className="pl-14 text-lg text-grey-light leading-relaxed space-y-6">
                            <p>
                                Les photos des élèves utilisées pour les trombinoscopes sont chiffrées. Elles ne sont visibles que par vous, au sein de votre session authentifiée.
                            </p>
                            <p className="text-grey-medium italic text-base">
                                Nous n'utilisons aucun algorithme de reconnaissance faciale. Les photos servent uniquement d'aide visuelle pour l'enseignant.
                            </p>
                        </div>
                    </section>
                </div>

                <div className="mt-32 pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-grey-dark">
                    <p>© 2026 GestionClasse. Tous droits réservés.</p>
                    <p>Dernière mise à jour : Janvier 2026</p>
                </div>
            </main>
        </div>
    );
};

export default Privacy;
