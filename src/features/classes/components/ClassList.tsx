/**
 * Nom du module/fichier : ClassList.tsx
 * 
 * Données en entrée : 
 *   - classes : La liste complète des classes de l'école (récupérée du serveur).
 *   - loading : Un indicateur visuel de chargement.
 *   - selectedClass : La classe qui est actuellement affichée au centre pour savoir laquelle surligner.
 *   - searchQuery : Le texte que l'enseignant a tapé dans la barre de recherche.
 *   - Fonctions d'interaction (onSelect, onEdit, onDelete, onSearch, onCreate).
 * 
 * Données en sortie : Une barre latérale de navigation interactive occupant la partie gauche de l'écran.
 * 
 * Objectif principal : Faire office de menu de navigation principal pour le module des classes. Il permet de voir d'un coup d'œil l'ensemble de ses classes, d'en chercher une rapidement par son nom ou son acronyme, et de gérer les dossiers (modifier ou supprimer) sans quitter la liste des yeux.
 * 
 * Ce que ça affiche : 
 *    - Un en-tête avec un compteur total de classes.
 *    - Une barre de recherche filtrante.
 *    - Une liste défilante de "fiches classes" avec blason, titre et sous-titre (nom du professeur).
 *    - Un bouton d'action "Nouvelle Classe" en pied de page.
 */

import React, { ChangeEvent } from 'react';
import { Search, BookOpen, Plus } from 'lucide-react';
import { ClassWithAdults } from '../services/classService';
import { Badge, Button, EmptyState, Avatar, Input, ListItem } from '../../../core';

export interface ClassListProps {
    classes: ClassWithAdults[];
    loading: boolean;
    selectedClass: ClassWithAdults | null;
    onSelect: (classe: ClassWithAdults) => void;
    onEdit: (classe: ClassWithAdults) => void;
    onDelete: (classe: ClassWithAdults) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
    onCreate: () => void;
}

/**
 * Composant de navigation latérale affichant la liste des classes.
 */
const ClassList: React.FC<ClassListProps> = ({
    classes,
    loading,
    selectedClass,
    onSelect,
    onEdit,
    onDelete,
    onSearch,
    searchQuery,
    onCreate
}) => {
    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            
            {/* EN-TÊTE : Titre et barre de recherche rapide */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} />
                        Gestion des Classes
                    </h2>
                    <Badge variant="primary" size="sm">
                        {classes.length} Dossiers
                    </Badge>
                </div>
                {/* Champ de saisie pour filtrer dynamiquement la liste affichée en dessous */}
                <Input
                    placeholder="Chercher une classe..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
                    icon={Search}
                    className="bg-background/50"
                />
            </div>

            {/* CORPS : Zone de défilement contenant la liste des classes */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                {loading ? (
                    // Indicateur de chargement visuel
                    <div className="flex justify-center py-8">
                        <Avatar size="md" loading={true} initials="" />
                    </div>
                ) : classes.length === 0 ? (
                    // État affiché si aucune classe ne correspond à la recherche
                    <EmptyState
                        icon={BookOpen}
                        title="Aucune classe"
                        description="Créez votre première classe pour commencer à gérer vos élèves."
                        size="sm"
                    />
                ) : (
                    // Construction des lignes de la liste pour chaque classe trouvée
                    classes.map((classe) => {
                        // On cherche qui est l'enseignant titulaire (principal) pour l'afficher
                        const principalAdult = classe.ClasseAdulte?.find(ca => ca.role === 'principal')?.Adulte?.nom;

                        return (
                            <ListItem
                                key={classe.id}
                                id={classe.id}
                                title={classe.nom}
                                // Si un prof principal est lié, on l'affiche, sinon on affiche l'acronyme
                                subtitle={principalAdult ? `Pr. ${principalAdult}` : (classe.acronyme || 'Classe sans acronyme')}
                                isSelected={selectedClass?.id === classe.id}
                                onClick={() => onSelect(classe)}
                                onEdit={() => onEdit(classe)}
                                onDelete={() => onDelete(classe)}
                                deleteTitle="Supprimer définitivement"
                                avatar={{
                                    src: (classe as any).photo_base64 || classe.logo_url,
                                    initials: classe.acronyme || (classe.nom ? classe.nom[0] : '?'),
                                    className: ((classe as any).photo_base64 || classe.logo_url) ? "bg-[#D9B981]" : "bg-background"
                                }}
                            />
                        );
                    })
                )}
            </div>

            {/* PIED DE PAGE : Bouton d'action pour créer une nouvelle classe */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onCreate}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Ajouter une nouvelle Classe
                </Button>
            </div>
        </div>
    );
};

export default ClassList;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre le module "Classes" dans l'application.
 * 2. `ClassList` s'affiche sur la gauche et liste toutes les classes de son école.
 * 3. L'enseignant tape "CM" dans la zone de recherche :
 *    - La liste ci-dessous se met à jour pour n'afficher que les "CM1", "CM2", etc.
 * 4. Il clique sur la ligne "CM1-Jaune" :
 *    - La ligne de la classe devient surlignée (grâce à `isSelected`).
 *    - Le système charge automatiquement les élèves de CM1 dans la partie centrale de l'écran.
 * 5. S'il survole une ligne avec sa souris :
 *    - Des options d'édition (Crayon) et de suppression (Corbeille) apparaissent.
 * 6. En cliquant sur "Ajouter une nouvelle Classe", il déclenche l'ouverture du formulaire de création.
 */
