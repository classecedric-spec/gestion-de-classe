import React from 'react';
import { FileText } from 'lucide-react';

interface StudentDetailsTodoProps {
    student: any;
}

export const StudentDetailsTodo: React.FC<StudentDetailsTodoProps> = ({ student }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-12 text-center text-grey-medium opacity-60">
            <FileText size={48} className="mb-4 text-primary opacity-40" />
            <p className="text-lg font-medium">Prêt pour l'impression</p>
            <p className="text-sm italic">Cliquez sur le bouton ci-dessous pour générer la liste des activités à faire pour {student.prenom}.</p>
        </div>
    );
};
