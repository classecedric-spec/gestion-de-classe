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
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {student.prenom} {student.nom}
                        </h2>
                    </div>
                    <p className="text-cq-base text-grey-medium mt-0.5">
                        {student.Classe?.nom || 'Sans classe'} • {student.Niveau?.nom || 'Niveau non défini'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
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
