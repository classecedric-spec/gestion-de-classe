import React, { useState } from 'react';
import QRCode from "react-qr-code";
import { X, Printer, Link, Copy, Keyboard, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { getAppBaseUrl } from '../../../utils/urlUtils';
import { copyToClipboard } from '../../../utils/clipboardUtils';

interface StudentQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        id: string;
        prenom: string;
        nom: string;
    } | null;
}

type QRTab = 'encodage' | 'planification';

const StudentQRModal: React.FC<StudentQRModalProps> = ({ isOpen, onClose, student }) => {
    const [activeTab, setActiveTab] = useState<QRTab>('encodage');

    if (!isOpen || !student) return null;

    // Dynamic base URL with network IP fallback
    const baseUrl = getAppBaseUrl();
    const token = (student as any).access_token || '';
    const encodageUrl = `${baseUrl}/kiosk/${student.id}?token=${token}`;
    const planificationUrl = `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;
    const currentUrl = activeTab === 'encodage' ? encodageUrl : planificationUrl;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
            const label = activeTab === 'encodage' ? 'Kiosque Encodage' : 'Kiosque Planification';
            printWindow.document.write(`
                <html>
                    <head>
                        <title>QR Code - ${student.prenom} ${student.nom}</title>
                        <style>
                            body { 
                                font-family: system-ui, -apple-system, sans-serif; 
                                display: flex; 
                                flex-direction: column; 
                                items-center; 
                                justify-content: center; 
                                height: 100vh; 
                                margin: 0; 
                                text-align: center;
                            }
                            .card {
                                border: 2px solid #000;
                                padding: 40px;
                                border-radius: 20px;
                                display: inline-flex;
                                flex-direction: column;
                                align-items: center;
                            }
                            h1 { margin: 0 0 20px 0; font-size: 32px; }
                            p { margin: 20px 0 0 0; font-size: 14px; color: #666; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>${student.prenom} ${student.nom}</h1>
                            <div id="qr-target"></div>
                            <p>Scannez pour accéder au ${label}</p>
                        </div>
                    </body>
                </html>
            `);

            const svg = document.getElementById('student-qrcode-svg');
            if (svg && printWindow.document.getElementById('qr-target')) {
                printWindow.document.getElementById('qr-target')!.innerHTML = svg.outerHTML;
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            } else {
                printWindow.close();
                window.print();
            }
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
                        <Link size={20} className="text-primary" />
                        Magic QR Code
                    </h3>
                    <button onClick={onClose} aria-label="Fermer" className="p-1 hover:bg-white/10 rounded-lg text-grey-medium hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('encodage')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'encodage'
                                ? 'bg-primary/10 text-primary border-b-2 border-primary'
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
                                ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <CalendarDays size={16} />
                        Planification
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-6 bg-white">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-black mb-1">{student.prenom} {student.nom}</h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'encodage' ? 'Accès direct au Kiosque Encodage' : 'Accès direct au Kiosque Planification'}
                        </p>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-200">
                        <QRCode
                            id="student-qrcode-svg"
                            value={currentUrl}
                            size={200}
                            className="h-auto w-full max-w-[200px]"
                            viewBox={`0 0 256 256`}
                        />
                    </div>

                    <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs text-gray-400 font-mono break-all line-clamp-2">
                            {currentUrl}
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
                        className="px-4 py-2 rounded-xl font-bold bg-primary text-black hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Printer size={18} />
                        Imprimer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentQRModal;
