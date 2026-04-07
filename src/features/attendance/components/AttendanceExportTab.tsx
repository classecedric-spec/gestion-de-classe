/**
 * Nom du module/fichier : AttendanceExportTab.tsx
 * 
 * Données en entrée : 
 *   - mode d'export (jour, semaine, mois).
 *   - Groupe sélectionné.
 *   - Dates et présences récupérées depuis la base de données.
 *   - Liste des élèves et des statuts de présence.
 * 
 * Données en sortie : 
 *   - Une interface de prévisualisation PDF.
 *   - Un lien de téléchargement pour le fichier PDF généré.
 * 
 * Objectif principal : Permettre à l'enseignant de générer des rapports officiels de présence (PDF). L'interface offre une grande flexibilité : on peut sortir le rapport d'un seul jour, d'une semaine complète ou d'un mois entier pour les archives administratives de l'école.
 */

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
    exportData: any[]; // Type Attendance étendu
    activeCategories: CategoriePresence[];
    studentsForExport: Student[];
}

/**
 * Composant d'onglet dédié à la génération et à l'exportation des PDF de présences.
 */
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

    /** 
     * Utilitaire pour naviguer de jour en jour (Précédent / Suivant).
     * Manipule les dates de manière sécurisée pour éviter les erreurs de fuseau horaire.
     */
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
            
            {/* --- COLONNE GAUCHE : PANNEAU DE CONTRÔLE --- */}
            <div className="w-1/3 flex flex-col gap-4 p-4 bg-surface border border-white/10 rounded-xl h-full">
                <div className="text-center space-y-2 mb-2">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-text-main">Export PDF</h3>
                </div>

                {/* Sélecteur de mode : JOUR, SEMAINE ou MOIS */}
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

                    {/* Options spécifiques pour l'export journalier */}
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

                    {/* Options spécifiques pour l'export hebdomadaire ou mensuel */}
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

                {/* BOUTON FINAL DE TÉLÉCHARGEMENT : n'apparaît que si des données sont prêtes */}
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

            {/* --- COLONNE DROITE : APERÇU EN DIRECT DU PDF --- */}
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant se rend sur l'onglet "Export".
 * 2. Il choisit l'étendue du rapport (ex: "Mois").
 * 3. Il sélectionne le mois spécifique (ex: "Mars 2024").
 * 4. L'application prépare les données et génère un aperçu visuel dans la partie droite.
 * 5. Si l'aperçu convient :
 *    - L'enseignant clique sur "Télécharger".
 *    - Le système compile le document PDF final incluant le tableau des absences et les statistiques.
 *    - Le fichier est enregistré sur l'ordinateur de l'enseignant.
 */
