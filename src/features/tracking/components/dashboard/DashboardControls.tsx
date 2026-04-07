/**
 * Nom du module/fichier : DashboardControls.tsx
 * 
 * Données en entrée : 
 *   - États d'affichage : Plein écran (`isFullScreen`), mode édition (`isEditMode`), état de sauvegarde (`isSaving`).
 *   - Actions : Fonctions pour basculer le plein écran, ouvrir le sélecteur de groupe, activer le mode édition.
 *   - États Kiosque : Autorisation et état d'ouverture des tablettes élèves.
 * 
 * Données en sortie : 
 *   - Une barre d'outils flottante discrète située en bas à droite de l'écran.
 * 
 * Objectif principal : Fournir un accès rapide aux réglages techniques du tableau de bord sans encombrer l'espace de travail. C'est ici que l'enseignant peut "ouvrir" sa classe numériquement (Kiosques), ajuster la disposition des colonnes ou passer en plein écran pour une meilleure visibilité.
 * 
 * Ce que ça affiche : Une série de petits boutons élégants avec des icônes (Agrandir, Groupes, Paramètres, Clavier/Kiosque) qui s'illuminent selon leur état.
 */

import React from 'react';
import { Users, Settings2, Maximize, Minimize, Check, Loader2, Keyboard, CalendarDays } from 'lucide-react';
import { Button } from '../../../../core';
import clsx from 'clsx';

interface DashboardControlsProps {
    isFullScreen: boolean;
    setFullScreen: (full: boolean) => void;
    onShowGroupSelector: () => void;
    isEditMode: boolean;
    setIsEditMode: (edit: boolean) => void;
    isSaving: boolean;
    showSyncSuccess: boolean;
    kioskOpen?: boolean;
    toggleKiosk?: () => void;
    loadingKiosk?: boolean;
    kioskPlanningOpen?: boolean;
    toggleKioskPlanning?: () => void;
    loadingKioskPlanning?: boolean;
}

/**
 * Palette de commandes flottante pour la gestion du tableau de bord.
 */
