/**
 * Nom du module/fichier : StudentInfoCard.tsx
 * 
 * Données en entrée : Les informations de base de l'élève (nom, photo, classe, groupes) et les fonctions de gestion de photo.
 * 
 * Données en sortie : Un bandeau visuel (Carte) présentant l'identité de l'élève de manière claire et élégante.
 * 
 * Objectif principal : Servir de "carte d'identité" visuelle en haut du panneau de détails. Ce composant permet de voir immédiatement qui est l'élève, à quelle classe il appartient, et dans quels groupes il est inscrit. Il permet aussi de changer la photo de l'élève par un simple clic ou un glisser-déposer directement sur son visage.
 * 
 * Ce que ça affiche : Une grande photo circulaire (Avatar), le nom en gras, la classe, le niveau, et des badges colorés pour ses groupes.
 */

import React from 'react';
import clsx from 'clsx';
import { Badge, Avatar, CardInfo } from '../../../../core';

interface StudentInfoCardProps {
    student: any;
    isDraggingPhoto: boolean;
    updatingPhotoId: string | null;
    onPhotoDragOver: (e: React.DragEvent) => void;
    onPhotoDragLeave: (e: React.DragEvent) => void;
    onPhotoDrop: (e: React.DragEvent) => void;
    onPhotoChange: (file: File) => void;
}

export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
    student,
    isDraggingPhoto,
    updatingPhotoId,
    onPhotoDragOver,
    onPhotoDragLeave,
    onPhotoDrop,
    onPhotoChange
}) => {
    return (
        <CardInfo>
            <div className="flex gap-5 items-center">
                {/* Le visage de l'élève : très interactif, il s'anime quand on survole avec une image et affiche un indicateur de chargement pendant l'enregistrement. */}
                <Avatar
                    size="xl"
                    src={student.photo_url}
                    initials={`${student.prenom[0]}${student.nom[0]}`}
                    editable
                    onImageChange={onPhotoChange}
                    loading={updatingPhotoId === student.id}
                    onDragOver={onPhotoDragOver}
                    onDragLeave={onPhotoDragLeave}
                    onDrop={onPhotoDrop}
                    className={clsx(
                        isDraggingPhoto && "border-primary bg-primary/20 scale-105"
                    )}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        {/* Titre principal : affiche le prénom et le nom en grand pour une identification sans erreur. */}
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {student.prenom} {student.nom}
                        </h2>
                    </div>
                    <p className="text-cq-base text-grey-medium mt-0.5">
                        {student.Classe?.nom || 'Sans classe'} • {student.Niveau?.nom || 'Niveau non défini'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {/* Affichage des groupes : chaque groupe est représenté par un petit badge jaune (couleur primaire) avec un trophée, pour valoriser l'appartenance de l'élève à ses collectifs. */}
                        {student.EleveGroupe && student.EleveGroupe.length > 0 ? (
                            student.EleveGroupe.map((eg: any) => eg.Groupe && (
                                <Badge key={eg.Groupe.id} variant="primary" size="xs" icon={<span>🏆</span>}>
                                    {eg.Groupe.nom}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-xs text-grey-medium italic">Aucun groupe</span>
                        )}
                    </div>
                </div>
            </div>
        </CardInfo>
    );
};

/**
 * 1. Le professeur sélectionne un élève.
 * 2. La `StudentInfoCard` apparaît en haut à droite.
 * 3. Elle affiche la photo de l'élève (ou ses initiales s'il n'en a pas).
 * 4. L'enseignant voit tout de suite : "C'est Jules, il est en Grande Section dans la Classe de Mme Dupont".
 * 5. Si l'enseignant veut changer la photo :
 *    a. Il survole l'avatar avec un fichier.
 *    b. L'avatar grossit et change de couleur (effet visuel).
 *    c. Une fois déposée, la nouvelle photo remplace l'ancienne instantanément.
 */
