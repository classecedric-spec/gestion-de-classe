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
import { Plus, Trash2, ListChecks, Settings2, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useNoteTypes } from '../hooks/useGrades';
import { useBranches } from '../../branches/hooks/useBranches';
import { useGroupsData } from '../../groups/hooks/useGroupsData';
import Select from '../../../core/Select';
import { usePeriods } from '../hooks/usePeriods';

// Définit les éléments extérieurs dont cette fenêtre a besoin pour s'ouvrir et fonctionner correctement de l'extérieur.
interface AddEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any, questions: any[]) => void;
    brancheId?: string;
    groupId?: string;
    periode?: string;
    initialData?: any;
    initialQuestions?: any[];
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
    initialQuestions
}) => {
    // Collecte les informations de connexion de l'utilisateur et les réglages de l'application (barèmes, branches, groupes, périodes).
    const { session } = useAuth();
    const { data: noteTypes = [] } = useNoteTypes();
    const { branches } = useBranches();
    const { periodOptions, loading: loadingPeriods } = usePeriods();
    const { groups } = useGroupsData();

    // Prépare des espaces de brouillon locaux pour stocker les sélections de l'utilisateur si la page principale ne les a pas déjà fournies.
    const [localBrancheId, setLocalBrancheId] = useState<string>(brancheId || '');
    const [localGroupId, setLocalGroupId] = useState<string>(groupId || '');
    const [localPeriode, setLocalPeriode] = useState<string>(periode || 'Trimestre 1');

    // Détermine quelles informations retenir : soit celles forcées par la page, soit celles choisies par l'utilisateur dans la fenêtre.
    const effectiveBrancheId = brancheId || localBrancheId;
    const effectiveGroupId = groupId || localGroupId;
    const effectivePeriode = periode || localPeriode;
    
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

    // Initialisation au chargement de la fenêtre (surtout utile pour la modification)
    useEffect(() => {
        if (isOpen) {
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
        }
    }, [isOpen, initialData, initialQuestions]);

    // Prépare une action pour ajouter une ligne de question supplémentaire si l'enseignant veut détailler son contrôle.
    const handleAddQuestion = () => {
        setQuestions([...questions, { titre: '', note_max: 5, ratio: 1, ordre: questions.length }]);
    };

    // Prépare une action pour effacer une ligne de question si l'enseignant s'est trompé.
    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // Prépare une action pour mettre à jour les informations (texte ou points) à chaque fois que l'enseignant tape au clavier dans une case de question.
    const handleQuestionChange = (index: number, field: string, value: any) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        
        // Calcule automatiquement et additionne le total des points dès qu'on modifie la valeur d'une question.
        if (field === 'note_max' || field === 'ratio') {
            const total = newQuestions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0);
            setNoteMax(total);
        }
        
        // Sauvegarde la liste mise à jour.
        setQuestions(newQuestions);
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
        onSubmit(evaluationData, withQuestions ? questions : []);
        
        // Remet le formulaire à zéro pour effacer les traces de ce qui a été tapé (pour le prochain contrôle) et ferme la fenêtre.
        setTitre('');
        setWithQuestions(false);
        setQuestions([{ titre: '', note_max: 5, ratio: 1, ordre: 0 }]);
        onClose();
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

    // Observe si le barème actuellement choisi par l'enseignant est un système de conversion spécifique (ex: lettres) pour afficher des instructions.
    const activeNoteType = noteTypes.find(nt => nt.id === typeNoteId);
    const isConversion = activeNoteType?.systeme === 'conversion';

    // Construit visuellement toute la boîte de dialogue étape par étape en y plaçant les boutons et champs de texte préparés.
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Modifier l'évaluation" : "Nouvelle Évaluation"}
        >
            <form onSubmit={handleFormSubmit} className="space-y-6">
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ListChecks size={20} className="text-primary" />
                            <span className="font-bold text-grey-dark">Détails par question</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <span className="text-xs font-bold text-grey-medium uppercase tracking-wider group-hover:text-primary transition-colors">
                                Activer
                            </span>
                            <input 
                                type="checkbox" 
                                checked={withQuestions}
                                onChange={(e) => setWithQuestions(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                        </label>
                    </div>

                    {withQuestions && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {questions.length > 0 && (
                                <div className="flex gap-3 px-1 mb-1">
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
                            {questions.map((q, index) => (
                                <div key={index} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <Input
                                            placeholder={`Question ${index + 1}`}
                                            value={q.titre}
                                            onChange={(e) => handleQuestionChange(index, 'titre', e.target.value)}
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
                                        className="mb-1 text-red-400 hover:text-red-600 h-10 w-10 p-0"
                                        disabled={questions.length === 1}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
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
                                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2">
                                    <span className="text-sm font-medium text-grey-dark">Total maximum pondéré :</span>
                                    <span className="text-lg font-bold text-primary">
                                        {questions.reduce((acc, q) => acc + (Number(q.note_max) * Number(q.ratio) || 0), 0)} pts
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/5">
                    <Button variant="ghost" type="button" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button variant="primary" type="submit">
                        {initialData ? "Mettre à jour" : "Créer l'évaluation"}
                    </Button>
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
