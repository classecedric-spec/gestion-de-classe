import React from 'react';
import { ListItem } from '../../../core';
import { StudentWithRelations } from '../../../features/classes/services/classService';

interface GridViewProps {
    students: StudentWithRelations[];
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (e: React.MouseEvent, id: string) => void;
}

export const ClassGridView: React.FC<GridViewProps> = ({ students, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {students.map(student => (
                <ListItem
                    key={student.id}
                    id={student.id}
                    title={`${student.prenom} ${student.nom}`}
                    subtitle={student.EleveGroupe && student.EleveGroupe.length > 0 ? (student.EleveGroupe[0] as any).Groupe?.nom : 'Sans groupe'}
                    onClick={() => onEditStudent(student)}
                    onDelete={() => onRemoveStudent({ stopPropagation: () => { } } as any, student.id)}
                    onEdit={() => onEditStudent(student)}
                    deleteTitle="Retirer de la classe"
                    noTruncate={true}
                    className="pr-5"
                    avatar={{
                        src: student.photo_base64,
                        initials: (student.prenom || '?')[0] + (student.nom || '?')[0],
                        className: student.photo_base64 ? "bg-primary" : "bg-input"
                    }}
                />
            ))}
        </div>
    );
};
