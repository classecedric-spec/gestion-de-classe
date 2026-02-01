import React from 'react';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Button, Select } from '../../../core';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import AttendancePDF from './AttendancePDF';
import clsx from 'clsx';
import { Group, Student, CategoriePresence } from '../services/attendanceService';

interface AttendanceExportTabProps {
    exportMode: 'day' | 'week' | 'month';
    setExportMode: (mode: 'day' | 'week' | 'month') => void;
    selectedGroup: Group | null;
    selectedDay: string;
    setSelectedDay: (date: string) => void;
    availablePeriods: { label: string; value: string }[];
    selectedPeriod: string;
    setSelectedPeriod: (val: string) => void;
    exportDates: string[];
    exportData: any[]; // Extended Attendance type
    activeCategories: CategoriePresence[];
    studentsForExport: Student[];
}

export const AttendanceExportTab: React.FC<AttendanceExportTabProps> = ({
    exportMode,
    setExportMode,
    selectedGroup,
    selectedDay,
    setSelectedDay,
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    exportDates,
    exportData,
    activeCategories,
    studentsForExport
}) => {

    // Day navigation helpers
    const changeDay = (delta: number) => {
        const [y, m, d] = selectedDay.split('-').map(Number);
        const curr = new Date(y, m - 1, d, 12, 0, 0);
        curr.setDate(curr.getDate() + delta);
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        setSelectedDay(`${year}-${month}-${day}`);
    };

    return (
        <div className="flex h-[600px] gap-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Left Control Panel */}
            <div className="w-1/3 flex flex-col gap-4 p-4 bg-surface border border-white/10 rounded-xl h-full">
                <div className="text-center space-y-2 mb-2">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-text-main">Export PDF</h3>
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-lg">
                    {(['day', 'week', 'month'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setExportMode(mode)}
                            className={clsx(
                                "py-1.5 rounded-md text-xs font-bold transition-all uppercase",
                                exportMode === mode ? "bg-primary text-text-dark" : "text-grey-medium hover:text-white"
                            )}
                        >
                            {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 flex-1">
                    <p className="text-grey-medium text-xs">
                        Rapport pour <strong>{selectedGroup?.nom || '...'}</strong>
                    </p>

                    {exportMode === 'day' && (
                        <div className="w-full space-y-3">
                            <Input
                                type="date"
                                label="Date"
                                value={selectedDay}
                                onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                                onChange={(e: any) => setSelectedDay(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => changeDay(-1)}
                                    className="flex-1"
                                    icon={ChevronLeft}
                                >
                                    Précédent
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => changeDay(1)}
                                    className="flex-1"
                                    iconRight={ChevronRight}
                                >
                                    Suivant
                                </Button>
                            </div>
                        </div>
                    )}

                    {exportMode !== 'day' && (
                        <Select
                            label="Période"
                            options={availablePeriods}
                            value={selectedPeriod}
                            onChange={e => setSelectedPeriod(e.target.value)}
                            fullWidth
                        />
                    )}
                </div>

                {exportDates.length > 0 ? (
                    <PDFDownloadLink
                        document={
                            <AttendancePDF
                                categories={activeCategories}
                                students={studentsForExport}
                                attendances={exportData}
                                groupName={selectedGroup?.nom || 'Groupe Inconnu'}
                                dates={exportDates}
                            />
                        }
                        fileName={`presence-${selectedGroup?.nom}-${exportMode}-${exportDates[0] || 'report'}.pdf`}
                        style={{ textDecoration: 'none' }}
                    >
                        {/*@ts-ignore*/}
                        {({ loading }) => (
                            <div className="w-full py-3 bg-primary text-text-dark rounded-xl font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2 mt-auto">
                                <Download size={18} />
                                {loading ? 'Chargement...' : 'Télécharger'}
                            </div>
                        )}
                    </PDFDownloadLink>
                ) : (
                    <button disabled className="w-full py-3 bg-white/5 text-grey-medium rounded-xl font-bold flex items-center justify-center gap-2 mt-auto cursor-not-allowed">
                        <FileText size={18} className="opacity-50" />
                        Sélectionnez une période
                    </button>
                )}
            </div>

            {/* Right Preview Panel */}
            <div className="flex-1 rounded-xl border border-white/10 overflow-hidden bg-white/5 h-full relative">
                {exportDates.length > 0 ? (
                    <PDFViewer width="100%" height="100%" className="w-full h-full border-none">
                        <AttendancePDF
                            categories={activeCategories}
                            students={studentsForExport}
                            attendances={exportData}
                            groupName={selectedGroup?.nom || 'Groupe Inconnu'}
                            dates={exportDates}
                        />
                    </PDFViewer>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-grey-medium gap-2">
                        <FileText size={48} className="opacity-20" />
                        <p>Sélectionnez une période pour voir l'aperçu</p>
                    </div>
                )}
            </div>
        </div>
    );
};
