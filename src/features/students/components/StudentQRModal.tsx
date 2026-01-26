import React from 'react';
import QRCode from "react-qr-code";
import { X, Printer, Link, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getAppBaseUrl } from '../../../utils/urlUtils';

interface StudentQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        id: string;
        prenom: string;
        nom: string;
    } | null;
}

const StudentQRModal: React.FC<StudentQRModalProps> = ({ isOpen, onClose, student }) => {
    if (!isOpen || !student) return null;

    // Dynamic base URL with network IP fallback
    const baseUrl = getAppBaseUrl();
    const kioskUrl = `${baseUrl}/kiosk/${student.id}?token=${(student as any).access_token || ''}`;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
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
                            <p>Scannez pour accéder au Dashboard</p>
                        </div>
                    </body>
                </html>
            `);

            // We need to render the QR code into the print window or copy the SVG
            // Simplified approach: Copy the SVG from the main window logic? 
            // Better: just trigger window.print() on the current view styled with @media print?
            // Or simpler: Just tell the user to command+P and use CSS to hide everything else.

            // Implementing "Copy SVG" strategy for robust specific printing
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
                window.print(); // Fallback
            }
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(kioskUrl);
        toast.success("Lien copié dans le presse-papier");
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

                {/* Content */}
                <div className="p-8 flex flex-col items-center gap-6 bg-white">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-black mb-1">{student.prenom} {student.nom}</h2>
                        <p className="text-sm text-gray-500">Accès direct au Kiosk</p>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-200">
                        <QRCode
                            id="student-qrcode-svg"
                            value={kioskUrl}
                            size={200}
                            className="h-auto w-full max-w-[200px]"
                            viewBox={`0 0 256 256`}
                        />
                    </div>

                    <div className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                        <p className="text-xs text-gray-400 font-mono break-all line-clamp-2">
                            {kioskUrl}
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
