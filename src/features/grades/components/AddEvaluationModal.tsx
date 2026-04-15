/**
 * Nom du module/fichier : AddEvaluationModal.tsx
 * 
 * Données en entrée : Les informations nécessaires pour créer une évaluation (branche, groupe, période) ainsi que le lien avec la base de données (authentification).
 * 
 * Données en sortie : Un formulaire rempli par l'enseignant qui, une fois validé, renvoie les données de la nouvelle évaluation (titre, date, note maximale, et éventuellement le détail question par question).
 * 
 * Objectif principal : Ce fichier gère l'apparition d'une fenêtre superposée (modale) permettant au professeur de programmer et configurer une nouvelle évaluation pour ses élèves.
 * 
 * Ce que ça affiche : Une boîte de dialogue flottante contenant des champs de texte, des menus déroulants (pour choisir la date, la branche, etc.) et une section optionnelle pour détailler les points par question.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Input, Button, Select } from '../../../core';
import { Trash2, Plus, Settings2, ListChecks, FileText, ClipboardList, ArrowRightLeft, GripVertical, Check, X, Info as InfoIcon, Calculator, Table as TableIcon, Search, Grid, CheckCircle2, ChevronRight, AlertCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNoteTypes } from '../hooks/useGrades';
import { useBranches } from '../../branches/hooks/useBranches';
import { useGroupsData } from '../../groups/hooks/useGroupsData';
import { usePeriods } from '../hooks/usePeriods';
import { useGroupStudents } from '../../groups/hooks/useGroupStudents';
import clsx from 'clsx';
import { toast } from 'sonner';

interface Palier {
    label: string;
    points: number;
    color: string;
}

// Définit les éléments extérieurs dont cette fenêtre a besoin pour s'ouvrir et fonctionner correctement de l'extérieur.
interface AddEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, questions: any[], regroupements?: any[], results?: any[], options?: { shouldClose?: boolean }) => void;
    brancheId?: string;
    groupId?: string;
    periode?: string;
    initialData?: any;
    initialQuestions?: any[];
    initialRegroupements?: any[];
    isLoading?: boolean;
}

// Composant principal de la fenêtre de création d'une évaluation.
const AddEvaluationModal: React.FC<AddEvaluationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    brancheId,
    groupId,
    periode,
    initialData,
    initialQuestions,
    initialRegroupements,
    isLoading = false
}) => {
    // Collecte les informations de connexion de l'utilisateur et les réglages de l'application (barèmes, branches, groupes, périodes).
    const { session } = useAuth();
    const { data: noteTypes = [] } = useNoteTypes(session?.user?.id);
    const { branches } = useBranches();
    const { periodOptions, loading: loadingPeriods } = usePeriods();
    const { groups } = useGroupsData();

    // Prépare des espaces de brouillon locaux pour stocker les sélections de l'utilisateur.
    const [localBrancheId, setLocalBrancheId] = useState<string>(brancheId || '');
    const [localGroupId, setLocalGroupId] = useState<string>(groupId || '');
    const [localPeriode, setLocalPeriode] = useState<string>(periode || '');

    // On utilise les valeurs locales comme source de vérité.
    // Les props servent d'initialisation ou d'override forcé (voir useEffect plus bas).
    const effectiveBrancheId = localBrancheId;
    const effectiveGroupId = localGroupId;
    const effectivePeriode = localPeriode;
    
    // Vérifie s'il manque des informations de contexte (auquel cas il faudra afficher des menus déroulants pour les demander).
    const needsContext = !brancheId || !groupId || !periode;

    // Prépare les boîtes pour enregistrer ce que l'enseignant va taper (le nom de l'examen, sa date, etc.).
    const [titre, setTitre] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [noteMax, setNoteMax] = useState(10);
    const [typeNoteId, setTypeNoteId] = useState<string>('');
    const [withQuestions, setWithQuestions] = useState(false);
    const [showRatio, setShowRatio] = useState(true);
    const [questions, setQuestions] = useState<any[]>([{ titre: '', note_max: 5, ratio: 1, ordre: 0, paliers: null }]);
    const [editingGridIndex, setEditingGridIndex] = useState<number | null>(null);
    const [scratchpad, setScratchpad] = useState('');
    const [associations, setAssociations] = useState<any[]>([
        { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
    ]);
    const [attemptedSubmit, setAttemptedSubmit] = useState(false);
    const [associerAussi, setAssocierAussi] = useState(false);
    
    console.log("🛠️ [AddEvaluationModal] Render - associerAussi:", associerAussi);
    
    // Excel Import States
    const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
    
    // Correctly fetch group object for the hook
    const currentGroup = useMemo(() => 
        groups.find(g => g.id === effectiveGroupId) || null
    , [groups, effectiveGroupId]);

    const { studentsInGroup: groupStudents, loadingStudents } = useGroupStudents(currentGroup, session?.user);
    const [excelText, setExcelText] = useState('');
    const [importStep, setImportStep] = useState<'paste' | 'mapping' | 'preview'>('paste');
    const [studentMapping, setStudentMapping] = useState<{[key: string]: string}>({}); // Excel Name -> Student ID
    const [parsedData, setParsedData] = useState<any[]>([]); // Raw rows
    const [importQuestions, setImportQuestions] = useState<any[]>([]); // Parsed headers
    const [importQueue, setImportQueue] = useState<any[]>([]);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

    // Fonction pour déterminer si un champ doit afficher une erreur visuelle.
    // Elle ne s'active que si l'utilisateur a déjà cliqué une fois sur "Envoyer" (attemptedSubmit).
    const isInvalid = useCallback((value: any) => {
        if (!attemptedSubmit) return false;
        
        // Pour du texte, on vérifie s'il est vide.
        if (typeof value === 'string') return value.trim() === '';
        
        // Pour des nombres (Note Max, etc.) on vérifie s'ils sont valides et positifs.
        if (typeof value === 'number') return isNaN(value) || value <= 0;
        
        // Pour tout le reste, une valeur "fausy" est considérée invalide.
        return !value;
    }, [attemptedSubmit]);

    // Utilise une référence pour savoir si on vient d'ouvrir la fenêtre ou si l'ID du contrôle a changé.
    // Cela évite d'effacer ce que le prof est en train de taper si le parent (Grades.tsx) se rafraîchit.
    const lastInitializedIdRef = React.useRef<string | null | undefined>(undefined);

    const normalizeName = (s: string) => {
        return s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") 
            .toLowerCase()
            .replace(/\s+/g, ' ') 
            .trim();
    };

    const findStudentMatch = useCallback((excelName: string, students: any[]) => {
        if (!students || students.length === 0) return null;
        
        const normExcel = normalizeName(excelName);
        if (!normExcel) return null;
        
        // 1. Exact Match (normalized)
        let match = students.find(s => {
            const combined1 = normalizeName(`${s.prenom} ${s.nom}`);
            const combined2 = normalizeName(`${s.nom} ${s.prenom}`);
            return normExcel === combined1 || normExcel === combined2;
        });

        if (match) return match;

        // 2. Component Match (Order Independent)
        // Split the excel name into words and see if they all exist in the student's name
        const excelWords = normExcel.split(' ').filter(w => w.length > 1);
        match = students.find(s => {
            const fullName = normalizeName(`${s.prenom} ${s.nom}`);
            return excelWords.length > 0 && excelWords.every(word => fullName.includes(word));
        });

        if (match) return match;

        // 3. Reversed Component Match (DB words in Excel)
        match = students.find(s => {
            const sNameWord = normalizeName(s.nom);
            const sPrenomWord = normalizeName(s.prenom);
            return (sNameWord.length > 1 && normExcel.includes(sNameWord)) && 
                   (sPrenomWord.length > 1 && normExcel.includes(sPrenomWord));
        });

        if (match) return match;
        
        // 4. Simple contains (last resort)
        match = students.find(s => {
            const fullName = normalizeName(`${s.prenom} ${s.nom}`);
            return fullName.includes(normExcel) || normExcel.includes(fullName);
        });

        return match;
    }, []);

    // Reactive Student Matching
    useEffect(() => {
        if (activeTab === 'import' && groupStudents && groupStudents.length > 0 && parsedData.length > 0) {
            setStudentMapping(prev => {
                const next = { ...prev };
                let madeChanges = false;
                
                parsedData.forEach(row => {
                    if (!next[row.name]) {
                        const match = findStudentMatch(row.name, groupStudents);
                        if (match) {
                            next[row.name] = match.id;
                            madeChanges = true;
                        }
                    }
                });
                
                return madeChanges ? next : prev;
            });
        }
    }, [activeTab, groupStudents, parsedData, findStudentMatch]);

    useEffect(() => {
        if (isOpen) {
            const currentId = initialData?.id || null; // null pour les nouvelles créations
            
            // On ne réinitialise que si on ouvre la fenêtre OU si on passe d'un contrôle à un autre (ID différent)
            if (lastInitializedIdRef.current !== currentId) {
                setTitre(initialData?.titre || '');
                setDate(initialData?.date || new Date().toISOString().split('T')[0]);
                setNoteMax(initialData?.note_max || 10);
                setTypeNoteId(initialData?.type_note_id || '');
                
                if (initialQuestions && initialQuestions.length > 0) {
                    setWithQuestions(true);
                    const sortedQ = [...initialQuestions].sort((a, b) => a.ordre - b.ordre);
                    setQuestions(sortedQ);
                } else {
                    setWithQuestions(false);
                    setQuestions([{ titre: '', note_max: 5, ratio: 1, ordre: 0 }]);
                }

                if (initialRegroupements && initialRegroupements.length > 0) {
                    setAssocierAussi(true);
                    const mappedAssocs = initialRegroupements.map(r => ({
                        id: r.id,
                        label: r.titre,
                        slots: Array.isArray(r.elements) ? r.elements : [null, null, null, null],
                        isSuggested: false
                    }));
                    setAssociations(mappedAssocs);
                } else if (!initialData) {
                    setAssocierAussi(false);
                    setAssociations([
                        { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
                    ]);
                } else {
                    setAssocierAussi(false);
                    setAssociations([
                        { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
                    ]);
                }

                if (initialData) {
                    if (initialData.branche_id) setLocalBrancheId(initialData.branche_id);
                    if (initialData.group_id) setLocalGroupId(initialData.group_id);
                    if (initialData.periode) setLocalPeriode(initialData.periode);
                } else {
                    setLocalBrancheId(brancheId || '');
                    setLocalGroupId(groupId || '');
                    setLocalPeriode(periode || '');
                }

                setScratchpad('');
                setAttemptedSubmit(false);
                
                // Reset Excel Import state
                setExcelText('');
                setImportStep('paste');
                setStudentMapping({});
                setParsedData([]);
                setImportQuestions([]);
                setImportQueue([]);
                setCurrentQueueIndex(0);
                setActiveTab('manual');
                
                lastInitializedIdRef.current = currentId;
            }
        } else {
            // Remise à zéro du tracking quand la fenêtre ferme pour être prêt pour la prochaine ouverture
            lastInitializedIdRef.current = undefined;
        }
    }, [isOpen, initialData, initialQuestions, initialRegroupements, brancheId, groupId, periode]);

    // Effet spécial pour synchroniser la période par défaut une fois que les options sont chargées
    useEffect(() => {
        if (!loadingPeriods && !localPeriode && !initialData) {
            if (periode) {
                setLocalPeriode(periode);
            } else if (periodOptions.length > 0) {
                setLocalPeriode(periodOptions[0].value);
            } else {
                setLocalPeriode('Trimestre 1');
            }
        }
    }, [loadingPeriods, periodOptions, localPeriode, initialData, periode]);

    // Fonction utilitaire pour recalculer le total des points (Note Max) à partir de la liste des questions
    const updateNoteMax = useCallback((currentQuestions: any[]) => {
        const total = currentQuestions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0);
        setNoteMax(total);
    }, []);

    // Prépare une action pour ajouter une ligne de question supplémentaire si l'enseignant veut détailler son contrôle.
    const handleAddQuestion = useCallback(() => {
        setQuestions(prev => {
            const newQuestions = [...prev, { titre: '', note_max: 5, ratio: 1, ordre: prev.length, paliers: null }];
            updateNoteMax(newQuestions);
            return newQuestions;
        });
    }, [updateNoteMax]);

    // Prépare une action pour effacer une ligne de question si l'enseignant s'est trompé.
    const handleRemoveQuestion = useCallback((index: number) => {
        setQuestions(prev => {
            const newQuestions = prev.filter((_, i) => i !== index);
            updateNoteMax(newQuestions);
            return newQuestions;
        });
    }, [updateNoteMax]);

    // Prépare une action pour mettre à jour les informations (texte ou points) à chaque fois que l'enseignant tape au clavier dans une case de question.
    const handleQuestionChange = useCallback((index: number, field: string, value: any) => {
        setQuestions(prev => {
            const newQuestions = [...prev];
            (newQuestions[index] as any)[field] = value;
            
            // Calcule automatiquement et additionne le total des points dès qu'on modifie la valeur d'une question.
            if (field === 'note_max' || field === 'ratio') {
                updateNoteMax(newQuestions);
            }
            return newQuestions;
        });
    }, [updateNoteMax]);

    const handleAddAssociation = useCallback(() => {
        setAssociations(prev => [
            ...prev,
            { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
        ]);
    }, []);

    const handleRemoveAssociation = useCallback((id: string) => {
        setAssociations(prev => {
            if (prev.length > 1) {
                return prev.filter(a => a.id !== id);
            }
            return [{ id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }];
        });
    }, []);

    const handleImportCriteria = useCallback(() => {
        if (!scratchpad.trim()) {
            toast.error("Le brouillon est vide.");
            return;
        }

        // Split by newlines or tabs, trim and filter empty
        const lines = scratchpad.split(/[\n\t]/).map(line => line.trim()).filter(line => line !== '');
        
        if (lines.length === 0) {
            toast.error("Aucun critère valide trouvé dans le brouillon.");
            return;
        }

        setQuestions(prev => {
            // On vérifie si la seule question actuelle est vide (état par défaut)
            // Si oui, on la remplace. Sinon, on ajoute à la suite.
            const isDefault = prev.length === 1 && prev[0].titre === '' && prev[0].note_max === 5;
            const existingQuestions = isDefault ? [] : [...prev];
            
            const newQuestionsList = lines.map((name, i) => ({
                titre: name,
                note_max: 5,
                ratio: 1,
                ordre: existingQuestions.length + i,
                paliers: null
            }));

            const updated = [...existingQuestions, ...newQuestionsList];
            updateNoteMax(updated);
            return updated;
        });

        toast.success(`${lines.length} critères importés avec succès.`);
        // setScratchpad(''); // On garde le texte au cas où l'utilisateur veut corriger ? Non, l'image montre un bouton "Traiter". 
    }, [scratchpad, updateNoteMax]);

    const handleClearScratchpad = () => {
        setScratchpad('');
    };
    // Prépare l'action finale de validation lorsque l'enseignant clique sur "Créer l'évaluation".
    // Excel Import Logic
    const handleAnalyzeExcel = () => {
        if (!excelText.trim()) {
            toast.error("Veuillez coller des données depuis Excel");
            return;
        }

        // Robust TSV Parsing logic to handle quotes and internal newlines
        const parseTSV = (text: string) => {
            const rows: string[][] = [];
            let currentRow: string[] = [];
            let currentCell = '';
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];

                if (inQuotes) {
                    if (char === '"' && nextChar === '"') {
                        currentCell += '"';
                        i++;
                    } else if (char === '"') {
                        inQuotes = false;
                    } else {
                        currentCell += char;
                    }
                } else {
                    if (char === '"') {
                        inQuotes = true;
                    } else if (char === '\t') {
                        currentRow.push(currentCell);
                        currentCell = '';
                    } else if (char === '\n' || char === '\r') {
                        if (char === '\r' && nextChar === '\n') i++;
                        currentRow.push(currentCell);
                        rows.push(currentRow);
                        currentRow = [];
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
            }
            
            if (currentCell !== '' || currentRow.length > 0) {
                currentRow.push(currentCell);
                rows.push(currentRow);
            }

            return rows;
        };

        const allRows = parseTSV(excelText);
        
        // Filter out empty rows
        const lines = allRows.filter(row => row.length > 0 && row.some(cell => cell.trim().length > 0));

        if (lines.length < 2) {
            toast.error("Format de données invalide : besoin d'une ligne d'en-tête et de données");
            return;
        }

        const cleanCell = (c: string) => {
            if (!c) return '';
            return c.replace(/^["']|["']$/g, '').trim().replace(/[\n\r\t]/g, ' ').trim();
        };

        const firstRow = lines[0].map(cleanCell);
        const dataRows = lines.slice(1).map(row => row.map(cleanCell));

        // Detection of serial imports (multiple sections starting with **)
        const sections: { startIndex: number; header: string }[] = [];
        firstRow.forEach((cell, idx) => {
            if (cell.startsWith('**')) {
                sections.push({ startIndex: idx, header: cell });
            }
        });

        if (sections.length === 0) {
            toast.error("Aucune évaluation détectée (commençant par '**')");
            return;
        }

        const parseDateFromHeader = (header: string) => {
            const dateRegex = /(\d{1,2})[\./](\d{1,2})[\./](\d{2,4})/;
            const match = header.match(dateRegex);
            if (match) {
                let [fullDate, d, m, y] = match;
                if (y.length === 2) y = "20" + y; // Assume 20xx
                d = d.padStart(2, '0');
                m = m.padStart(2, '0');
                return { 
                    formatted: `${y}-${m}-${d}`,
                    original: fullDate
                };
            }
            return {
                formatted: new Date().toISOString().split('T')[0],
                original: null
            };
        };

        const jobs = sections.map((section, sIdx) => {
            const nextSectionIndex = sections[sIdx + 1]?.startIndex || firstRow.length;
            const dateResult = parseDateFromHeader(section.header);
            
            // Clean title: remove **, remove the date string if found, remove non-breaking spaces, and take first part if multi-line
            let title = section.header.replace('**', '');
            if (dateResult.original) {
                title = title.replace(dateResult.original, '');
            }
            title = title.split(/[\n\r]/)[0].trim().replace(/\s+/g, ' ');
            
            const jobDate = dateResult.formatted;
            
            // Sub-questions are the columns between this ** and the next
            // We ignore the first column of the section if it's the "Total / 100" (which is the case here)
            // But we need to check if the user wants the criteria. 
            // Usually: Col[0] = Section Header (Total), Col[1..N] = Questions.
            const questionHeaders = firstRow.slice(section.startIndex + 1, nextSectionIndex);
            
            const questions = questionHeaders.map((h, i) => ({
                titre: h || `Critère ${i + 1}`,
                note_max: 10, // default, will be adjusted by data
                ratio: 1,
                ordre: i,
                paliers: null
            }));

            const jobParsedData = dataRows.map(row => {
                const name = row[0]; // First column is always name
                const scoreCells = row.slice(section.startIndex + 1, nextSectionIndex);
                const scores = scoreCells.map(cell => {
                    if (!cell) return { score: null, max: null };
                    const numPattern = '(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)';
                    const regex = new RegExp(`(${numPattern})\\s*\\/\\s*(${numPattern})`);
                    const match = cell.match(regex);
                    if (match) {
                        return { 
                            score: parseFloat(match[1].replace(',', '.')), 
                            max: parseFloat(match[2].replace(',', '.')) 
                        };
                    }
                    const valMatch = cell.match(new RegExp(`^${numPattern}$`));
                    if (valMatch) {
                        const val = parseFloat(valMatch[0].replace(',', '.'));
                        return { score: isNaN(val) ? null : val, max: null };
                    }
                    return { score: null, max: null };
                });
                return { name, scores };
            });

            // Adjust note_max for questions in this job
            questions.forEach((q, i) => {
                const detectedMax = jobParsedData.filter(r => r.scores[i]?.max !== null).map(r => r.scores[i]?.max);
                if (detectedMax.length > 0) {
                    const counts: any = {};
                    detectedMax.forEach(m => counts[m!] = (counts[m!] || 0) + 1);
                    const mostCommon = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    q.note_max = parseFloat(mostCommon);
                }
            });

            return { title, date: jobDate, questions, parsedData: jobParsedData };
        });

        // Initialize with the first job
        const firstJob = jobs[0];
        setImportQueue(jobs);
        setCurrentQueueIndex(0);
        
        setTitre(firstJob.title);
        setDate(firstJob.date);
        setImportQuestions(firstJob.questions);
        setParsedData(firstJob.parsedData);
        
        // Calculate noteMax for first job
        const totalQuestionMax = firstJob.questions.reduce((sum, q) => sum + (q.note_max || 0), 0);
        setNoteMax(totalQuestionMax > 0 ? totalQuestionMax : 20);

        // Student mapping (shared for all jobs)
        const excelStudentNames = dataRows.map(row => row[0]);
        const mapping: {[key: string]: string} = {};
        excelStudentNames.forEach(name => {
            const match = findStudentMatch(name, groupStudents || []);
            if (match) mapping[name] = match.id;
        });
        setStudentMapping(mapping);

        if (jobs.length > 1) {
            toast.info(`${jobs.length} évaluations détectées. Début de l'importation en série.`);
        }

        setImportStep('mapping');
    };

    const handleExcelSubmit = () => {
        if (!titre.trim()) {
            toast.error("Veuillez donner un titre à l'évaluation");
            setAttemptedSubmit(true);
            return;
        }

        if (!effectiveBrancheId || !effectiveGroupId || !effectivePeriode) {
            toast.error("Veuillez remplir les champs obligatoires (Matière, Groupe, Période)");
            setAttemptedSubmit(true);
            return;
        }

        if (isNaN(noteMax) || noteMax <= 0) {
            toast.error("La note maximale de l'évaluation doit être un nombre supérieur à 0");
            setActiveTab('import');
            setImportStep('paste');
            return;
        }

        // Check if all students are mapped
        const unmapped = parsedData.filter(row => !studentMapping[row.name]);
        if (unmapped.length > 0) {
            toast.error(`${unmapped.length} élève(s) non associé(s). Veuillez corriger le tableau de correspondance.`);
            setImportStep('mapping');
            return;
        }

        // Prepare results structure
        const results = parsedData.map(row => {
            const eleve_id = studentMapping[row.name];
            const questionNotes: {[key: string]: number | null} = {};
            
            row.scores.forEach((s: any, idx: number) => {
                const question = importQuestions[idx];
                if (question) {
                    questionNotes[question.titre] = s.score;
                }
            });

            // Detect Absent (all null) and All Zeros
            const isAbsent = row.scores.every((s: any) => s.score === null);
            const isAllZeros = !isAbsent && row.scores.every((s: any) => s.score === 0 || s.score === null);

            // Calculate global note
            const totalScore = row.scores.reduce((acc: number, s: any) => acc + (s.score || 0), 0);
            const totalMax = importQuestions.reduce((acc: number, q: any) => acc + (q.note_max * q.ratio), 0);
            const globalNote = totalMax > 0 ? (totalScore / totalMax) * noteMax : 0;

            if (isAbsent) return null; // Skip absent students

            return {
                eleve_id,
                note: globalNote,
                questionNotes
            };
        }).filter(Boolean);

        const evaluationData = {
            titre,
            date,
            note_max: noteMax,
            type_note_id: typeNoteId || null,
            branche_id: effectiveBrancheId,
            group_id: effectiveGroupId,
            periode: effectivePeriode
        };

        const inSeries = importQueue.length > 1;
        const isLastInSeries = currentQueueIndex === importQueue.length - 1;

        onSubmit(evaluationData, importQuestions, [], results, { shouldClose: !inSeries || isLastInSeries });

        if (inSeries && !isLastInSeries) {
            const nextIndex = currentQueueIndex + 1;
            const nextJob = importQueue[nextIndex];
            
            // Advance to next job
            setCurrentQueueIndex(nextIndex);
            setTitre(nextJob.title);
            setDate(nextJob.date);
            setImportQuestions(nextJob.questions);
            setParsedData(nextJob.parsedData);
            
            const nextTotalMax = nextJob.questions.reduce((sum: number, q: any) => sum + (q.note_max || 0), 0);
            setNoteMax(nextTotalMax > 0 ? nextTotalMax : 20);
            
            // Stay in import mode, but go back to mapping if needed (though mapping is shared)
            // Go to preview step for the next one
            setImportStep('preview');
            toast.info(`Chargement de l'évaluation suivante : ${nextJob.title}`);
        } else if (inSeries && isLastInSeries) {
            toast.success("Importation en série terminée avec succès !");
            onClose();
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        // Empêche la page web de se recharger brusquement comme elle le ferait par défaut avec un formulaire.
        e.preventDefault();

        if (activeTab === 'import') {
            handleExcelSubmit();
            return;
        }

        setAttemptedSubmit(true);
        
        // Vérifie qu'on sait bien qui est connecté et pour quelle classe/branche l'évaluation est faite avant de continuer.
        const userId = session?.user?.id;

        // Validation simple des champs obligatoires
        const isHeaderValid = titre.trim() !== '' && date !== '' && !isNaN(noteMax);
        const isContextValid = effectiveBrancheId !== '' && effectiveGroupId !== '' && effectivePeriode !== '';
        const areQuestionsValid = !withQuestions || questions.every(q => q.titre.trim() !== '' && !isNaN(q.note_max));

        if (!userId || !isHeaderValid || !isContextValid || !areQuestionsValid) {
            toast.error("Veuillez remplir tous les champs obligatoires marqués en rouge.");
            return;
        }

        // Regroupe proprement toutes les informations tapées dans un colis final.
        const evaluationData = {
            titre,
            date,
            note_max: noteMax,
            branche_id: effectiveBrancheId,
            group_id: effectiveGroupId,
            periode: effectivePeriode,
            user_id: userId,
            type_note_id: typeNoteId || null
        };

        // Expédie ce colis (et potentiellement le détail des questions) à la page principale pour l'enregistrement en base de données.
        const cleanedAssociations = associations.map((assoc, idx) => ({
            id: assoc.id.toString().startsWith('temp_') ? undefined : assoc.id, // Remove temporary IDs
            titre: assoc.label,
            ordre: idx,
            elements: assoc.slots
        })).filter(a => a.titre || a.elements.some((s: any) => s !== null));

        onSubmit(
            evaluationData, 
            withQuestions ? questions : [], 
            (withQuestions && associerAussi) ? cleanedAssociations : []
        );
        
        // Remet le formulaire à zéro pour effacer les traces de ce qui a été tapé (pour le prochain contrôle) et ferme la fenêtre.
        setTitre('');
        setWithQuestions(false);
        setQuestions([{ titre: '', note_max: 5, ratio: 1, ordre: 0, paliers: null }]);
        setScratchpad('');
        setAssociations([
            { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
        ]);
        setAttemptedSubmit(false);

        // Reset Excel Import States
        setActiveTab('manual');
        setExcelText('');
        setImportStep('paste');
        setStudentMapping({});
        setParsedData([]);
        setImportQuestions([]);

        onClose();
    };

    const handleDragStart = (e: React.DragEvent, questionIndex: number) => {
        e.dataTransfer.setData('questionIndex', questionIndex.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnSlot = (groupIndex: number, slotIndex: number) => (e: React.DragEvent) => {
        e.preventDefault();
        const questionIndex = parseInt(e.dataTransfer.getData('questionIndex'));
        
        if (!isNaN(questionIndex)) {
            const newAssocs = [...associations];
            const newSlots = [...newAssocs[groupIndex].slots];
            newSlots[slotIndex] = questionIndex;
            
            // Auto-fill title if it's the only element
            const activeSlots = newSlots.filter(s => s !== null);
            let newLabel = newAssocs[groupIndex].label;
            let isSuggested = newAssocs[groupIndex].isSuggested;
            if (activeSlots.length === 1 && !newLabel) {
                const question = questions[activeSlots[0] - 1];
                if (question?.titre) {
                    newLabel = question.titre;
                    isSuggested = true;
                }
            }
            
            newAssocs[groupIndex] = { ...newAssocs[groupIndex], slots: newSlots, label: newLabel, isSuggested };
            setAssociations(newAssocs);
        }
    };

    const handleRemoveFromSlot = (groupIndex: number, slotIndex: number) => {
        const newAssocs = [...associations];
        const newSlots = [...newAssocs[groupIndex].slots];
        newSlots[slotIndex] = null;
        
        // Auto-fill title if it drops back to exactly one element
        const activeSlots = newSlots.filter(s => s !== null);
        let newLabel = newAssocs[groupIndex].label;
        let isSuggested = newAssocs[groupIndex].isSuggested;
        if (activeSlots.length === 1 && !newLabel) {
            const question = questions[activeSlots[0] - 1];
            if (question?.titre) {
                newLabel = question.titre;
                isSuggested = true;
            }
        }
        
        newAssocs[groupIndex] = { ...newAssocs[groupIndex], slots: newSlots, label: newLabel, isSuggested };
        setAssociations(newAssocs);
    };

    const calculateAssociationTotal = useCallback((slots: (number | null)[]) => {
        return slots.reduce((acc: number, qIdx: number | null) => {
            if (qIdx === null) return acc;
            const q = questions[qIdx - 1];
            if (!q) return acc;
            return acc + (Number(q.note_max) * Number(q.ratio) || 0);
        }, 0);
    }, [questions]);

    // Prépare une action pour adapter automatiquement la "Note Max" si l'enseignant choisit un barème de notation pré-existant (ex: sur 20, ou acquis/non acquis).
    const handleTypeNoteChange = (id: string) => {
        setTypeNoteId(id);
        if (id) {
            const selectedType = noteTypes.find(nt => nt.id === id);
            const config = selectedType?.config as any;
            if (config?.max) {
                setNoteMax(config.max);
            }
        }
    };
    
    // Obscerve si le barème actuellement choisi par l'enseignant est un système de conversion spécifique (ex: lettres) pour afficher des instructions.
    const activeNoteType = useMemo(() => noteTypes.find(nt => nt.id === typeNoteId), [noteTypes, typeNoteId]);
    const isConversion = useMemo(() => activeNoteType?.systeme === 'conversion', [activeNoteType]);

    // Memoize options for Select components
    const branchOptions = useMemo(() => [
        { value: '', label: 'Sélectionner...' },
        ...branches.map(b => ({ value: b.id, label: b.nom }))
    ], [branches]);

    const groupOptions = useMemo(() => [
        { value: '', label: 'Sélectionner...' },
        ...groups.map(g => ({ value: g.id, label: g.nom }))
    ], [groups]);

    const periodOptionsMemo = useMemo(() => [
        { value: '', label: 'Sélectionner...' },
        ...periodOptions
    ], [periodOptions]);

    const noteTypeOptions = useMemo(() => [
        { value: '', label: 'Standard' },
        ...noteTypes.map(nt => ({ value: nt.id, label: nt.nom }))
    ], [noteTypes]);
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Modifier l'évaluation" : "Nouvelle Évaluation"}
            footer={
                <>
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        form="add-evaluation-form"
                        disabled={isLoading}
                        loading={isLoading}
                    >
                        {initialData ? (isLoading ? "Mise à jour..." : "Mettre à jour") : (isLoading ? "Création..." : "Créer l'évaluation")}
                    </Button>
                </>
            }
        >
            <form id="add-evaluation-form" onSubmit={handleFormSubmit} className="space-y-6">
                {needsContext && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <Select
                            label="Branche"
                            value={localBrancheId}
                            onChange={(e) => setLocalBrancheId(e.target.value)}
                            options={branchOptions}
                            error={isInvalid(localBrancheId) ? 'Requis' : undefined}
                        />
                        <Select
                            label="Groupe"
                            value={localGroupId}
                            onChange={(e) => setLocalGroupId(e.target.value)}
                            options={groupOptions}
                            error={isInvalid(localGroupId) ? 'Requis' : undefined}
                        />
                        <Select
                            label="Période"
                            value={localPeriode}
                            onChange={(e) => setLocalPeriode(e.target.value)}
                            options={periodOptionsMemo}
                            error={isInvalid(localPeriode) ? 'Requis' : undefined}
                        />
                    </div>
                )}

                <div className="flex p-1 bg-black/20 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            activeTab === 'manual' ? "bg-primary text-white shadow-lg" : "text-grey-medium hover:text-grey-light hover:bg-white/5"
                        )}
                    >
                        <ListChecks size={14} />
                        Saisie Manuelle
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('import')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            activeTab === 'import' ? "bg-primary text-white shadow-lg" : "text-grey-medium hover:text-grey-light hover:bg-white/5"
                        )}
                    >
                        <TableIcon size={14} />
                        Import Excel
                    </button>
                </div>

                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                        <Input
                            label="Titre de l'évaluation"
                            placeholder="ex: Dictée, Contrôle de mathématiques..."
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                            error={isInvalid(titre) ? 'Un titre est requis' : undefined}
                        />
                    </div>
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        error={isInvalid(date) ? 'Sélectionnez une date' : undefined}
                    />
                    <div className="grid grid-cols-1 gap-3">
                        <Input
                            label="Note Max"
                            type="number"
                            min="1"
                            value={noteMax}
                            onChange={(e) => setNoteMax(parseFloat(e.target.value))}
                            disabled={withQuestions}
                            required
                            error={isInvalid(noteMax) ? 'Note max requise' : undefined}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Select 
                            label="Barème de notation (Optionnel)"
                            value={typeNoteId}
                            onChange={(e) => handleTypeNoteChange(e.target.value)}
                            icon={Settings2}
                            options={noteTypeOptions}
                        />
                        {isConversion && (
                            <p className="mt-3 text-[10px] text-primary font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5 px-1">
                                <InfoIcon size={12} />
                                Info: Le maximum ci-dessus servira de base pour la conversion (%)
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-border/5">
                    <div className="flex items-center mb-4">
                        <div className="flex items-center gap-2">
                            <ListChecks size={20} className="text-primary" />
                            <span className="font-black text-text-main uppercase tracking-tight text-sm">Détails par question</span>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group ml-10">
                            <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest group-hover:text-primary transition-colors">
                                Activer
                            </span>
                            <input 
                                type="checkbox" 
                                checked={withQuestions}
                                onChange={(e) => setWithQuestions(e.target.checked)}
                                className="w-5 h-5 rounded-lg border-white/10 bg-black/20 text-primary focus:ring-primary/50 transition-all"
                            />
                        </label>
                        {withQuestions && (
                            <label className="flex items-center gap-2 cursor-pointer group ml-8 animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-[10px] font-bold text-grey-medium uppercase tracking-wider group-hover:text-primary transition-colors">
                                    Associer aussi avec
                                </span>
                                <input 
                                    type="checkbox" 
                                    checked={associerAussi}
                                    onChange={(e) => setAssocierAussi(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                            </label>
                        )}
                    </div>

                    {withQuestions && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {/* Brouillon temporaire */}
                            <div className="mb-6 p-5 bg-primary/5 rounded-2xl border border-dashed border-primary/20 shadow-inner group/scratch">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-primary" />
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            Brouillon temporaire (Zone de copier-coller)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover/scratch:opacity-100 transition-opacity">
                                        <Button 
                                            type="button"
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={handleClearScratchpad}
                                            className="h-7 px-2 text-[9px] font-black uppercase tracking-tighter text-grey-medium hover:text-red-400"
                                        >
                                            <Trash2 size={12} className="mr-1" />
                                            Vider
                                        </Button>
                                        <Button 
                                            type="button"
                                            size="sm" 
                                            variant="primary" 
                                            onClick={handleImportCriteria}
                                            className="h-7 px-3 text-[9px] font-black uppercase tracking-tighter"
                                        >
                                            <ClipboardList size={12} className="mr-1" />
                                            Traiter et Importer
                                        </Button>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Collez ici votre liste de critères (issue d'Excel ou texte)..."
                                    className="w-full h-24 bg-black/30 border border-white/5 rounded-xl p-4 text-sm text-grey-light focus:outline-none focus:border-primary/30 transition-all resize-none placeholder:text-grey-medium/20 focus:bg-black/50"
                                    value={scratchpad}
                                    onChange={(e) => setScratchpad(e.target.value)}
                                />
                                <div className="mt-2 flex items-center gap-1.5 px-1">
                                    <InfoIcon size={10} className="text-primary/40" />
                                    <span className="text-[9px] text-grey-medium font-bold uppercase tracking-wider italic">
                                        Séparez vos titres par des retours à la ligne ou des tabulations
                                    </span>
                                </div>
                            </div>

                            {/* Header de la liste */}
                            {questions.length > 0 && (
                                <div className="flex gap-2 px-1 mb-1">
                                    <div className="w-5 flex-none"></div>
                                    <div className="w-10 flex-none text-center"></div>
                                    <div className="flex-1 text-xs font-black text-primary/40 uppercase tracking-widest pl-4">
                                        Critère / Question
                                    </div>
                                    <div className="w-20 text-xs font-black text-primary/40 uppercase tracking-widest text-center">
                                        Max
                                    </div>
                                    <div className="w-10 flex-none"></div>
                                    <div className="w-4"></div>
                                    <div 
                                        className="w-24 text-xs font-medium text-grey-medium uppercase tracking-wider text-center cursor-pointer hover:text-primary transition-colors flex items-center justify-center gap-1"
                                        onClick={() => setShowRatio(!showRatio)}
                                        title={showRatio ? "Voir en Pt Final" : "Voir en Ratio"}
                                    >
                                        {showRatio ? "Ratio" : "Pt Final"}
                                        <ArrowRightLeft size={10} />
                                    </div>
                                    <div className="w-10"></div>
                                </div>
                            )}
                            {/* Liste des questions */}
                            {questions.map((q, index) => {
                                const qNumber = index + 1;
                                const isAssociated = associations.some(assoc => assoc.slots.includes(qNumber));

                                return (
                                    <div 
                                        key={index} 
                                        className={clsx(
                                            "flex flex-col group p-1 transition-all duration-300 rounded-2xl",
                                            isAssociated && "bg-primary/10 ring-1 ring-primary/20"
                                        )}
                                    >
                                        <div className="flex gap-2 items-center">
                                            <div 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, qNumber)}
                                                className="w-5 flex-none text-grey-medium/10 group-hover:text-primary/40 transition-colors cursor-grab active:cursor-grabbing flex justify-center"
                                                title="Glisser ce numéro pour l'associer"
                                            >
                                                <GripVertical size={14} />
                                            </div>
                                            <div 
                                                draggable
                                                onDragStart={(e) => e.dataTransfer.setData('text/plain', qNumber.toString())}
                                                className="w-10 h-10 flex-none rounded-xl flex items-center justify-center text-sm font-black transition-all cursor-grab active:cursor-grabbing border-dashed border border-primary/40 bg-white/10 text-primary shadow-lg shadow-primary/5"
                                            >
                                                {qNumber}
                                            </div>
                                            
                                            {/* Styled Question Input */}
                                            <div className={clsx(
                                                "flex-1 bg-input/40 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all",
                                                isInvalid(q.titre) && "bg-danger/20 border-danger/50"
                                            )}>

                                                <input
                                                    type="text"
                                                    value={q.titre}
                                                    onChange={(e) => handleQuestionChange(index, 'titre', e.target.value)}
                                                    placeholder={`Détails de la question ${qNumber}...`}
                                                    className="w-full bg-transparent border-none text-grey-light placeholder:text-grey-medium/30 focus:outline-none"
                                                    required
                                                />
                                            </div>

                                            <div className="w-20">
                                                <Input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={q.note_max}
                                                    onChange={(e) => handleQuestionChange(index, 'note_max', parseFloat(e.target.value))}
                                                    required
                                                    error={isInvalid(q.note_max) ? '!' : undefined}
                                                />
                                            </div>

                                            {/* Bouton Grille de Critères */}
                                            <button
                                                type="button"
                                                onClick={() => setEditingGridIndex(editingGridIndex === index ? null : index)}
                                                className={clsx(
                                                    "w-10 h-10 flex-none rounded-xl border flex items-center justify-center transition-all",
                                                    q.paliers ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-grey-medium hover:bg-white/10"
                                                )}
                                                title="Configurer une grille de critères"
                                            >
                                                <Grid size={18} />
                                            </button>
                                            
                                            <div className="w-4"></div>
                                            
                                            <div className="w-24">
                                                {showRatio ? (
                                                    <Input
                                                        type="number"
                                                        placeholder="Ratio"
                                                        value={q.ratio}
                                                        onChange={(e) => handleQuestionChange(index, 'ratio', parseFloat(e.target.value) || 0)}
                                                        step="0.1"
                                                        min="0"
                                                        required
                                                        error={isInvalid(q.ratio) ? 'Err' : undefined}
                                                    />
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        placeholder="Pt Final"
                                                        value={Number((q.note_max * q.ratio).toFixed(2))}
                                                        onChange={(e) => {
                                                            const finalPoints = parseFloat(e.target.value) || 0;
                                                            const newRatio = q.note_max > 0 ? (finalPoints / q.note_max) : 0;
                                                            handleQuestionChange(index, 'ratio', newRatio);
                                                        }}
                                                        step="0.5"
                                                        min="0"
                                                        required
                                                        error={isInvalid(q.ratio) ? 'Err' : undefined}
                                                    />
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuestion(index)}
                                                className="w-10 h-10 flex-none rounded-xl bg-red-500/10 text-red-500/30 hover:text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center"
                                                title="Supprimer la question"
                                                disabled={questions.length === 1}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* ÉDITEUR DE GRILLE (Paliers) */}
                                        {editingGridIndex === index && (
                                            <div className="mt-2 ml-14 mr-10 p-5 bg-black/40 border border-primary/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Grid size={16} className="text-primary" />
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Configuration de la grille</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-7 text-[9px] font-black uppercase"
                                                            onClick={() => {
                                                                const newQuestions = [...questions];
                                                                newQuestions[index].paliers = [
                                                                    { label: 'Non acquis', points: 0, color: '#ef4444' },
                                                                    { label: 'En cours', points: q.note_max / 2, color: '#f59e0b' },
                                                                    { label: 'Acquis', points: q.note_max, color: '#22c55e' }
                                                                ];
                                                                setQuestions(newQuestions);
                                                            }}
                                                        >
                                                            Modèle 3 paliers
                                                        </Button>
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-7 text-[9px] font-black uppercase text-red-400"
                                                            onClick={() => {
                                                                const newQuestions = [...questions];
                                                                newQuestions[index].paliers = null;
                                                                setQuestions(newQuestions);
                                                                setEditingGridIndex(null);
                                                            }}
                                                        >
                                                            Supprimer la grille
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {(q.paliers || []).map((p: any, pIdx: number) => (
                                                        <div key={pIdx} className="flex gap-3 items-center">
                                                            <input 
                                                                type="color" 
                                                                value={p.color} 
                                                                onChange={(e) => {
                                                                    const newQuestions = [...questions];
                                                                    newQuestions[index].paliers[pIdx].color = e.target.value;
                                                                    setQuestions(newQuestions);
                                                                }}
                                                                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer overflow-hidden p-0"
                                                            />
                                                            <input 
                                                                type="text"
                                                                placeholder="Libellé (ex: Acquis)"
                                                                value={p.label}
                                                                onChange={(e) => {
                                                                    const newQuestions = [...questions];
                                                                    newQuestions[index].paliers[pIdx].label = e.target.value;
                                                                    setQuestions(newQuestions);
                                                                }}
                                                                className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:border-primary/50 outline-none"
                                                            />
                                                            <div className="w-24">
                                                                <input 
                                                                    type="number"
                                                                    step="0.5"
                                                                    placeholder="Pts"
                                                                    value={p.points}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        const newQuestions = [...questions];
                                                                        newQuestions[index].paliers[pIdx].points = val;
                                                                        // Auto update note_max if this is the highest
                                                                        const maxInPaliers = Math.max(...newQuestions[index].paliers.map((pl: any) => pl.points));
                                                                        if (maxInPaliers > 0) newQuestions[index].note_max = maxInPaliers;
                                                                        setQuestions(newQuestions);
                                                                    }}
                                                                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-center text-primary font-black outline-none"
                                                                />
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const newQuestions = [...questions];
                                                                    newQuestions[index].paliers.splice(pIdx, 1);
                                                                    if (newQuestions[index].paliers.length === 0) newQuestions[index].paliers = null;
                                                                    setQuestions(newQuestions);
                                                                }}
                                                                className="p-1.5 text-red-500/50 hover:text-red-500"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newQuestions = [...questions];
                                                            if (!newQuestions[index].paliers) newQuestions[index].paliers = [];
                                                            newQuestions[index].paliers.push({ label: '', points: 0, color: '#3b82f6' });
                                                            setQuestions(newQuestions);
                                                        }}
                                                        className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase text-grey-medium hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2 mt-2"
                                                    >
                                                        <Plus size={12} />
                                                        Ajouter un palier
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleAddQuestion}
                                className="w-full mt-2 border-dashed flex items-center justify-center gap-2"
                            >
                                <Plus size={14} />
                                Ajouter une question
                            </Button>
                        {questions.length >= 2 && (
                                <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <Calculator size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-grey-medium uppercase tracking-widest">Total maximum pondéré</span>
                                    </div>
                                    <div className="text-xl font-black text-primary drop-shadow-sm">
                                        {questions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0)} <span className="text-xs">pts</span>
                                    </div>
                                </div>
                            )}
                            
                        {withQuestions && associerAussi && (
                                <div className="mt-8 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <ArrowRightLeft size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-grey-light uppercase tracking-widest">
                                                    Groupements d'évaluation
                                                </h4>
                                                <p className="text-[10px] text-grey-medium font-bold uppercase tracking-wider">
                                                    Associez vos questions à des compétences globales
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {associations.map((assoc, groupIdx) => (
                                            <div 
                                                key={assoc.id}
                                                className={clsx(
                                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group/row",
                                                    calculateAssociationTotal(assoc.slots) > 0 
                                                        ? "bg-primary/5 border-primary/20 shadow-xl shadow-primary/5" 
                                                        : "bg-white/5 border-white/5"
                                                )}
                                            >

                                                {/* Slots de dépôt */}
                                                <div className="flex gap-2 flex-none">
                                                    {assoc.slots.map((slot: number | null, slotIdx: number) => (
                                                        <div 
                                                            key={slotIdx}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={handleDropOnSlot(groupIdx, slotIdx)}
                                                            onClick={() => slot !== null && handleRemoveFromSlot(groupIdx, slotIdx)}
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black transition-all cursor-pointer border-dashed border border-primary/40 bg-white/10 text-primary shadow-lg shadow-primary/5 hover:scale-105 active:scale-95"
                                                            title={slot ? `Cliquer pour retirer la Question ${slot}` : "Glisser un numéro ici"}
                                                        >
                                                            {slot || ""}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Titre de l'association - Zone de texte éditable */}
                                                <div className="flex-1 bg-black/20 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all flex flex-col justify-center relative group/input shadow-inner">
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="text"
                                                            placeholder={`Ex: Compréhension à l'audition...`}
                                                            className="flex-1 bg-transparent border-none text-grey-light font-bold placeholder:text-grey-medium/20 focus:outline-none"
                                                            value={assoc.label}
                                                            onChange={(e) => {
                                                                const newAssocs = [...associations];
                                                                newAssocs[groupIdx] = { 
                                                                    ...assoc, 
                                                                    label: e.target.value,
                                                                    isSuggested: false 
                                                                };
                                                                setAssociations(newAssocs);
                                                            }}
                                                        />
                                                        
                                                        {/* Validation / Clear buttons */}
                                                        {(assoc.isSuggested || (assoc.label && assoc.label.length > 0)) && (
                                                            <div className={clsx(
                                                                "flex items-center gap-1.5 transition-all duration-300",
                                                                assoc.isSuggested ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none group-hover/input:opacity-100 group-hover/input:translate-x-0 group-hover/input:pointer-events-auto"
                                                            )}>
                                                                {assoc.isSuggested && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newAssocs = [...associations];
                                                                            newAssocs[groupIdx].isSuggested = false;
                                                                            setAssociations(newAssocs);
                                                                        }}
                                                                        className="p-1.5 rounded-full bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg"
                                                                        title="Valider la suggestion"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newAssocs = [...associations];
                                                                        newAssocs[groupIdx].label = '';
                                                                        newAssocs[groupIdx].isSuggested = false;
                                                                        setAssociations(newAssocs);
                                                                    }}
                                                                    className="p-1.5 rounded-full bg-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white transition-all"
                                                                    title="Effacer le titre"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Score total de l'association */}
                                                <div className="flex-none pr-2 min-w-[60px] text-right">
                                                    <div className="text-[10px] font-black text-grey-medium/40 uppercase tracking-widest mb-1">
                                                        Points
                                                    </div>
                                                    <div className="text-xl font-black text-primary drop-shadow-sm">
                                                        {calculateAssociationTotal(assoc.slots)}
                                                    </div>
                                                </div>

                                                {/* Bouton de suppression du groupement (si plus d'un) */}
                                                <div className="flex-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAssociation(assoc.id)}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-500/30 hover:text-red-500 hover:bg-red-500/20 transition-all"
                                                        title="Supprimer ce groupement"
                                                        disabled={associations.length === 1}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bouton pour ajouter un regroupement */}
                                    <div className="flex justify-center mt-8">
                                        <button
                                            type="button"
                                            onClick={handleAddAssociation}
                                            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary/10 text-primary font-black uppercase text-xs tracking-widest hover:bg-primary/20 transition-all border border-primary/20 shadow-xl shadow-primary/5 group active:scale-95"
                                        >
                                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                                            Ajouter un groupement
                                        </button>
                                    </div>

                                    <p className="mt-8 text-[9px] text-grey-medium/30 italic text-center uppercase tracking-widest flex items-center justify-center gap-2">
                                        <GripVertical size={10} />
                                        Glissez les numéros des questions sur les cases pour les regrouper
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {importStep === 'paste' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Titre de l'évaluation"
                                            placeholder="ex: Dictée, Contrôle de mathématiques..."
                                            value={titre}
                                            onChange={(e) => setTitre(e.target.value)}
                                            error={isInvalid(titre) ? 'Un titre est obligatoire' : undefined}
                                        />
                                    </div>
                                    <Input
                                        label="Date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Sur combien ?"
                                            type="number"
                                            value={noteMax}
                                            onChange={(e) => setNoteMax(Number(e.target.value))}
                                            error={isInvalid(noteMax) ? 'Requis (> 0)' : undefined}
                                        />
                                         <div className={clsx(
                                             "transition-all duration-300 rounded-xl p-0.5",
                                             typeNoteId ? "bg-gradient-to-br from-success/40 to-primary/40 shadow-lg shadow-success/10" : "bg-white/5"
                                         )}>
                                             <Select
                                                 label="Barème de notation"
                                                 value={typeNoteId}
                                                 onChange={(e) => handleTypeNoteChange(e.target.value)}
                                                 options={noteTypeOptions}
                                                 className={clsx(
                                                     "!bg-black/40 !border-0",
                                                     !typeNoteId && "animate-pulse border border-warning/30"
                                                 )}
                                             />
                                             {typeNoteId && (
                                                 <div className="px-3 py-1 flex items-center gap-1.5">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                     <span className="text-[9px] font-black text-success uppercase tracking-widest">
                                                         {noteTypes.find(nt => nt.id === typeNoteId)?.systeme === 'conversion' ? 'Conversion Active' : 'Calcul de Moyenne'}
                                                     </span>
                                                 </div>
                                             )}
                                         </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <ClipboardList size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-white">Copier-coller Excel</h4>
                                                <p className="text-[10px] text-grey-medium font-medium">Collez votre tableau complet incluant la ligne d'en-tête</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative group/excel">
                                        <textarea
                                            value={excelText}
                                            onChange={(e) => setExcelText(e.target.value)}
                                            placeholder="Nom élève	Question 1	Question 2...&#10;Jean Dupont	14/20	8/10...&#10;Marie Durant	18/20	9/10..."
                                            className="w-full h-48 bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-mono text-grey-light focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none placeholder:text-grey-medium/20"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 p-4 flex justify-end">
                                            <Button 
                                                variant="primary" 
                                                onClick={handleAnalyzeExcel}
                                                className="shadow-2xl shadow-primary/20"
                                                disabled={!excelText.trim()}
                                            >
                                                Analyser les données
                                                <ChevronRight size={16} className="ml-2" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
                                        <AlertCircle size={16} className="text-primary mt-0.5" />
                                        <p className="text-[10px] leading-relaxed text-grey-medium font-medium lowercase first-letter:uppercase italic">
                                            Le système détectera automatiquement les noms des élèves, les titres des questions et les points maximums si ils sont notés sous la forme "note / max" (ex: 2 / 5).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importStep === 'mapping' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setImportStep('paste')}
                                            className="p-2 rounded-lg hover:bg-white/5 text-grey-medium transition-colors"
                                        >
                                            <ChevronRight size={16} className="rotate-180" />
                                        </button>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Association des élèves</h4>
                                    </div>
                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">
                                        {Object.keys(studentMapping).length} / {parsedData.length} ASSOCIÉS
                                    </span>
                                </div>

                                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5">
                                                <th className="px-4 py-3 text-[10px] font-black text-grey-medium uppercase tracking-widest">Nom dans Excel</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-grey-medium uppercase tracking-widest">Élève dans le système</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-grey-medium uppercase tracking-widest text-center w-16">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {parsedData.map((row, idx) => {
                                                const studentId = studentMapping[row.name];
                                                const isMatched = !!studentId;
                                                return (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-4 py-3 text-sm font-bold text-grey-light">{row.name}</td>
                                                        <td className="px-4 py-2">
                                                            <Select
                                                                value={studentId || ''}
                                                                onChange={(e) => setStudentMapping(prev => ({ ...prev, [row.name]: e.target.value }))}
                                                                options={[
                                                                    { value: '', label: loadingStudents ? 'Chargement...' : 'Sélectionner l\'élève...' },
                                                                    ...(groupStudents || []).map(s => ({ 
                                                                        value: s.id, 
                                                                        label: `${s.prenom} ${s.nom}` 
                                                                    }))
                                                                ]}
                                                                className="h-9 py-0 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isMatched ? (
                                                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                                                            ) : (
                                                                <AlertCircle size={16} className="text-red-400 mx-auto" />
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button variant="ghost" onClick={() => setImportStep('paste')}>Retour</Button>
                                    <Button 
                                        variant="primary" 
                                        onClick={() => setImportStep('preview')}
                                        disabled={Object.keys(studentMapping).length < parsedData.length}
                                    >
                                        Vérifier les notes
                                        <ChevronRight size={16} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {importStep === 'preview' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setImportStep('mapping')}
                                            className="p-2 rounded-lg hover:bg-white/5 text-grey-medium transition-colors"
                                        >
                                            <ChevronRight size={16} className="rotate-180" />
                                        </button>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Aperçu des questions & notes</h4>
                                    </div>
                                </div>

                                {/* Questions and Max Correction */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                    {importQuestions.map((q, idx) => (
                                        <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-black/20 border border-white/5">
                                            <div className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{q.titre}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-grey-medium uppercase font-bold">Max:</span>
                                                <input 
                                                    type="number" 
                                                    value={q.note_max}
                                                    onChange={(e) => {
                                                        const newVal = parseFloat(e.target.value);
                                                        setImportQuestions(prev => prev.map((item, i) => i === idx ? { ...item, note_max: newVal } : item));
                                                    }}
                                                    className="w-12 bg-transparent border-b border-primary/30 text-xs font-black text-white focus:border-primary focus:outline-none text-center"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                 {/* Summary Stats */}
                                 {parsedData.length > 0 && (
                                     <div className="flex flex-wrap gap-4 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                                         {importQueue.length > 1 ? (
                                             <div className="w-full mb-3 flex flex-col gap-2 border-b border-primary/10 pb-3">
                                                 <div className="flex items-center justify-between">
                                                     <div className="flex items-center gap-2">
                                                         <div className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                                                             Série en cours
                                                         </div>
                                                         <span className="text-xs font-bold text-white/80">
                                                             Évaluation {currentQueueIndex + 1} sur {importQueue.length}
                                                         </span>
                                                     </div>
                                                     <div className="flex gap-1">
                                                         {importQueue.map((_, idx) => (
                                                             <div 
                                                                 key={idx} 
                                                                 className={clsx(
                                                                     "w-8 h-1 rounded-full transition-all duration-300",
                                                                     idx === currentQueueIndex ? "bg-primary w-12" : (idx < currentQueueIndex ? "bg-success" : "bg-white/10")
                                                                 )}
                                                             />
                                                         ))}
                                                     </div>
                                                 </div>
                                                 <h3 className="text-xl font-black text-white px-1 mt-1 flex items-center flex-wrap gap-2">
                                                     <div className="w-1.5 h-6 bg-primary rounded-full" />
                                                     {titre || "Sans titre"}
                                                     {date && (
                                                         <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/40">
                                                             {new Date(date).toLocaleDateString('fr-FR')}
                                                         </span>
                                                     )}
                                                 </h3>
                                             </div>
                                         ) : (
                                             <div className="w-full mb-3 border-b border-primary/10 pb-3">
                                                 <h3 className="text-xl font-black text-white px-1 flex items-center flex-wrap gap-2">
                                                     <div className="w-1.5 h-6 bg-primary rounded-full" />
                                                     {titre || "Nouvelle Évaluation"}
                                                     {date && (
                                                         <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/40">
                                                             {new Date(date).toLocaleDateString('fr-FR')}
                                                         </span>
                                                     )}
                                                 </h3>
                                             </div>
                                         )}
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                                 <Calculator size={20} />
                                             </div>
                                             <div>
                                                 <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Moyenne de classe</div>
                                                 <div className="text-xl font-black text-white">
                                                     {(parsedData.reduce((acc, row) => acc + row.scores.reduce((sAcc: number, s: any) => sAcc + (s.score || 0), 0), 0) / (parsedData.length || 1)).toFixed(2)}
                                                     <span className="text-xs text-grey-medium ml-1">/ {noteMax}</span>
                                                 </div>
                                             </div>
                                         </div>
                                         
                                         {typeNoteId && noteTypes.find(nt => nt.id === typeNoteId)?.systeme === 'conversion' && (
                                             <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                                                 <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center text-success">
                                                     <UserCheck size={20} />
                                                 </div>
                                                 <div>
                                                     <div className="text-[10px] font-black text-success/60 uppercase tracking-widest">Système actif</div>
                                                     <div className="text-sm font-bold text-white">
                                                         {noteTypes.find(nt => nt.id === typeNoteId)?.nom}
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}

                                 <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden max-h-[400px] overflow-y-auto">
                                     <table className="w-full text-left border-collapse">
                                         <thead className="sticky top-0 bg-grey-dark z-10 shadow-lg">
                                             <tr className="bg-white/5">
                                                 <th className="px-4 py-3 text-[10px] font-black text-grey-medium uppercase tracking-widest sticky left-0 bg-grey-dark z-10">Élève</th>
                                                 <th className="px-4 py-3 text-[10px] font-black text-primary bg-primary/10 uppercase tracking-widest text-center border-x border-white/5 whitespace-nowrap">
                                                     Total / {noteMax}
                                                 </th>
                                                 {typeNoteId && noteTypes.find(nt => nt.id === typeNoteId)?.systeme === 'conversion' && (
                                                     <th className="px-4 py-3 text-[10px] font-black text-success bg-success/10 uppercase tracking-widest text-center border-r border-white/5 whitespace-nowrap">
                                                         Statut
                                                     </th>
                                                 )}
                                                 {importQuestions.map((q, idx) => (
                                                     <th key={idx} className="px-4 py-3 text-[10px] font-black text-grey-medium uppercase tracking-widest text-center">{q.titre}</th>
                                                 ))}
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-white/5">
                                             {parsedData.map((row, idx) => {
                                                 const totalScore = row.scores.reduce((acc: number, s: any) => acc + (s.score || 0), 0);
                                                 const noteMaxPossible = importQuestions.reduce((acc, q) => acc + (q.note_max || 0), 0);
                                                 
                                                 // Local conversion logic for preview
                                                 const activeTypeNote = noteTypes.find(nt => nt.id === typeNoteId);
                                                 let palier = null;
                                                 if (activeTypeNote?.systeme === 'conversion') {
                                                     const percentage = (totalScore / (noteMaxPossible || 1)) * 100;
                                                     const config = activeTypeNote.config as any;
                                                     if (config?.paliers) {
                                                         palier = config.paliers.find((p: any) => {
                                                             const min = p.minPercent ?? 0;
                                                             const max = p.maxPercent ?? 101;
                                                             if (percentage >= 100 && max >= 100) return percentage >= min;
                                                             return percentage >= min && percentage < max;
                                                         });
                                                     }
                                                 }

                                                 const isAbsent = row.scores.every((s: any) => s.score === null);
                                                 const isAllZeros = !isAbsent && row.scores.every((s: any) => s.score === 0 || s.score === null);

                                                 return (
                                                     <tr key={idx} className={clsx(
                                                         "transition-colors",
                                                         isAllZeros ? "bg-red-500/10 hover:bg-red-500/20" : "hover:bg-white/[0.02]"
                                                     )}>
                                                         <td className={clsx(
                                                             "px-4 py-3 text-sm font-bold sticky left-0 z-10",
                                                             isAllZeros ? "text-red-400 bg-red-900/40" : "text-grey-light bg-black/20"
                                                         )}>
                                                             {row.name}
                                                         </td>
                                                         <td className={clsx(
                                                             "px-4 py-3 text-center border-x border-white/5",
                                                             isAllZeros ? "bg-red-500/20" : "bg-primary/5"
                                                         )}>
                                                             {isAbsent ? (
                                                                 <span className="text-[10px] font-black text-grey-medium uppercase tracking-tighter opacity-50 px-1 py-0.5 rounded border border-white/10">Absent</span>
                                                             ) : (
                                                                 <span className={clsx("text-sm font-black", isAllZeros ? "text-red-500" : "text-primary")}>
                                                                     {totalScore.toFixed(1).replace('.0', '')}
                                                                 </span>
                                                             )}
                                                         </td>
                                                         {activeTypeNote?.systeme === 'conversion' && (
                                                             <td className={clsx(
                                                                 "px-4 py-3 text-center border-r border-white/5",
                                                                 isAllZeros ? "bg-red-500/10" : "bg-success/5"
                                                             )}>
                                                                 {isAbsent ? (
                                                                     <span className="text-[10px] text-grey-medium italic">-</span>
                                                                 ) : palier ? (
                                                                     <div className="flex flex-col items-center">
                                                                         <span className={clsx("text-xs font-black px-2 py-0.5 rounded-full border border-current", 
                                                                             palier.color === 'blue' ? 'text-info border-info/30 bg-info/10' :
                                                                             palier.color === 'green' ? 'text-success border-success/30 bg-success/10' :
                                                                             palier.color === 'orange' ? 'text-warning border-warning/30 bg-warning/10' :
                                                                             'text-danger border-danger/30 bg-danger/10'
                                                                         )}>
                                                                             {palier.letter}
                                                                         </span>
                                                                         <span className="text-[8px] font-bold uppercase mt-1 opacity-60">
                                                                             {palier.label}
                                                                         </span>
                                                                     </div>
                                                                 ) : (
                                                                     <span className="text-[10px] text-grey-medium italic">-</span>
                                                                 )}
                                                             </td>
                                                         )}
                                                         {row.scores.map((s: any, sIdx: number) => (
                                                             <td key={sIdx} className={clsx(
                                                                 "px-4 py-3 text-center text-xs font-medium border-r border-white/5 last:border-r-0",
                                                                 isAllZeros ? "text-red-400/60" : "text-grey-medium"
                                                             )}>
                                                                 {s.score !== null ? s.score : <span className="opacity-20">-</span>}
                                                             </td>
                                                         ))}
                                                     </tr>
                                                 );
                                             })}
                                         </tbody>
                                     </table>
                                 </div>

                                <div className="flex justify-end gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div className="flex-1 flex items-center gap-2 text-grey-medium">
                                        <InfoIcon size={14} className="text-primary" />
                                        <span className="text-[10px] font-medium italic">Cliquez sur "Créer l'évaluation" en bas pour valider tout.</span>
                                    </div>
                                    <Button variant="ghost" onClick={() => setImportStep('mapping')}>Précédent</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default AddEvaluationModal;

/**
 * 1. La fenêtre s'affiche lorsque l'utilisateur veut ajouter une évaluation.
 * 2. Le système récupère tout de suite les réglages de la classe, les périodes et les barèmes existants.
 * 3. L'enseignant remplit le formulaire (titre, date) : les informations sont mémorisées au fur et à mesure de sa frappe.
 * 4a. S'il coche "Détails par question", de nouvelles cases apparaissent. Il peut y ajouter le nombre de questions et leurs points respectifs.
 * 4b. Chaque fois qu'il modifie les points d'une question, le "Total Maximum" de l'examen s'ajuste tout seul par addition.
 * 5. Une fois que l'enseignant clique sur "Créer", le système vérifie qu'il a bien choisi une branche, un groupe, etc.
 * 6. Il scotche tous les morceaux d'information ensemble en un seul paquet et l'envoie à la page principale pour le sauvegarder dans la base.
 * 7. Enfin, le système vide les cases tapées et ferme la fenêtre de dialogue, le processus est terminé.
 */
