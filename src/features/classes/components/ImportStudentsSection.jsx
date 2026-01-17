import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ImportStudentsSection = ({ levels, onImportData, existingImports = [] }) => {
    const [importedStudents, setImportedStudents] = useState(existingImports);

    // Sync with parent when local changes
    const updateParent = (newData) => {
        setImportedStudents(newData);
        onImportData(newData);
    };

    const handleDownloadTemplate = async () => {
        const headers = [
            "Nom", "Prénom", "Date de Naissance (JJ/MM/AAAA)", "Niveau",
            "Parent 1 Nom", "Parent 1 Prénom", "Parent 1 Email",
            "Parent 2 Nom", "Parent 2 Prénom", "Parent 2 Email"
        ];

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Modèle');
        const legendSheet = workbook.addWorksheet('Légende (Niveaux)');

        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };

        const validLevels = ["Pas de niveau", ...levels.map(l => l.nom)];
        legendSheet.addRow(["Niveaux Valides"]);
        validLevels.forEach(level => legendSheet.addRow([level]));

        worksheet.columns = [
            { width: 15 }, { width: 15 }, { width: 20 }, { width: 15 },
            { width: 15 }, { width: 15 }, { width: 25 },
            { width: 15 }, { width: 15 }, { width: 25 }
        ];

        // Data Validation
        const levelRange = `'Légende (Niveaux)'!$A$2:$A$${validLevels.length + 1}`;
        for (let i = 2; i <= 100; i++) {
            worksheet.getCell(`D${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [levelRange],
                showErrorMessage: true,
                error: 'Veuillez sélectionner un niveau dans la liste.'
            };
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, "modele_classe_complet.xlsx");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                alert("Le fichier semble vide ou invalide.");
                return;
            }

            // Map headers to column indices
            const headerRow = worksheet.getRow(1);
            const headers = {};
            headerRow.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
            });

            const data = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        // ExcelJS specific: value might be object (rich text, formula)
                        // Simple value check:
                        let val = cell.value;
                        if (typeof val === 'object' && val !== null) {
                            if (val.text) val = val.text;
                            else if (val.result) val = val.result;
                        }
                        rowData[header] = val;
                    }
                });
                data.push(rowData);
            });

            const formatted = data.map(row => {
                const getVal = (keys) => {
                    for (let k of keys) {
                        // Check case insensitive match for keys in row objects
                        // Since we mapped headers exactly as string, strict match is likely
                        // But let's be robust
                        const val = row[k];
                        if (val !== undefined && val !== null) return val;

                        // Try case insensitive search if not found directly
                        const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                        if (foundKey) return row[foundKey];
                    }
                    return '';
                };

                const nom = getVal(['Nom', 'nom', 'NOM']);
                const prenom = getVal(['Prénom', 'Prenom', 'prenom']);
                if (!nom && !prenom) return null;

                let dateNaissance = null;
                const rawDate = getVal(['Date de Naissance (JJ/MM/AAAA)', 'date_naissance']);
                if (rawDate) {
                    if (rawDate instanceof Date) {
                        dateNaissance = rawDate.toISOString().split('T')[0];
                    } else if (typeof rawDate === 'string') {
                        // Parse DD/MM/YYYY
                        const parts = rawDate.split('/');
                        if (parts.length === 3) dateNaissance = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        else dateNaissance = rawDate; // Try as is
                    }
                }

                const levelName = getVal(['Niveau', 'niveau']);
                let niveau_id = null;
                if (levelName) {
                    const found = levels.find(l => l.nom.toLowerCase() === String(levelName).toLowerCase());
                    if (found) niveau_id = found.id;
                }

                return {
                    nom, prenom, date_naissance: dateNaissance, niveau_id,
                    parent1_nom: getVal(['Parent 1 Nom']),
                    parent1_prenom: getVal(['Parent 1 Prénom']),
                    parent1_email: getVal(['Parent 1 Email']),
                    parent2_nom: getVal(['Parent 2 Nom']),
                    parent2_prenom: getVal(['Parent 2 Prénom']),
                    parent2_email: getVal(['Parent 2 Email']),
                };
            }).filter(Boolean);

            if (formatted.length === 0) alert("Aucun élève trouvé.");
            else updateParent(formatted);

        } catch (error) {
            console.error("Import error:", error);
            alert("Erreur lors de la lecture du fichier Excel: " + error.message);
        }
    };

    return (
        <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="text-xs font-semibold text-grey-light uppercase flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-primary" />
                Importer des élèves (Excel)
            </label>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                <p className="text-[11px] text-grey-light">Téléchargez le modèle, remplissez-le et chargez-le pour créer les élèves en lot.</p>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-xs text-grey-light rounded-lg border border-white/5 flex items-center justify-center gap-2 transition-colors"
                >
                    <Download size={14} />
                    Modèle .xlsx
                </button>
                <div className="flex-1 relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button
                        type="button"
                        className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-xs text-primary rounded-lg border border-primary/20 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Upload size={14} />
                        Charger Excel
                    </button>
                </div>
            </div>

            {importedStudents.length > 0 && (
                <div className="bg-background/50 rounded-xl border border-white/5 p-3 max-h-40 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                        <span className="text-xs font-bold text-primary">{importedStudents.length} élèves détectés</span>
                        <button
                            type="button"
                            onClick={() => updateParent([])}
                            className="text-[10px] text-danger hover:underline"
                        >
                            Tout retirer
                        </button>
                    </div>
                    <div className="space-y-1">
                        {importedStudents.map((student, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-grey-light py-1 px-2 hover:bg-white/5 rounded">
                                <span className="truncate">{student.nom} {student.prenom}</span>
                                <button
                                    type="button"
                                    onClick={() => updateParent(importedStudents.filter((_, i) => i !== idx))}
                                    className="text-grey-dark hover:text-danger ml-2"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportStudentsSection;
