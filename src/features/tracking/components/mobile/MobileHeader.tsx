/**
 * Nom du module/fichier : MobileHeader.tsx
 * 
 * Données en entrée : 
 *   - `groups` : Liste des classes/groupes gérés par l'enseignant.
 *   - `currentGroupId` : L'identifiant du groupe actuellement affiché.
 *   - `onGroupChange` : Action pour changer de classe depuis le mobile.
 *   - `isOnline` : État de la connexion internet (pour l'icône de synchronisation).
 *   - `helpRequestCount` : Nombre total de demandes d'aide en attente.
 *   - `onAutoSuivi` : Action pour lancer la génération automatique du suivi.
 * 
 * Données en sortie : 
 *   - Un en-tête compact et informatif fixé en haut de l'écran mobile.
 * 
 * Objectif principal : Servir de tour de contrôle mobile. Il regroupe les fonctions vitales : changer de classe, voir si l'on est bien connecté (hors-ligne possible), surveiller le nombre d'alertes élèves, et lancer des actions rapides comme le "Suivi Auto" (qui scanne les tablettes pour trouver les exercices finis).
 * 
 * Ce que ça affiche : 
 *   - Un bouton de retour et un sélecteur de classe.
 *   - Des boutons d'action rapide : "Urgent" (rose) et "Suivi Auto" (bleu).
 *   - Un badge clignotant avec le nombre de mains levées.
 *   - Une icône "Wi-Fi barré" rouge si la connexion est perdue.
 */

import React from 'react';
import { ArrowLeft, Users, ChevronDown, WifiOff, Loader2, Activity, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface MobileHeaderProps {
    groups: { id: string; nom: string }[];
    currentGroupId: string | undefined;
    onGroupChange: (groupId: string) => void;
    isOnline: boolean;
    helpRequestCount: number;
    isAutoGenerating: boolean;
    onAutoSuivi: () => void;
}

/**
 * En-tête de navigation et d'actions pour l'interface mobile (Tablette/Smartphone).
 */
const MobileHeader: React.FC<MobileHeaderProps> = ({
    groups,
    currentGroupId,
    onGroupChange,
    isOnline,
    helpRequestCount,
    isAutoGenerating,
    onAutoSuivi
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
            {/* PREMIÈRE LIGNE : Retour et Choix de la classe */}
            <div className="flex items-center gap-3 mb-3">
                <button
                    onClick={() => navigate('/mobile-dashboard')}
                    title="Retour au tableau de bord"
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-grey-medium hover:text-primary hover:bg-white/10 transition-all shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="relative flex-1">
                    <select
                        value={currentGroupId}
                        onChange={(e) => onGroupChange(e.target.value)}
                        aria-label="Sélectionner un groupe"
                        className="w-full bg-background border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-8 appearance-none text-sm font-bold"
                    >
                        {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.nom}</option>
                        ))}
                    </select>
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" size={16} />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={14} />
                </div>
            </div>

            {/* SECONDE LIGNE : Statuts et Actions rapides */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black uppercase tracking-tighter text-primary leading-none">Suivi Mobile</h1>
                    {/* Alerte mode Hors-ligne (si le Wi-Fi de l'école saute) */}
                    {!isOnline && (
                        <div className="bg-danger/20 p-1.5 rounded-full animate-pulse" title="Mode Hors-ligne">
                            <WifiOff size={14} className="text-danger" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Bouton VISION URGENTE : Voir ce qui est en retard */}
                    <button
                        onClick={() => navigate(`/mobile-vision-urgente/${currentGroupId}`)}
                        className="flex items-center gap-2 bg-rose-500/20 text-rose-500 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-lg shadow-rose-500/5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                        title="Vision Urgente"
                    >
                        <Clock size={12} />
                        Urgent
                    </button>
                    {/* Bouton SUIVI AUTO : Déclencher la recherche de travaux finis */}
                    <button
                        onClick={onAutoSuivi}
                        disabled={isAutoGenerating || !isOnline}
                        className={clsx(
                            "flex items-center gap-2 bg-primary text-black px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest",
                            (isAutoGenerating || !isOnline) && "opacity-50"
                        )}
                    >
                        {isAutoGenerating ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                        Suivi Auto
                    </button>
                    {/* Badge clignotant : Compte des mains levées en classe */}
                    <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20 shadow-lg shadow-primary/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        <span className="text-xs font-black text-primary">{helpRequestCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileHeader;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant circule dans les rangs avec son smartphone.
 * 2. OBSERVATION : Il voit que la petite pastille de notification affiche "3". Cela veut dire que 3 élèves ont besoin d'aide.
 * 3. ACTION RÉSEAU : Le Wi-Fi de la classe a une micro-coupure.
 * 4. RÉACTION : L'icône "Wi-Fi barré" clignote en rouge. L'enseignant sait qu'il peut continuer à saisir des notes mais qu'elles seront envoyées plus tard.
 * 5. ACTION RAPIDE : Il veut faire un point sur les retards. Il appuie sur "Urgent".
 * 6. NAVIGATION : L'application le redirige vers l'écran récapitulant tout ce qui a dépassé la date limite.
 * 7. RETOUR : Il clique sur la flèche de gauche pour revenir à sa vue globale de classe.
 */
