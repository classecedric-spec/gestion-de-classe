import React from 'react';
import QRCode from "react-qr-code";
import { X, Printer, QrCode } from 'lucide-react';

interface GroupQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    students: any[];
}

const GroupQRModal: React.FC<GroupQRModalProps> = ({ isOpen, onClose, groupName, students }) => {
    if (!isOpen) return null;

    const baseUrl = window.location.origin;

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=1000,height=800');
        if (printWindow) {

            const cards = students.map(student => {
                const svg = document.getElementById(`qr-${student.id}`);
                const svgHtml = svg ? svg.outerHTML : '<div>QR Error</div>';
                return `
                    <div class="cut-cell">
                        <div class="card">
                            <h1>${student.prenom} ${student.nom}</h1>
                            <div class="qr-container">${svgHtml}</div>
                            <p class="footer-text">Connexion à Gestion de Classe</p>
                        </div>
                    </div>
                `;
            }).join('');

            printWindow.document.write(`
                <html>
                    <head>
                        <title>QR Codes - ${groupName}</title>
                        <style>
                            body { 
                                font-family: system-ui, -apple-system, sans-serif; 
                                padding: 20px;
                                margin: 0; 
                            }
                            .grid {
                                display: flex;
                                flex-wrap: wrap;
                                justify-content: flex-start;
                                width: 100%;
                            }
                            .cut-cell {
                                width: 33.33%;
                                box-sizing: border-box;
                                border: 1px dashed #ccc; /* Cutting line */
                                padding: 20px;
                                display: flex;
                                justify-content: center;
                                page-break-inside: avoid;
                            }
                            .card {
                                border: 2px solid #000;
                                border-radius: 20px;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                width: 100%;
                                max-width: 220px;
                                overflow: hidden;
                            }
                            .card h1 { 
                                margin: 0 0 15px 0; 
                                font-size: 20px; 
                                text-align: center;
                                background-color: #254154; /* Site Blue-Grey */
                                color: white;
                                width: 100%;
                                padding: 15px 0;
                                font-weight: 800;
                            }
                            .qr-container { 
                                width: 100%; 
                                display: flex; 
                                justify-content: center; 
                                padding-bottom: 20px;
                            }
                            .qr-container svg { width: 150px; height: 150px; }
                            .footer-text {
                                margin: 0 0 15px 0;
                                font-size: 12px;
                                color: #666;
                                font-weight: 500;
                            }
                            @media print {
                                body { 
                                    padding: 0; 
                                    -webkit-print-color-adjust: exact;
                                    print-color-adjust: exact;
                                }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="grid">
                            ${cards}
                        </div>
                    </body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <QrCode size={20} className="text-primary" />
                        Codes QR : {groupName}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-grey-medium hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content (Scrollable Grid Preview) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {students.map(student => {
                            const kioskUrl = `${baseUrl}/kiosk/${student.id}?token=${student.access_token || ''}`;
                            return (
                                <div key={student.id} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3">
                                    <h4 className="font-bold text-black text-center truncate w-full">{student.prenom} {student.nom}</h4>
                                    <div className="bg-white p-2">
                                        <QRCode
                                            id={`qr-${student.id}`}
                                            value={kioskUrl}
                                            size={120}
                                            className="h-auto w-full max-w-[120px]"
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium text-center">
                                        Connexion à Gestion de Classe
                                    </p>
                                </div>
                            );
                        })}
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
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-xl font-bold bg-primary text-black hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Printer size={18} />
                        Imprimer {students.length} codes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupQRModal;
