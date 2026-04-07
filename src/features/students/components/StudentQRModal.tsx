/**
 * Nom du module/fichier : StudentQRModal.tsx
 * 
 * Données en entrée : Les informations de l'élève et le mode d'affichage souhaité (Encodage, Planification ou les deux).
 * 
 * Données en sortie : Une fenêtre affichant un ou plusieurs QR Codes, avec des options pour copier le lien ou imprimer un PDF.
 * 
 * Objectif principal : Fournir aux élèves un "accès magique" à leur espace de travail personnel (Kiosque). En scannant ce code avec une tablette, l'élève arrive directement sur son suivi ou son planning sans avoir à taper d'identifiant. C'est l'outil clé pour l'autonomie des élèves en classe.
 * 
 * Ce que ça affiche : Une fenêtre sombre (overlay) contenant un QR Code noir sur fond blanc, très lisible, et des boutons d'action colorés.
 */

import React, { useState } from 'react';
import QRCode from "react-qr-code";
import { X, Printer, Copy, Keyboard, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { pdf } from '@react-pdf/renderer';
import { getAppBaseUrl } from '../../../utils/urlUtils';
import { copyToClipboard } from '../../../utils/clipboardUtils';
import GroupQRPDF, { StudentWithQR } from '../../groups/components/GroupQRPDF';
import QRCodeGenerator from 'qrcode';

interface StudentQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        id: string;
        prenom: string;
        nom: string;
        access_token?: string;
    } | null;
    initialTab?: QRTab;
}

type QRTab = 'encodage' | 'planification' | 'both';

const StudentQRModal: React.FC<StudentQRModalProps> = ({ isOpen, onClose, student, initialTab = 'encodage' }) => {
    const [activeTab, setActiveTab] = useState<QRTab>(initialTab);
    const [isGenerating, setIsGenerating] = useState(false);

    // Sync activeTab when initialTab changes
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen || !student) return null;

    // Dynamic base URL with network IP fallback
    // Calcule l'adresse internet de l'école pour que le QR Code fonctionne aussi bien sur ordinateur que sur tablette.
    const baseUrl = getAppBaseUrl();
    const token = (student as any).access_token || '';
    // Lien secret : il contient un 'jeton' (token) qui permet à l'élève de se connecter automatiquement.
    const encodageUrl = `${baseUrl}/kiosk/${student.id}?token=${token}`;
    const planificationUrl = `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;
    const currentUrl = activeTab === 'encodage' ? encodageUrl : planificationUrl;

    // L'imprimeur : il transforme le QR Code en un document PDF propre, prêt à être découpé et collé sur le cahier ou le casier de l'élève.
    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            const generateQR = async (url: string) => {
                return await QRCodeGenerator.toDataURL(url, {
                    width: 300,
                    margin: 1,
                    color: { dark: '#000000', light: '#ffffff' },
                });
            };

            const qrData = {
                encodage: await generateQR(encodageUrl),
                planification: await generateQR(planificationUrl)
            };

            const studentWithQR: StudentWithQR = {
                id: student.id,
                prenom: student.prenom,
                nom: student.nom,
                qrData: qrData,
            };

            const doc = (
                <GroupQRPDF
                    groupName="Individuel"
                    studentsWithQR={[studentWithQR]}
                    mode={activeTab === 'both' ? 'both' : activeTab}
                />
            );

            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error("Échec de la génération du PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = async () => {
        const success = await copyToClipboard(currentUrl);
        if (success) {
            toast.success("Lien copié dans le presse-papier");
        } else {
            toast.error("Échec de la copie du lien");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Magic QR Code
                    </h3>
                    <button onClick={onClose} aria-label="Fermer" className="p-1 hover:bg-white/10 rounded-lg text-grey-medium hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                {/* Sélecteur de mode : permet de choisir si le QR Code doit mener vers la validation des activités (Encodage) ou vers l'emploi du temps (Planification). */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('encodage')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'encodage'
                                ? 'bg-primary/20 text-primary border-b-2 border-primary'
                                : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Keyboard size={16} />
                        Encodage
                    </button>
                    <button
                        onClick={() => setActiveTab('planification')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'planification'
                                ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <CalendarDays size={16} />
                        Planification
                    </button>
                    <button
                        onClick={() => setActiveTab('both')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'both'
                                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400'
                                : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Printer size={16} />
                        Mixte
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-6 bg-white">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-black mb-1">{student.prenom} {student.nom}</h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'encodage' ? 'Accès direct au Kiosque Encodage' :
                             activeTab === 'planification' ? 'Accès direct au Kiosque Planification' :
                             'Accès mixte Encodage + Planification'}
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        {activeTab === 'both' ? (
                            <div className="flex gap-6 items-center">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Encodage</span>
                                    <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-primary/20">
                                        <QRCode
                                            value={encodageUrl}
                                            size={120}
                                            className="h-auto w-full max-w-[120px]"
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Planification</span>
                                    <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-emerald-500/20">
                                        <QRCode
                                            value={planificationUrl}
                                            size={120}
                                            className="h-auto w-full max-w-[120px]"
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-200">
                                <QRCode
                                    id="student-qrcode-svg"
                                    value={currentUrl}
                                    size={180}
                                    className="h-auto w-full max-w-[180px]"
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        )}
                    </div>

                    <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                        <p className="text-[10px] text-gray-400 font-mono break-all line-clamp-2">
                            {activeTab === 'both' ? 'Format optimisé pour impression mixte' : currentUrl}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-surface">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl font-bold text-white hover:bg-white/5 transition-colors"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Copy size={18} />
                        Copier Lien
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={isGenerating}
                        className="px-6 py-2 rounded-xl font-bold bg-primary text-black hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                            <Printer size={18} />
                        )}
                        Exporter en PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentQRModal;

/**
 * 1. L'enseignant veut donner un accès tablette à un élève.
 * 2. Il ouvre la `StudentQRModal`.
 * 3. Il choisit le type d'accès (ex: "Encodage").
 * 4. Le composant génère instantanément le QR Code correspondant.
 * 5. Si l'enseignant veut le lien : il clique sur "Copier Lien".
 * 6. Si l'enseignant veut une version papier :
 *    a. Il clique sur "Exporter en PDF".
 *    b. Le système crée un document avec le nom de l'élève et son QR Code.
 *    c. Le PDF s'ouvre dans un nouvel onglet pour impression.
 */
