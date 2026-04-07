/**
 * Nom du module/fichier : StudentDetailsInfos.tsx
 * 
 * Données en entrée : L'élève sélectionné, les matières (branches), et les réussites de l'élève.
 * 
 * Données en sortie : Un affichage détaillé des informations administratives et scolaires de l'élève.
 * 
 * Objectif principal : Présenter la "fiche de renseignement" complète de l'élève ainsi que son profil de réussite. C'est ici que l'enseignant voit l'âge de l'élève, ses parents, l'équipe enseignante qui l'encadre, et qu'il peut ajuster manuellement les pourcentages de réussite par matière (les indices de branche).
 * 
 * Ce que ça affiche : Des sections d'information claires (Parcours, Responsables) et une grille de jauges de performance éditables.
 */

import React from 'react';
import { BookOpen, Layers, Calendar, ShieldCheck, User as UserIcon, GitBranch, Activity } from 'lucide-react';
import { InfoSection, InfoRow, Badge } from '../../../../core';
import { calculateAge } from '../../../../lib/helpers';

interface StudentDetailsInfosProps {
    student: any;
    branches: any[];
    studentIndices: Record<string, any>;
    onUpdateImportance: (val: string) => void;
    onUpdateBranchIndex: (studentId: string, branchId: string, val: string) => void;
}

export const StudentDetailsInfos: React.FC<StudentDetailsInfosProps> = ({
    student,
    branches,
    studentIndices,
    onUpdateImportance,
    onUpdateBranchIndex
}) => {
    return (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Parcours Scolaire */}
            {/* Affiche les données de base : quelle classe, quel niveau, et surtout l'âge calculé automatiquement à partir de la date de naissance. */}
            <InfoSection title="Parcours Scolaire">
                <InfoRow
                    icon={BookOpen}
                    value={student.Classe?.nom || 'Non affecté'}
                />
                <InfoRow
                    icon={Layers}
                    value={student.Niveau?.nom || 'Non renseigné'}
                />
                <InfoRow
                    icon={Calendar}
                    value={calculateAge(student.date_naissance)}
                />
            </InfoSection>

            {/* Informations & Responsables */}
            {/* Regroupe les contacts : qui sont les parents et quels sont les autres enseignants qui interviennent auprès de cet élève. */}
            <InfoSection title="Informations & Responsables">
                <InfoRow
                    icon={ShieldCheck}
                    label="Équipe Enseignante"
                    value={
                        <div className="space-y-1 mt-1">
                            {(student.Classe?.ClasseAdulte?.length || 0) > 0 ? (
                                student.Classe?.ClasseAdulte?.map((ca: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <p className="text-text-main font-bold truncate">{ca.Adulte.prenom} {ca.Adulte.nom}</p>
                                        <Badge
                                            variant={ca.role === 'principal' ? 'primary' : 'default'}
                                            size="xs"
                                            style="outline"
                                        >
                                            {ca.role === 'principal' ? 'Titulaire' : ca.role === 'coenseignant' ? 'Co-Ens.' : 'Support'}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-main font-bold italic opacity-50">Aucun membre assigné</p>
                            )}
                        </div>
                    }
                />
                <InfoRow
                    icon={UserIcon}
                    label="Parents"
                    value={student.nom_parents || [
                        `${student.parent1_prenom} ${student.parent1_nom}`,
                        `${student.parent2_prenom} ${student.parent2_nom}`
                    ].filter((p: string) => p.trim() !== "").join(' & ') || 'Non renseignés'}
                />
            </InfoSection>

            {/* Branch Indices */}
            <div className="md:col-span-2">
                {/* Tableau de bord des réussites : permet au professeur de noter manuellement l'avancement global de l'élève ainsi que ses progrès spécifiques dans chaque matière (ex: 75% en Français). */}
                <InfoSection title="Indices de Branche (Performance)" columns={2}>
                    <InfoRow
                        icon={Activity}
                        label="Global"
                        value={student.importance_suivi ?? ''}
                        onChange={(val) => onUpdateImportance(val)}
                        placeholder="50"
                        editable
                        suffix="%"
                    />
                    {branches.map(branch => (
                        <InfoRow
                            key={branch.id}
                            icon={GitBranch}
                            label={branch.nom}
                            value={studentIndices[student.id]?.[branch.id] ?? ''}
                            onChange={(val) => onUpdateBranchIndex(student.id, branch.id, val)}
                            placeholder="50"
                            editable
                            suffix="%"
                        />
                    ))}
                </InfoSection>
            </div>
        </div>
    );
};

/**
 * 1. Le professeur clique sur l'onglet "Informations" d'un élève.
 * 2. Le composant `StudentDetailsInfos` récupère les données de l'élève.
 * 3. Il calcule l'âge en temps réel.
 * 4. Il va chercher la liste des enseignants affectés à la classe de cet élève.
 * 5. Si l'enseignant veut modifier un score (ex: passer les Maths à 80%) :
 *    a. Il clique sur le chiffre.
 *    b. Il tape la nouvelle valeur.
 *    c. Le système enregistre instantanément le changement.
 * 6. Toutes les informations sont disposées sur deux colonnes pour une lecture facile sur grand écran.
 */
