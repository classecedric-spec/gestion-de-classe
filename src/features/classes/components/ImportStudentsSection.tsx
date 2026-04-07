/**
 * Nom du module/fichier : ImportStudentsSection.tsx
 * 
 * Données en entrée : 
 *   - levels : Liste des niveaux scolaires existants (ex: PS, MS, GS) pour permettre de valider les données du fichier Excel.
 *   - onImportData : Fonction de rappel qui renvoie au composant parent la liste des élèves extraits du fichier.
 *   - existingImports : Liste des élèves éventuellement déjà chargés lors d'une manipulation précédente.
 * 
 * Données en sortie : Un bloc de formulaire interactif permettant le téléchargement d'un modèle et le téléversement de données.
 * 
 * Objectif principal : Automatiser la création massive des élèves lors de l'ouverture d'une nouvelle classe. Au lieu de saisir 25 ou 30 enfants un par un, l'enseignant peut remplir un tableau Excel (dont le modèle est fourni par l'application) et le renvoyer. Ce composant se charge alors de "lire" le fichier, d'extraire proprement les identités, les dates de naissance et les coordonnées des parents, pour les préparer à l'enregistrement en base de données.
 * 
 * Ce que ça affiche : 
 *    - Un bouton pour télécharger le modèle Excel "propre" (avec listes de choix intégrées).
 *    - Une zone de téléchargement pour envoyer le fichier rempli.
 *    - Une liste de prévisualisation affichant les élèves détectés, permettant à l'enseignant de vérifier les données avant la validation finale.
 */

import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { downloadFile } from '../../../lib/helpers/download';
import { Tables } from '../../../types/supabase';

/**
 * Structure d'un élève importé via le fichier.
 */
export interface ImportedStudent {
    nom: string;
    prenom: string;
    date_naissance: string | null;
    niveau_id: string | null;
    parent1_nom: string;
    parent1_prenom: string;
    parent1_email: string;
    parent2_nom: string;
    parent2_prenom: string;
    parent2_email: string;
}

export interface ImportStudentsSectionProps {
    levels: Tables<'Niveau'>[];
    onImportData: (data: ImportedStudent[]) => void;
    existingImports?: ImportedStudent[];
}

/**
 * Composant gérant l'importation massive d'élèves via Excel.
 */
