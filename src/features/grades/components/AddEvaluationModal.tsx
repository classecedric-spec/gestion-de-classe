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

import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from '../../../core';
import { Trash2, Plus, Settings2, ListChecks, FileText, ArrowRightLeft, GripVertical, Check, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNoteTypes } from '../hooks/useGrades';
import { useBranches } from '../../branches/hooks/useBranches';
import { useGroupsData } from '../../groups/hooks/useGroupsData';
import Select from '../../../core/Select';
import { usePeriods } from '../hooks/usePeriods';
import { clsx } from 'clsx';

// Définit les éléments extérieurs dont cette fenêtre a besoin pour s'ouvrir et fonctionner correctement de l'extérieur.
interface AddEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, questions: any[], regroupements?: any[]) => void;
    brancheId?: string;
    groupId?: string;
    periode?: string;
    initialData?: any;
    initialQuestions?: any[];
    initialRegroupements?: any[];
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
    initialRegroupements
}) => {
    // Collecte les informations de connexion de l'utilisateur et les réglages de l'application (barèmes, branches, groupes, périodes).
    const { session } = useAuth();
    const { data: noteTypes = [] } = useNoteTypes();
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
    const [questions, setQuestions] = useState<any[]>([{ titre: '', note_max: 5, ratio: 1, ordre: 0 }]);
    const [scratchpad, setScratchpad] = useState('');
    const [associerAussi, setAssocierAussi] = useState(false);
    const [associations, setAssociations] = useState<any[]>([
        { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
    ]);

    // Utilise une référence pour savoir si on vient d'ouvrir la fenêtre ou si l'ID du contrôle a changé.
    // Cela évite d'effacer ce que le prof est en train de taper si le parent (Grades.tsx) se rafraîchit.
    const lastInitializedIdRef = React.useRef<string | null | undefined>(undefined);

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
    const updateNoteMax = (currentQuestions: any[]) => {
        const total = currentQuestions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0);
        setNoteMax(total);
    };

    // Prépare une action pour ajouter une ligne de question supplémentaire si l'enseignant veut détailler son contrôle.
    const handleAddQuestion = () => {
        const newQuestions = [...questions, { titre: '', note_max: 5, ratio: 1, ordre: questions.length }];
        setQuestions(newQuestions);
        updateNoteMax(newQuestions);
    };

    // Prépare une action pour effacer une ligne de question si l'enseignant s'est trompé.
    const handleRemoveQuestion = (index: number) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        updateNoteMax(newQuestions);
    };

    // Prépare une action pour mettre à jour les informations (texte ou points) à chaque fois que l'enseignant tape au clavier dans une case de question.
    const handleQuestionChange = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        
        // Calcule automatiquement et additionne le total des points dès qu'on modifie la valeur d'une question.
        if (field === 'note_max' || field === 'ratio') {
            updateNoteMax(newQuestions);
        }
        
        // Sauvegarde la liste mise à jour.
        setQuestions(newQuestions);
    };

    const handleAddAssociation = () => {
        setAssociations([
            ...associations,
            { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
        ]);
    };

    const handleRemoveAssociation = (id: string) => {
        if (associations.length > 1) {
            setAssociations(associations.filter(a => a.id !== id));
        } else {
            // Just clear the first one instead of deleting if it's the last one
            setAssociations([{ id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }]);
        }
    };

    // Prépare l'action finale de validation lorsque l'enseignant clique sur "Créer l'évaluation".
    const handleFormSubmit = (e: React.FormEvent) => {
        // Empêche la page web de se recharger brusquement comme elle le ferait par défaut avec un formulaire.
        e.preventDefault();
        
        // Vérifie qu'on sait bien qui est connecté et pour quelle classe/branche l'évaluation est faite avant de continuer.
        const userId = session?.user?.id;
        if (!userId || !effectiveBrancheId || !effectiveGroupId || !effectivePeriode) return;

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
        setQuestions([{ titre: '', note_max: 5, ratio: 1, ordre: 0 }]);
        setScratchpad('');
        setAssociations([
            { id: `temp_${Math.random().toString(36).substr(2, 9)}`, label: '', slots: [null, null, null, null], isSuggested: false }
        ]);
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

    const calculateAssociationTotal = (slots: (number | null)[]) => {
        return slots.reduce((acc: number, qIdx: number | null) => {
            if (qIdx === null) return acc;
            const q = questions[qIdx - 1];
            if (!q) return acc;
            return acc + (Number(q.note_max) * Number(q.ratio) || 0);
        }, 0);
    };

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
    const activeNoteType = noteTypes.find(nt => nt.id === typeNoteId);
    const isConversion = activeNoteType?.systeme === 'conversion';

    // Construit visuellement toute la boîte de dialogue étape par étape en y plaçant les boutons et champs de texte préparés.
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
                    <Button variant="primary" type="submit" form="add-evaluation-form">
                        {initialData ? "Mettre à jour" : "Créer l'évaluation"}
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
                            options={[
                                { value: '', label: 'Sélectionner...' },
                                ...branches.map(b => ({ value: b.id, label: b.nom }))
                            ]}
                        />
                        <Select
                            label="Groupe"
                            value={localGroupId}
                            onChange={(e) => setLocalGroupId(e.target.value)}
                            options={[
                                { value: '', label: 'Sélectionner...' },
                                ...groups.map(g => ({ value: g.id, label: g.nom }))
                            ]}
                        />
                        <Select
                            label="Période"
                            value={localPeriode}
                            onChange={(e) => setLocalPeriode(e.target.value)}
                            options={
                                loadingPeriods
                                    ? [{ value: '', label: 'Chargement...' }]
                                    : periodOptions.length > 0
                                        ? periodOptions
                                        : [{ value: 'Trimestre 1', label: 'Trimestre 1' }]
                            }
                        />
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Titre de l'évaluation"
                            placeholder="ex: Dictée, Contrôle de mathématiques..."
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                        />
                    </div>
                    <Input
                        label="Date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
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
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Select 
                            label="Barème de notation (Optionnel)"
                            value={typeNoteId}
                            onChange={(e) => handleTypeNoteChange(e.target.value)}
                            icon={Settings2}
                            options={[
                                { value: '', label: 'Points personnalisés' },
                                ...noteTypes.map(nt => ({ value: nt.id, label: nt.nom }))
                            ]}
                        />
                        {isConversion && (
                            <p className="mt-2 text-[10px] text-amber-500 font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                                Info: Le maximum ci-dessus servira de base pour la conversion en lettres (%)
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-border/5">
                    <div className="flex items-center mb-4">
                        <div className="flex items-center gap-2">
                            <ListChecks size={20} className="text-primary" />
                            <span className="font-bold text-grey-dark">Détails par question</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group ml-[50px]">
                            <span className="text-[10px] font-bold text-grey-medium uppercase tracking-wider group-hover:text-primary transition-colors">
                                Activer
                            </span>
                            <input 
                                type="checkbox" 
                                checked={withQuestions}
                                onChange={(e) => setWithQuestions(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
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
                            <div className="mb-6 p-4 bg-amber-500/5 rounded-xl border border-dashed border-amber-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={16} className="text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                        Brouillon temporaire (Zone de copier-coller)
                                    </span>
                                </div>
                                <textarea
                                    placeholder="Collez ici vos textes à copier-coller dans les questions. Ce contenu sera effacé à la fermeture de la fenêtre."
                                    className="w-full h-24 bg-black/20 border border-white/5 rounded-lg p-3 text-sm text-grey-light focus:outline-none focus:border-amber-500/30 transition-all resize-none placeholder:text-grey-medium/30 focus:bg-black/40"
                                    value={scratchpad}
                                    onChange={(e) => setScratchpad(e.target.value)}
                                />
                            </div>

                            {questions.length > 0 && (
                                <div className="flex gap-2 px-1 mb-1">
                                    <div className="w-5 flex-none"></div>
                                    <div className="w-6 flex-none text-center"></div>
                                    <div className="flex-1 text-xs font-medium text-grey-medium uppercase tracking-wider">
                                        Question
                                    </div>
                                    <div className="w-20 text-xs font-medium text-grey-medium uppercase tracking-wider text-center">
                                        Max
                                    </div>
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
                                            "flex gap-2 items-center group p-1 transition-all duration-300 rounded-2xl",
                                            isAssociated && "bg-primary/10 ring-1 ring-primary/20"
                                        )}
                                    >
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
                                        <div className="flex-1 bg-input/40 rounded-xl px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-all">

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
                                            />
                                        </div>
                                        
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
                                                />
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveQuestion(index)}
                                            className="text-red-400 hover:text-red-600 h-10 w-10 p-0"
                                            disabled={questions.length === 1}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
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
                                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
                                    <div className="w-5 flex-none"></div>
                                    <div className="w-6 flex-none"></div>
                                    <div className="flex-1 flex justify-end">
                                        <span className="text-sm font-medium text-grey-dark">Total maximum pondéré :</span>
                                    </div>
                                    <div className="flex-none w-20 text-center">
                                        <span className="text-lg font-bold text-primary whitespace-nowrap">
                        {questions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0)} pts
                                        </span>
                                    </div>
                                    <div className="w-4"></div>
                                    <div className="w-24"></div>
                                    <div className="w-10"></div>
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
