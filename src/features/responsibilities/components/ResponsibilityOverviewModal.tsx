/**
 * Nom du module/fichier : ResponsibilityOverviewModal.tsx
 * 
 * Données en entrée : 
 *   - `isOpen` : Contrôle l'affichage de la fenêtre.
 *   - `session` : L'utilisateur connecté (enseignant).
 * 
 * Données en sortie : 
 *   - Affichage d'un tableau récapitulatif des "métiers" de la classe.
 * 
 * Objectif principal : Offrir une vue d'ensemble "grand format" des responsabilités de la classe. C'est le tableau que l'enseignant peut projeter au tableau ou consulter rapidement pour savoir qui doit arroser les plantes, qui est chef de rang, etc.
 * 
 * Ce que ça affiche : 
 *   - Une grille de cartes.
 *   - Chaque carte affiche le nom du métier en gros.
 *   - Sous chaque métier, on voit les photos et les prénoms des élèves responsables.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Avatar, SuspenseLoader } from '../../../core';
import { ClipboardList, Users } from 'lucide-react';
import { responsabiliteService } from '../services/responsabiliteService';
import { useAuth } from '../../../hooks/useAuth';
import { getInitials } from '../../../lib/helpers';

interface ResponsibilityOverviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Fenêtre de vue d'ensemble des responsabilités.
 */
const ResponsibilityOverviewModal: React.FC<ResponsibilityOverviewModalProps> = ({
    isOpen,
    onClose
}) => {
    const { session } = useAuth();

    /**
     * RÉCUPÉRATION : Charge les données depuis le service.
     * Utilise `useQuery` pour gérer automatiquement le cache et le chargement.
     */
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['responsibilities', session?.user.id],
        queryFn: () => responsabiliteService.getResponsibilities(session!.user.id),
        enabled: !!session?.user.id && isOpen,
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tableau des Responsabilités"
            className="!max-w-[1000px] !h-[80vh]"
        >
            {/* 1. État de chargement */}
            {isLoading ? (
                <div className="h-full flex items-center justify-center">
                    <SuspenseLoader />
                </div>
            ) : /* 2. Cas où aucune donnée n'existe */
            tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-grey-medium p-12 text-center">
                    <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-xl font-bold text-white mb-2">Aucune responsabilité définie</p>
                    <p>Rendez-vous dans la page "Responsabilités" pour commencer.</p>
                </div>
            ) : (
                /* 3. Affichage de la grille des métiers */
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-grey-medium">Tableau des Responsabilités</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                        {tasks.map(task => (
                            <div key={task.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group flex flex-col h-full">
                                <h4 className="text-xl font-black text-white mb-4 group-hover:text-primary transition-colors">{task.titre}</h4>
                                <div className="flex flex-wrap gap-4 mt-auto">
                                    {/* Affichage des élèves pour ce métier précis */}
                                    {task.eleves && task.eleves.length > 0 ? (
                                        task.eleves.map(assignment => (
                                            <div key={assignment.id} className="flex flex-col items-center gap-2 group/avatar">
                                                <Avatar
                                                    size="md"
                                                    initials={getInitials(assignment.eleve as any)}
                                                    src={assignment.eleve.photo_url}
                                                    className="ring-2 ring-transparent group-hover/avatar:ring-primary/50 transition-all shadow-premium"
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-grey-light text-center w-20 truncate">
                                                    {assignment.eleve.prenom}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        /* Message si personne n'est assigné */
                                        <div className="flex items-center gap-2 text-grey-dark py-2">
                                            <Users className="w-4 h-4 opacity-50" />
                                            <span className="text-xs font-bold uppercase tracking-widest italic opacity-50">Aucun élève</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ResponsibilityOverviewModal;

/**
 * LOGIGRAMME DE CONSULTATION :
 * 
 * 1. ACTION -> L'utilisateur ouvre la fenêtre (Modal).
 * 2. APPEL -> Le programme demande immédiatement la liste des métiers et des élèves assignés.
 * 3. GÉNÉRATION -> Pour chaque métier (ex: 'Facteur'), il crée une carte blanche.
 * 4. REMPLISSAGE -> À l'intérieur de la carte 'Facteur', il place les avatars des élèves qui ont été choisis.
 * 5. PRÉSENTATION -> L'enseignant a une vision claire du fonctionnement social de sa classe.
 */
