import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, BookOpen, FileSpreadsheet, Download, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddClassModal = ({ isOpen, onClose, onAdded, classToEdit }) => {
    const [name, setName] = useState('');
    const [acronym, setAcronym] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [photoBase64, setPhotoBase64] = useState('');
    const [selectedAdults, setSelectedAdults] = useState([]); // Array of { adulte_id, role }
    const [adults, setAdults] = useState([]);
    const [levels, setLevels] = useState([]);

    // Import state
    const [importedStudents, setImportedStudents] = useState([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAdults();
        fetchLevels();
    }, []);

    const fetchLevels = async () => {
        const { data } = await supabase.from('Niveau').select('id, nom').order('ordre');
        setLevels(data || []);
    };

    const fetchAdults = async () => {
        const { data } = await supabase.from('Adulte').select('id, nom, prenom').order('nom');
        setAdults(data || []);
    };

    useEffect(() => {
        if (isOpen) {
            if (classToEdit) {
                setName(classToEdit.nom);
                setAcronym(classToEdit.acronyme || '');
                setLogoUrl(classToEdit.logo_url || '');
                setPhotoBase64(classToEdit.photo_base64 || '');
                fetchClassAdults(classToEdit.id);
            } else {
                setName('');
                setAcronym('');
                setLogoUrl('');
                setPhotoBase64('');
                setSelectedAdults([]);
                setImportedStudents([]);
            }
        }
    }, [isOpen, classToEdit]);

    const fetchClassAdults = async (classId) => {
        const { data } = await supabase
            .from('ClasseAdulte')
            .select('adulte_id, role')
            .eq('classe_id', classId);
        setSelectedAdults(data || []);
    };

    const handleAddAdultRow = () => {
        setSelectedAdults(prev => [...prev, { adulte_id: '', role: 'principal' }]);
    };

    const handleRemoveAdultRow = (index) => {
        setSelectedAdults(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateAdult = (index, field, value) => {
        setSelectedAdults(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // --- IMPORT LOGIC ---
    const handleDownloadTemplate = async () => {
        const headers = [
            "Nom",
            "Prénom",
            "Date de Naissance (JJ/MM/AAAA)",
            "Niveau",
            "Parent 1 Nom",
            "Parent 1 Prénom",
            "Parent 1 Email",
            "Parent 2 Nom",
            "Parent 2 Prénom",
            "Parent 2 Email"
        ];

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Modèle');
        const legendSheet = workbook.addWorksheet('Légende (Niveaux)');

        // Add headers to main sheet
        worksheet.addRow(headers);
        worksheet.getRow(1).font = { bold: true };

        // Add levels to legend sheet
        const validLevels = ["Pas de niveau", ...levels.map(l => l.nom)];
        legendSheet.addRow(["Niveaux Valides"]);
        legendSheet.getRow(1).font = { bold: true };
        validLevels.forEach(level => legendSheet.addRow([level]));

        // Set column widths
        worksheet.columns = [
            { width: 15 }, { width: 15 }, { width: 20 }, { width: 15 },
            { width: 15 }, { width: 15 }, { width: 25 },
            { width: 15 }, { width: 15 }, { width: 25 }
        ];

        // Add Data Validation (Dropdown) for "Niveau" column (Column D)
        // Applying to rows 2 to 100
        const levelRange = `'Légende (Niveaux)'!$A$2:$A$${validLevels.length + 1}`;
        for (let i = 2; i <= 100; i++) {
            worksheet.getCell(`D${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [levelRange],
                showErrorMessage: true,
                errorStyle: 'stop',
                errorTitle: 'Niveau Invalide',
                error: 'Veuillez sélectionner un niveau dans la liste.'
            };
        }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const filename = "modele_classe_complet.xlsx";

        // Try File System Access API (Save As dialog)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Excel File',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                // Ignore aborts
                if (err.name === 'AbortError') return;
                console.warn('File picker failed, fallback to saveAs', err);
            }
        }

        // Fallback
        saveAs(blob, filename);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map and clean data
                const formatted = data.map(row => {
                    // Helper to get value case-insensitively
                    const getVal = (keys) => {
                        for (let k of keys) {
                            if (row[k] !== undefined) return row[k];
                        }
                        return '';
                    };

                    const nom = getVal(['Nom', 'nom', 'NOM']);
                    const prenom = getVal(['Prénom', 'Prenom', 'prenom', 'PRENOM']);

                    if (!nom && !prenom) return null;

                    // Date parsing
                    let dateNaissance = null;
                    const rawDate = getVal(['Date de Naissance (JJ/MM/AAAA)', 'Date de Naissance', 'DateNaissance', 'date_naissance']);
                    if (rawDate) {
                        if (rawDate instanceof Date) {
                            dateNaissance = rawDate.toISOString().split('T')[0];
                        } else {
                            // Try parsing string DD/MM/YYYY
                            const parts = rawDate.toString().split('/');
                            if (parts.length === 3) {
                                // Assume DD/MM/YYYY
                                dateNaissance = `${parts[2]}-${parts[1]}-${parts[0]}`;
                            } else {
                                // Fallback or leave null if un-parsable
                                dateNaissance = rawDate;
                            }
                        }
                    }

                    // Level Mapping
                    const levelName = getVal(['Niveau', 'niveau']);
                    let niveau_id = null;
                    if (levelName && levelName.toLowerCase() !== 'pas de niveau') {
                        const found = levels.find(l => l.nom.toLowerCase() === levelName.toLowerCase());
                        if (found) niveau_id = found.id;
                    }

                    return {
                        nom,
                        prenom,
                        date_naissance: dateNaissance,
                        niveau_id,
                        parent1_nom: getVal(['Parent 1 Nom', 'P1 Nom']),
                        parent1_prenom: getVal(['Parent 1 Prénom', 'P1 Prénom']),
                        parent1_email: getVal(['Parent 1 Email', 'P1 Email']),
                        parent2_nom: getVal(['Parent 2 Nom', 'P2 Nom']),
                        parent2_prenom: getVal(['Parent 2 Prénom', 'P2 Prénom']),
                        parent2_email: getVal(['Parent 2 Email', 'P2 Email']),
                    };
                }).filter(Boolean);

                if (formatted.length === 0) {
                    alert("Aucun élève trouvé ou format incorrect. Vérifiez les colonnes 'Nom' et 'Prénom'.");
                } else {
                    setImportedStudents(formatted);
                }
            } catch (error) {
                console.error("Erreur lecture Excel:", error);
                alert("Erreur lors de la lecture du fichier.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleRemoveImportedStudent = (index) => {
        setImportedStudents(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté pour créer une classe.");

            let classId = classToEdit?.id;

            if (classToEdit) {
                const { error } = await supabase
                    .from('Classe')
                    .update({
                        nom: name,
                        acronyme: acronym,
                        logo_url: logoUrl,
                        photo_base64: photoBase64,
                        // titulaire_id is deprecated but keeping for legacy compatibility if column exists
                        // titulaire_id: selectedAdults.find(a => a.role === 'principal')?.adulte_id || null
                    })
                    .eq('id', classId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('Classe').insert([{
                    nom: name,
                    acronyme: acronym,
                    logo_url: logoUrl,
                    photo_base64: photoBase64,
                    user_id: user.id
                }]).select().single();

                if (error) throw error;
                classId = data.id;
            }

            // Sync ClasseAdulte
            // Simplistic sync: delete all and re-insert (fine for small sets)
            await supabase.from('ClasseAdulte').delete().eq('classe_id', classId);

            const validAdults = selectedAdults.filter(a => a.adulte_id);
            if (validAdults.length > 0) {
                const toInsert = validAdults.map(a => ({
                    classe_id: classId,
                    adulte_id: a.adulte_id,
                    role: a.role,
                    user_id: user.id
                }));
                const { error: linkError } = await supabase.from('ClasseAdulte').insert(toInsert);
                if (linkError) throw linkError;
            }

            // Insert Imported Students
            if (importedStudents.length > 0) {
                const studentsToInsert = importedStudents.map(s => ({
                    classe_id: classId,
                    nom: s.nom,
                    prenom: s.prenom,
                    date_naissance: s.date_naissance,
                    niveau_id: s.niveau_id,
                    parent1_nom: s.parent1_nom,
                    parent1_prenom: s.parent1_prenom,
                    parent1_email: s.parent1_email,
                    parent2_nom: s.parent2_nom,
                    parent2_prenom: s.parent2_prenom,
                    parent2_email: s.parent2_email,
                    titulaire_id: user.id
                }));

                const { error: studentError } = await supabase.from('Eleve').insert(studentsToInsert);
                if (studentError) {
                    console.error("Error inserting students:", studentError);
                    alert("Classe créée, mais erreur lors de l'import des élèves: " + studentError.message);
                }
            }

            onAdded({ id: classId, nom: name });
            onClose();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={classToEdit ? "Modifier la Classe" : "Nouvelle Classe"}
            icon={classToEdit ? <Edit size={24} /> : <Plus size={24} />}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleCreateClass}
                        loading={loading}
                        className="flex-1"
                        icon={classToEdit ? null : Plus}
                    >
                        {classToEdit ? "Enregistrer" : "Créer la classe"}
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(e); }} className="space-y-4">
                <ImageUpload
                    value={photoBase64}
                    onChange={setPhotoBase64}
                    label="Photo de la classe"
                    placeholderIcon={BookOpen}
                />

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Nom de la classe</label>
                    <input
                        type="text"
                        placeholder="Ex: 5ème Scientifique"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Acronyme</label>
                    <input
                        type="text"
                        placeholder="Ex: 5SC"
                        value={acronym}
                        onChange={e => setAcronym(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-grey-light uppercase">Personnel Enseignant</label>
                        <button
                            type="button"
                            onClick={handleAddAdultRow}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider flex items-center gap-1"
                        >
                            <Plus size={12} /> Ajouter
                        </button>
                    </div>

                    <div className="space-y-2">
                        {selectedAdults.map((row, index) => (
                            <div key={index} className="flex gap-2 items-start animate-in slide-in-from-top-1">
                                <select
                                    value={row.adulte_id}
                                    onChange={e => handleUpdateAdult(index, 'adulte_id', e.target.value)}
                                    className="flex-1 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="">Sélectionner...</option>
                                    {adults.map(a => (
                                        <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                                    ))}
                                </select>
                                <select
                                    value={row.role}
                                    onChange={e => handleUpdateAdult(index, 'role', e.target.value)}
                                    className="w-32 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="principal">Principal</option>
                                    <option value="coenseignant">Co-Ens.</option>
                                    <option value="support">Support</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAdultRow(index)}
                                    className="p-2.5 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                                >
                                    <Plus size={18} className="rotate-45" />
                                </button>
                            </div>
                        ))}

                        {selectedAdults.length === 0 && (
                            <p className="text-center py-2 text-xs text-grey-dark italic">Aucun personnel assigné</p>
                        )}
                    </div>
                </div>

                {/* IMPORT SECTION */}
                {!classToEdit && (
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="text-xs font-semibold text-grey-light uppercase flex items-center gap-2">
                            <FileSpreadsheet size={16} className="text-primary" />
                            Importer des élèves (Excel)
                        </label>

                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2">
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                                <p className="text-[11px] text-grey-light leading-tight pt-0.5">Assurez-vous que vos <span className="text-white font-medium">niveaux</span> sont créés sur le site.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                                <p className="text-[11px] text-grey-light leading-tight pt-0.5">Téléchargez le <span className="text-white font-medium">modèle .xlsx</span> (vos niveaux y seront inclus).</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                                <p className="text-[11px] text-grey-light leading-tight pt-0.5">Complétez le fichier sur votre ordinateur.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                                <p className="text-[11px] text-grey-light leading-tight pt-0.5"><span className="text-white font-medium">Chargez</span> le fichier pour créer les élèves dans cette classe.</p>
                            </div>
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

                        {/* Preview List */}
                        {importedStudents.length > 0 && (
                            <div className="bg-background/50 rounded-xl border border-white/5 p-3 max-h-40 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-primary">{importedStudents.length} élèves détectés</span>
                                    <button
                                        type="button"
                                        onClick={() => setImportedStudents([])}
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
                                                onClick={() => handleRemoveImportedStudent(idx)}
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
                )}
            </form>
        </Modal>
    );
};

export default AddClassModal;