export const DashboardControls: React.FC<DashboardControlsProps> = ({
    isFullScreen,
    setFullScreen,
    onShowGroupSelector,
    isEditMode,
    setIsEditMode,
    isSaving,
    showSyncSuccess,
    kioskOpen,
    toggleKiosk,
    loadingKiosk,
    kioskPlanningOpen,
    toggleKioskPlanning,
    loadingKioskPlanning
}) => {

    /** 
     * GESTION DE L'IMMERSION : 
     * Cette fonction demande au navigateur de cacher les onglets et les barres d'outils 
     * pour que l'enseignant ne voie que son application, comme s'il s'agissait d'un logiciel dédié.
     */
    const handleFullScreenToggle = () => {
        const element = document.documentElement;
        // @ts-ignore
        const currentFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

        if (!currentFs) {
            if (element.requestFullscreen) {
                element.requestFullscreen().then(() => setFullScreen(true)).catch(console.error);
                // @ts-ignore
            } else if (element.webkitRequestFullscreen) {
                // @ts-ignore
                element.webkitRequestFullscreen(); setFullScreen(true);
                // @ts-ignore
            } else if (element.mozRequestFullScreen) {
                // @ts-ignore
                element.mozRequestFullScreen(); setFullScreen(true);
                // @ts-ignore
            } else if (element.msRequestFullscreen) {
                // @ts-ignore
                element.msRequestFullscreen(); setFullScreen(true);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setFullScreen(false)).catch(console.error);
                // @ts-ignore
            } else if (document.webkitExitFullscreen) {
                // @ts-ignore
                document.webkitExitFullscreen(); setFullScreen(false);
                // @ts-ignore
            } else if (document.mozCancelFullScreen) {
                // @ts-ignore
                document.mozCancelFullScreen(); setFullScreen(false);
                // @ts-ignore
            } else if (document.msExitFullscreen) {
                // @ts-ignore
                document.msExitFullscreen(); setFullScreen(false);
            }
        }
    };

    return (
        <div className="absolute bottom-8 right-6 z-[90] flex flex-col items-end gap-2 group translate-y-[-50%] md:translate-y-0">
            <div className="flex items-center gap-2 transition-opacity duration-300">
                {/* Bouton Plein Écran */}
                <Button
                    onClick={handleFullScreenToggle}
                    variant="secondary"
                    className="p-2.5 h-auto bg-surface/60 backdrop-blur-xl border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
                >
                    {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </Button>

                {/* Bouton Choix du Groupe (Changement de classe/atelier) */}
                <Button
                    onClick={onShowGroupSelector}
                    variant="secondary"
                    className="p-2.5 h-auto bg-surface/60 backdrop-blur-xl border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    title="Changer de groupe"
                >
                    <Users size={20} />
                </Button>

                {/* Bouton Mode Édition (Redimensionnement des colonnes) */}
                <Button
                    onClick={() => setIsEditMode(!isEditMode)}
                    variant={isEditMode ? "primary" : "secondary"}
                    className={clsx(
                        "p-2.5 h-auto backdrop-blur-xl transition-all",
                        isEditMode
                            ? "bg-primary text-black border-primary hover:bg-primary/90"
                            : "bg-surface/60 border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    )}
                    title={isEditMode ? "Mode Édition" : "Ajuster Layout"}
                >
                    {isEditMode ? (
                        <Settings2 size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
                    ) : (
                        <Settings2 size={20} />
                    )}
                </Button>
                
                {/* Bouton Kiosque Encodage (Autorisation tablettes travail) */}
                {toggleKiosk && (
                    <Button
                        onClick={toggleKiosk}
                        variant="secondary"
                        disabled={loadingKiosk}
                        className={clsx(
                            "p-2.5 h-auto backdrop-blur-xl border-white/10 transition-all active:scale-95",
                            kioskOpen 
                                ? "bg-success/20 text-success border-success/30 hover:bg-success/30" 
                                : "bg-danger/20 text-danger border-danger/30 hover:bg-danger/30"
                        )}
                        title={kioskOpen ? "Kiosque Encodage Ouvert" : "Kiosque Encodage Fermé"}
                    >
                        {loadingKiosk ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <div className="relative">
                                <Keyboard size={20} />
                                <div className={clsx(
                                    "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-surface",
                                    kioskOpen ? "bg-success animate-pulse" : "bg-danger"
                                )} />
                            </div>
                        )}
                    </Button>
                )}
                
                {/* Bouton Kiosque Planification (Autorisation tablettes agenda) */}
                {toggleKioskPlanning && (
                    <Button
                        onClick={toggleKioskPlanning}
                        variant="secondary"
                        disabled={loadingKioskPlanning}
                        className={clsx(
                            "p-2.5 h-auto backdrop-blur-xl border-white/10 transition-all active:scale-95",
                            kioskPlanningOpen 
                                ? "bg-success/20 text-success border-success/30 hover:bg-success/30" 
                                : "bg-danger/20 text-danger border-danger/30 hover:bg-danger/30"
                        )}
                        title={kioskPlanningOpen ? "Kiosque Planification Ouvert" : "Kiosque Planification Fermé"}
                    >
                        {loadingKioskPlanning ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <div className="relative">
                                <CalendarDays size={20} />
                                <div className={clsx(
                                    "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-surface",
                                    kioskPlanningOpen ? "bg-success animate-pulse" : "bg-danger"
                                )} />
                            </div>
                        )}
                    </Button>
                )}
            </div>

            {/* INDICATEUR DE SAUVEGARDE : Petit badge qui apparaît quand l'application écrit en base de données. */}
            <div className={
                clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-500",
                    isSaving || showSyncSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )
            }>
                {
                    isSaving ? (
                        <>
                            <Loader2 size={10} className="animate-spin text-primary" />
                            <span className="text-[9px] font-bold text-grey-medium uppercase tracking-tighter">Enregistrement...</span>
                        </>
                    ) : showSyncSuccess && (
                        <>
                            <Check size={10} className="text-success" />
                            <span className="text-[9px] font-bold text-success uppercase tracking-tighter">Config. synchronisée</span>
                        </>
                    )
                }
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant veut se concentrer : il clique sur l'icône "Agrandir".
 * 2. Le logiciel ordonne au navigateur Web de passer en Plein Écran. L'icône change en "Réduire".
 * 3. L'enseignant veut autoriser les élèves à utiliser les tablettes : il clique sur l'icône "Clavier".
 * 4. L'application envoie un signal au serveur : les tablettes connectées en mode "Kiosque" sont débloquées instantanément.
 * 5. Le petit point passe du Rouge au Vert (clignotant) pour confirmer que le Kiosque est ouvert.
 * 6. L'enseignant déplace une bordure de colonne pour agrandir sa zone de suivi :
 *    - Un petit texte "Enregistrement..." apparaît brièvement en bas.
 *    - Puis il laisse place à "Config. synchronisée" pour confirmer que sa nouvelle mise en page est mémorisée.
 */
export default DashboardControls;
