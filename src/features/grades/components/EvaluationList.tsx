/**
 * Nom du module/fichier : EvaluationList.tsx
 * 
 * Données en entrée : La liste des évaluations existantes pour une branche et une période données.
 * 
 * Données en sortie : Un affichage visuel de ces évaluations, permettant à l'utilisateur d'en sélectionner une pour saisir les notes ou de la supprimer.
 * 
 * Objectif principal : Afficher sous forme de "cartes" résumées la liste des contrôles ou devoirs déjà programmés.
 * 
 * Ce que ça affiche : Soit un message guidant l'utilisateur s'il n'a rien sélectionné, soit un message "Aucune évaluation", soit une grille de cartes (avec le titre, la date, et des boutons "Saisir" ou "Supprimer").
 */

import React, { useState } from 'react';
import { Tables } from '../../../types/supabase';
import { Card, Button, Badge, EmptyState, ConfirmModal } from '../../../core';
import { Calendar, Trash2, ChevronRight, BarChart3 } from 'lucide-react';

interface EvaluationListProps {
    evaluations: Tables<'Evaluation'>[];
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    brancheId?: string;
    periode?: string;
}

const EvaluationList: React.FC<EvaluationListProps> = ({
    evaluations,
    onSelect,
    onDelete,
    brancheId,
    periode
}) => {
    const [evalToDelete, setEvalToDelete] = useState<string | null>(null);

    // Vérifie si l'utilisateur a bien sélectionné un contexte (ex: la matière et le trimestre). Si non, affiche un message d'aide pour l'inviter à le faire.
    if (!brancheId || !periode) {
        return (
            <EmptyState
                title="Saisie des notes"
                description="Veuillez sélectionner une branche et une période pour voir ou créer des évaluations."
                icon={BarChart3}
            />
        );
    }

    // Vérifie s'il n'y a pas encore de contrôle créé pour cette matière/période. Si la liste est vide, affiche un message l'invitant à créer la première évaluation.
    if (evaluations.length === 0) {
        return (
            <EmptyState
                title="Aucune évaluation"
                description="Il n'y a pas encore d'évaluation pour ce contexte. Cliquez sur 'Nouvelle Évaluation' pour commencer."
                icon={Calendar}
            />
        );
    }

    // Construit visuellement la grille contenant toutes les évaluations sous forme de petites cartes rectangulaires.
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {evaluations.map((ev) => (
                    <Card key={ev.id} className="p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                                <h3 className="font-bold text-grey-dark group-hover:text-primary transition-colors">
                                    {ev.titre}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-grey-medium">
                                    <Calendar size={12} />
                                    {new Date(ev.date).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                            {(ev as any).TypeNote?.nom && (
                                <Badge variant="secondary" className="text-[10px] bg-white/5 text-grey-medium border-white/10 uppercase tracking-wider font-bold">
                                    {(ev as any).TypeNote.nom}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-6">
                            <div className="text-xs font-semibold text-primary">
                                Sur {ev.note_max}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEvalToDelete(ev.id);
                                    }}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 size={14} />
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={() => onSelect(ev.id)}
                                    className="flex items-center gap-1"
                                >
                                    Saisir
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <ConfirmModal
                isOpen={!!evalToDelete}
                onClose={() => setEvalToDelete(null)}
                onConfirm={() => {
                    if (evalToDelete) {
                        onDelete(evalToDelete);
                        setEvalToDelete(null);
                    }
                }}
                title="Supprimer l'évaluation"
                message="Êtes-vous sûr de vouloir supprimer cette évaluation ? Cette action supprimera également toutes les notes associées."
                confirmText="Supprimer"
                variant="danger"
            />
        </>
    );
};

/**
 * 1. Le composant s'allume et reçoit la liste des évaluations de la classe sélectionnée.
 * 2a. S'il ignore encore quelle matière ou quel trimestre regarder, il demande d'abord à l'utilisateur de les choisir en haut de page.
 * 2b. S'il sait où regarder mais qu'il n'y a aucun devoir enregistré, il l'annonce clairement au milieu de l'écran.
 * 3. S'il y a des devoirs, il les affiche joliment dans une grille. Chaque devoir est résumé dans une "carte" avec son titre et sa date.
 * 4a. L'enseignant a la possibilité de cliquer sur le petit bouton "Poubelle" pour détruire l'évaluation (une fenêtre de confirmation de sécurité apparaîtra alors).
 * 4b. Ou bien, il peut cliquer sur "Saisir" pour entrer dans le détail de l'évaluation et commencer à encoder les résultats de ses élèves.
 */
export default EvaluationList;
