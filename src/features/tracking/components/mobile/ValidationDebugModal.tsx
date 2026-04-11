/**
 * Nom du module/fichier : ValidationDebugModal.tsx
 * 
 * Données en entrée : 
 *   - `studentName` : Le nom de l'élève concerné.
 *   - `action` : Le type de validation effectuée ('valide', 'non_valide', 'status_quo').
 *   - `initialScore`, `finalScore` : L'évolution du score de confiance de l'algorithme.
 *   - `adjustment` : La valeur de changement appliquée (bonus ou malus).
 * 
 * Données en sortie : 
 *   - Une fenêtre modale (pop-up) affichant les "entrailles" du calcul de l'intelligence artificielle.
 * 
 * Objectif principal : Assurer la transparence pédagogique. Le logiciel utilise un algorithme de "Probabilité de contrôle" pour décider quand tester un élève. Cette fenêtre permet à l'enseignant de comprendre *pourquoi* le score de l'élève a bougé suite à sa validation. C'est un outil d'explication de l'IA.
 * 
 * Ce que ça affiche : 
 *   - Un récapitulatif du changement de probabilité (en %).
 *   - Une icône de tendance (flèche qui monte ou qui descend).
 *   - Une phrase d'explication métier (ex: "L'élève maîtrise : La probabilité de contrôle diminue").
 */

import React from 'react';
import { X, Check, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValidationDebugModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    studentName: string;
    action: string; // 'valide', 'non_valide', 'status_quo'
    initialScore: number;
    adjustment: number;
    finalScore: number;
}

/**
 * Fenêtre de diagnostic pour comprendre l'évolution du score de confiance des élèves.
 */
const ValidationDebugModal: React.FC<ValidationDebugModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    studentName,
    action,
    initialScore,
    adjustment,
    finalScore
}) => {
    // Si la fenêtre n'est pas demandée, on ne rend rien.
    if (!isOpen) return null;

    /** 
     * TRADUCTION MÉTIER : 
     * Transforme les codes techniques en mots compréhensibles pour l'enseignant.
     */
    const getActionLabel = () => {
        switch (action) {
            case 'valide': return { label: 'Validation', color: 'text-success', bg: 'bg-success/20' };
            case 'non_valide': return { label: 'Besoin d\'aide', color: 'text-purple-accent', bg: 'bg-purple-accent/20' };
            case 'status_quo': return { label: 'Status Quo', color: 'text-amber-accent', bg: 'bg-amber-accent/20' };
            default: return { label: action, color: 'text-white', bg: 'bg-white/10' };
        }
    };

    const actionInfo = getActionLabel();

    /** 
     * EXPLICATION MÉTIER : 
     * Donne le sens du changement de score.
     */
    const getImpactDescription = () => {
        if (adjustment < 0) return "L'élève maîtrise : La probabilité de contrôle diminue.";
        if (adjustment > 0) return "L'élève a du mal : La probabilité de contrôle augmente.";
        return "Aucun changement sur la fréquence de contrôle.";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* EN-TÊTE : Titre de la fenêtre de diagnostic */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Activity size={18} className="text-primary" />
                        Diagnostic de Validation
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-grey-medium">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* CONTEXTE : Quel élève et quelle action */}
                    <div className="text-center">
                        <p className="text-grey-medium text-sm mb-1">Élève concerné</p>
                        <h2 className="text-xl font-bold text-white">{studentName}</h2>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${actionInfo.bg} ${actionInfo.color}`}>
                            {actionInfo.label}
                        </div>
                    </div>

                    {/* DÉTAIL DU CALCUL : Le "Cerveau" de l'algorithme rendu visible */}
                    <div className="bg-background rounded-xl p-4 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-grey-medium">Probabilité de contrôle avant</span>
                            <span className="font-mono font-bold text-white">{initialScore.toFixed(0)}%</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-grey-medium">Ajustement algorithmique</span>
                            <div className={`font-mono font-bold flex items-center gap-1 ${adjustment > 0 ? 'text-danger' : adjustment < 0 ? 'text-success' : 'text-grey-medium'}`}>
                                {adjustment > 0 ? <TrendingUp size={14} /> : adjustment < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                                {adjustment > 0 ? '+' : ''}{adjustment}%
                            </div>
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Nouvelle Probabilité</span>
                            <span className={`font-mono text-xl font-bold ${adjustment > 0 ? 'text-danger' : 'text-success'}`}>
                                {finalScore.toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {/* TRADUCTION PÉDAGOGIQUE */}
                    <div className="text-xs text-center text-grey-medium italic px-4">
                        "{getImpactDescription()}"
                    </div>
                </div>

                {/* BAS DE FENÊTRE : Validation finale */}
                <div className="p-4 bg-background/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-grey-medium hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-black bg-white hover:bg-grey-light transition-colors flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ValidationDebugModal;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant valide un exercice de maths pour Marc.
 * 2. CALCUL : L'IA détecte que Marc a réussi avec brio. Elle estime que Marc n'a plus besoin d'être contrôlé aussi souvent sur ce sujet.
 * 3. AFFICHAGE : Cette fenêtre surgit pour expliquer à l'adulte : "Le score de probabilité de contrôle de Marc passe de 50% à 30%".
 * 4. COMPRÉHENSION : L'enseignant comprend que Marc sera moins sollicité par le tirage au sort automatique à l'avenir.
 * 5. VALIDATION : L'adulte clique sur "Enregistrer" pour confirmer qu'il est d'accord avec cette analyse de l'algorithme.
 */
