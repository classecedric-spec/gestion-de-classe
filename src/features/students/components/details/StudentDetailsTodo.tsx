import React from 'react';
import { FileText, QrCode, Link } from 'lucide-react';
import { ActionItem } from '../../../../core';
import { getAppBaseUrl } from '../../../../utils/urlUtils';
import { copyToClipboard } from '../../../../utils/clipboardUtils';
import { toast } from 'sonner';

interface StudentDetailsTodoProps {
    student: any;
    onShowQR: (tab: 'encodage' | 'planification' | 'both') => void;
    onGenerateTodoPDF: () => void;
}

export const StudentDetailsTodo: React.FC<StudentDetailsTodoProps> = ({ student, onShowQR, onGenerateTodoPDF }) => {
    const baseUrl = getAppBaseUrl();
    const token = student?.access_token || '';
    const encodageUrl = `${baseUrl}/kiosk/${student?.id}?token=${token}`;
    const planificationUrl = `${baseUrl}/kiosk/planning/${student?.id}?token=${token}`;

    const handleCopy = async (url: string, type: string) => {
        const success = await copyToClipboard(url);
        if (success) {
            toast.success(`Lien ${type} copié !`);
        } else {
            toast.error("Échec de la copie");
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Buttons Section */}
            <div className="p-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium mb-6">
                    Impression & Exportation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Encodage"
                        subtitle="Accès direct au Kiosque"
                        onClick={() => onShowQR('encodage')}
                    />
                    <ActionItem
                        icon={Link}
                        label="Copier Lien Encodage"
                        subtitle="Lien direct vers le kiosque"
                        onClick={() => handleCopy(encodageUrl, 'encodage')}
                    />
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Planification"
                        subtitle="Fiche pour le planning"
                        onClick={() => onShowQR('planification')}
                    />
                    <ActionItem
                        icon={Link}
                        label="Copier Lien Planning"
                        subtitle="Lien direct vers le planning"
                        onClick={() => handleCopy(planificationUrl, 'planification')}
                    />
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Les deux"
                        subtitle="Format mixte (recommandé)"
                        onClick={() => onShowQR('both')}
                    />
                    <ActionItem
                        icon={FileText}
                        label="Exporter To-do List"
                        subtitle="Version textuelle des activités"
                        onClick={onGenerateTodoPDF}
                    />
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/5">
                    <p className="text-xs text-grey-medium italic text-center opacity-40">
                        Les documents PDF sont générés instantanément et s'ouvrent dans un nouvel onglet.
                    </p>
                </div>
            </div>
        </div>
    );
};
