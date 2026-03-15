import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { X, Printer, QrCode, Keyboard, CalendarDays } from 'lucide-react';
import { getAppBaseUrl } from '../../../utils/urlUtils';
import { pdf } from '@react-pdf/renderer';
import GroupQRPDF, { StudentWithQR, QRData } from './GroupQRPDF';
import QRCodeGenerator from 'qrcode';
import clsx from 'clsx';

interface GroupQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    students: any[];
    initialTab?: QRTab;
}

type QRTab = 'encodage' | 'planification' | 'both';

const GroupQRModal: React.FC<GroupQRModalProps> = ({ isOpen, onClose, groupName, students, initialTab = 'encodage' }) => {
    const [activeTab, setActiveTab] = useState<QRTab>(initialTab);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const baseUrl = getAppBaseUrl();

    const getStudentUrl = (student: any) => {
        const token = student.access_token || '';
        if (activeTab === 'encodage') {
            return `${baseUrl}/kiosk/${student.id}?token=${token}`;
        }
        return `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;
    };

    const handlePrint = async () => {
        try {
            // Generate all QR data URLs first before rendering PDF
            const promises = students.map(async (student) => {
                const token = student.access_token || '';
                const encodageUrl = `${baseUrl}/kiosk/${student.id}?token=${token}`;
                const planificationUrl = `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;

                const generateQR = async (url: string) => {
                    return await QRCodeGenerator.toDataURL(url, {
                        width: 300,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                };

                const qrData: QRData = {
                    encodage: '',
                    planification: ''
                };

                if (activeTab === 'encodage' || activeTab === 'both') {
                    qrData.encodage = await generateQR(encodageUrl);
                }
                if (activeTab === 'planification' || activeTab === 'both') {
                    qrData.planification = await generateQR(planificationUrl);
                }

                return {
                    id: student.id,
                    prenom: student.prenom,
                    nom: student.nom,
                    qrData,
                } as StudentWithQR;
            });

            const studentsWithQR = await Promise.all(promises);

            const blob = await pdf(
                <GroupQRPDF
                    groupName={groupName}
                    studentsWithQR={studentsWithQR}
                    mode={activeTab}
                />
            ).toBlob();
            
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error generating PDF:', error);
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
                    <button
                        onClick={() => setActiveTab('both')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'both'
                                ? 'bg-orange-500/10 text-orange-400 border-b-2 border-orange-400'
                                : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <QrCode size={16} />
                        Les deux
                    </button>
                </div>

                {/* Content (Scrollable Grid Preview) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {students.map(student => {
                            return (
                                <div key={student.id} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3">
                                    <h4 className="font-bold text-black text-center truncate w-full">{student.prenom} {student.nom}</h4>
                                    <div className="bg-white p-2 flex flex-col items-center gap-2">
                                        {activeTab === 'both' ? (
                                            <div className="flex gap-6 items-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Encodage</span>
                                                    <div className="border-2 border-primary/20 p-2 rounded-lg bg-white shadow-sm">
                                                        <QRCode
                                                            value={`${baseUrl}/kiosk/${student.id}?token=${student.access_token || ''}`}
                                                            size={85}
                                                            className="h-auto w-full max-w-[85px]"
                                                            viewBox={`0 0 256 256`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Planification</span>
                                                    <div className="border-2 border-emerald-500/20 p-2 rounded-lg bg-white shadow-sm">
                                                        <QRCode
                                                            value={`${baseUrl}/kiosk/planning/${student.id}?token=${student.access_token || ''}`}
                                                            size={85}
                                                            className="h-auto w-full max-w-[85px]"
                                                            viewBox={`0 0 256 256`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-primary/20 p-3 rounded-xl bg-white shadow-sm">
                                                <QRCode
                                                    id={`qr-${student.id}`}
                                                    value={getStudentUrl(student)}
                                                    size={130}
                                                    className="h-auto w-full max-w-[130px]"
                                                    viewBox={`0 0 256 256`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium text-center">
                                        {activeTab === 'encodage' ? 'Kiosque Encodage' : 
                                         activeTab === 'planification' ? 'Kiosque Planification' : 
                                         'Kiosques Mixtes'}
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
                        Exporter en PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupQRModal;