const ImportStudentsSection: React.FC<ImportStudentsSectionProps> = ({ levels, onImportData, existingImports = [] }) => {
    const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>(existingImports);

    /**
     * Synchronisation : met à jour l'état local et informe immédiatement 
     * le formulaire parent de la nouvelle liste d'élèves.
     */
    const updateParent = (newData: ImportedStudent[]) => {
        setImportedStudents(newData);
        onImportData(newData);
    };

    /**
     * Génération du modèle : crée un fichier Excel intelligent prêt à remplir.
     * Le modèle contient déjà une liste déroulante pour les niveaux scolaires 
     * afin d'éviter que l'enseignant ne commette des erreurs de saisie.
     */
    const handleDownloadTemplate = async () => {
        const headers = [
            "Nom", "Prénom", "Date de Naissance (JJ/MM/AAAA)", "Niveau",
            "Parent 1 Nom", "Parent 1 Prénom", "Parent 1 Email",
            "Parent 2 Nom", "Parent 2 Prénom", "Parent 2 Email"
        ];

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Modèle');
        const legendSheet = workbook.addWorksheet('Légende (Niveaux)');

        // Création de l'en-tête en gras
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };

        // Création du menu déroulant basé sur les niveaux de l'école
        const validLevels = ["Pas de niveau", ...levels.map(l => l.nom || '')];
        legendSheet.addRow(["Niveaux Valides"]);
        validLevels.forEach(level => legendSheet.addRow([level]));

        // Réglage de la largeur des colonnes pour le confort de saisie
        worksheet.columns = [
            { width: 15 }, { width: 15 }, { width: 25 }, { width: 15 },
            { width: 15 }, { width: 15 }, { width: 25 },
            { width: 15 }, { width: 15 }, { width: 25 }
        ];

        // Activation de la validation de données (pour la colonne Niveau)
        const levelRange = `'Légende (Niveaux)'!$A$2:$A$${validLevels.length + 1}`;
        for (let i = 2; i <= 100; i++) {
            worksheet.getCell(`D${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [levelRange],
                showErrorMessage: true,
                error: 'Veuillez sélectionner un niveau dans la liste déroulante.'
            };
        }

        // Téléchargement du fichier généré
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        await downloadFile(blob, "modele_import_eleves.xlsx", "Fichier Excel");
    };

    /**
     * Analyseur de fichier : lit le fichier Excel renvoyé par l'enseignant 
     * et transforme chaque ligne en une fiche élève exploitable par l'application.
     */
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
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

            // ÉTAPE 1 : Identification des colonnes au cas où l'enseignant les ait déplacées
            const headerRow = worksheet.getRow(1);
            const headers: { [key: number]: string } = {};
            headerRow.eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value ? cell.value.toString().trim() : '';
            });

            // ÉTAPE 2 : Extraction des données ligne par ligne
            const data: any[] = [];
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // On saute l'en-tête

                const rowData: any = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        let val = cell.value;
                        // Nettoyage des objets Excel complexes vers du texte simple
                        if (typeof val === 'object' && val !== null) {
                            if ('text' in val) val = (val as any).text;
                            else if ('result' in val) val = (val as any).result;
                        }
                        rowData[header] = val;
                    }
                });
                data.push(rowData);
            });

            // ÉTAPE 3 : Formatage et nettoyage final (Dates, IDs de niveaux)
            const formatted = data.map(row => {
                const getVal = (keys: string[]) => {
                    for (let k of keys) {
                        const val = row[k];
                        if (val !== undefined && val !== null) return val;
                        const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                        if (foundKey) return row[foundKey];
                    }
                    return '';
                };

                const nom = getVal(['Nom', 'nom']);
                const prenom = getVal(['Prénom', 'Prenom', 'prenom']);
                if (!nom && !prenom) return null; // Ligne vide

                // Gestion flexible de la date (soit date Excel, soit texte JJ/MM/AAAA)
                let dateNaissance = null;
                const rawDate = getVal(['Date de Naissance (JJ/MM/AAAA)', 'date_naissance']);
                if (rawDate) {
                    if (rawDate instanceof Date) {
                        dateNaissance = rawDate.toISOString().split('T')[0];
                    } else if (typeof rawDate === 'string') {
                        const parts = rawDate.split('/');
                        if (parts.length === 3) dateNaissance = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        else dateNaissance = rawDate;
                    }
                }

                // Recherche de l'identifiant technique du niveau à partir de son nom écrit
                const levelName = getVal(['Niveau', 'niveau']);
                let niveau_id = null;
                if (levelName) {
                    const found = levels.find(l => (l.nom || '').toLowerCase() === String(levelName).toLowerCase());
                    if (found) niveau_id = found.id;
                }

                return {
                    nom, prenom, date_naissance: dateNaissance, niveau_id,
                    parent1_nom: String(getVal(['Parent 1 Nom'])),
                    parent1_prenom: String(getVal(['Parent 1 Prénom'])),
                    parent1_email: String(getVal(['Parent 1 Email'])),
                    parent2_nom: String(getVal(['Parent 2 Nom'])),
                    parent2_prenom: String(getVal(['Parent 2 Prénom'])),
                    parent2_email: String(getVal(['Parent 2 Email'])),
                } as ImportedStudent;
            }).filter(Boolean) as ImportedStudent[];

            if (formatted.length === 0) alert("Aucun élève trouvé dans le fichier.");
            else updateParent(formatted);

        } catch (error: any) {
            console.error("Import error:", error);
            alert("Erreur lors de la lecture du fichier Excel: " + error.message);
        }
    };

    return (
        <div className="space-y-3 pt-4 border-t border-white/5">
            <label className="text-xs font-semibold text-grey-light uppercase flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-primary" />
                Importation Rapide d'Élèves (Excel / CSV)
            </label>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                <p className="text-[11px] text-grey-light">Conseil : Téléchargez d'abord le modèle, remplissez-le et chargez-le pour créer toute la classe d'un seul coup.</p>
            </div>

            <div className="flex gap-3">
                {/* Bouton pour récupérer le fichier modèle */}
                <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-xs text-grey-light rounded-lg border border-white/5 flex items-center justify-center gap-2 transition-colors"
                >
                    <Download size={14} />
                    Récupérer le Modèle
                </button>
                
                {/* Zone invisible d'envoi de fichier au dessus d'un bouton stylisé */}
                <div className="flex-1 relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Envoyer votre fichier rempli"
                    />
                    <button
                        type="button"
                        className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-xs text-primary rounded-lg border border-primary/20 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Upload size={14} />
                        Envoyer ma liste
                    </button>
                </div>
            </div>

            {/* PRÉVISUALISATION : Affiche la liste des noms extraits pour vérification avant validation */}
            {importedStudents.length > 0 && (
                <div className="bg-background/50 rounded-xl border border-white/5 p-3 max-h-40 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                        <span className="text-xs font-bold text-primary">{importedStudents.length} élèves détectés</span>
                        <button
                            type="button"
                            onClick={() => updateParent([])}
                            className="text-[10px] text-danger hover:underline"
                            title="Vider la liste actuelle"
                        >
                            Tout retirer
                        </button>
                    </div>
                    <div className="space-y-1">
                        {importedStudents.map((student, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-grey-light py-1 px-2 hover:bg-white/5 rounded">
                                <span className="truncate">{student.prenom} {student.nom}</span>
                                <button
                                    type="button"
                                    onClick={() => updateParent(importedStudents.filter((_, i) => i !== idx))}
                                    className="text-grey-dark hover:text-danger ml-2"
                                    title="Retirer cet élève de l'import"
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant veut créer une classe 'CP Bleue' et importer ses 25 élèves.
 * 2. Il clique sur "Récupérer le Modèle" : l'application lui donne un fichier Excel prêt à l'emploi.
 * 3. Il remplit les noms, les prénoms et les adresses emails des parents dans ce fichier sur son ordinateur.
 * 4. De retour dans l'application, il glisse son fichier sur le bouton "Envoyer ma liste".
 * 5. Le composant `ImportStudentsSection` scanne le fichier en quelques millisecondes :
 *    - Il transforme les lignes Excel en objets de données.
 *    - Il prévisualise les noms à l'écran : "Léa, Thomas, Sarah...".
 * 6. L'enseignant vérifie. S'il y a un doublon, il le retire d'un clic.
 * 7. Une fois validé dans le formulaire principal, le système crée automatiquement les 25 fiches élèves d'un coup.
 */
