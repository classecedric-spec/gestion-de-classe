/**
 * Nom du module/fichier : StudentParentsInfo.tsx
 * 
 * Données en entrée : Les informations de l'élève en cours (spécifiquement les données parents).
 * 
 * Données en sortie : Une interface de saisie regroupant les coordonnées des parents ou tuteurs.
 * 
 * Objectif principal : Gérer la saisie des contacts familiaux (l'onglet "Parents"). Il permet d'enregistrer les noms, prénoms et adresses e-mail d'un ou deux parents, afin de faciliter la communication (envois de bilans, notifications).
 * 
 * Ce que ça affiche : Deux blocs distincts ("Parent 1" et "Parent 2") avec des champs de texte pour le nom, le prénom et l'e-mail.
 */

import React from 'react';
import { User } from 'lucide-react';
import { StudentFormState } from '../hooks/useStudentForm';

export interface StudentParentsInfoProps {
    student: StudentFormState;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const StudentParentsInfo: React.FC<StudentParentsInfoProps> = ({ student, handleInputChange }) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parent 1 */}
                {/* Bloc du premier contact : généralement le responsable légal principal. */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Parent 1 (Principal)
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Prénom</label>
                            {/* Champs de saisie stylisés : fond sombre et bordures claires pour rester cohérent avec le design premium de l'application. */}
                            <input
                                type="text"
                                name="parent1_prenom"
                                title="Prénom du parent 1"
                                placeholder="Prénom"
                                value={student.parent1_prenom}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Nom</label>
                            <input
                                type="text"
                                name="parent1_nom"
                                title="Nom du parent 1"
                                placeholder="Nom"
                                value={student.parent1_nom}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                        <input
                            type="email"
                            name="parent1_email"
                            title="Email du parent 1"
                            placeholder="Email"
                            value={student.parent1_email}
                            onChange={handleInputChange}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Parent 2 */}
                {/* Bloc secondaire : permet d'ajouter un second contact (conjoint, autre parent) de manière optionnelle. */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Parent 2 (Optionnel)
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Prénom</label>
                            <input
                                type="text"
                                name="parent2_prenom"
                                title="Prénom du parent 2"
                                placeholder="Prénom"
                                value={student.parent2_prenom}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Nom</label>
                            <input
                                type="text"
                                name="parent2_nom"
                                title="Nom du parent 2"
                                placeholder="Nom"
                                value={student.parent2_nom}
                                onChange={handleInputChange}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Email</label>
                        <input
                            type="email"
                            name="parent2_email"
                            title="Email du parent 2"
                            placeholder="Email"
                            value={student.parent2_email}
                            onChange={handleInputChange}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentParentsInfo;

/**
 * 1. Le professeur bascule sur l'onglet "Parents".
 * 2. Le composant affiche les deux zones de saisie.
 * 3. L'enseignant remplit au moins les coordonnées du premier parent.
 * 4. Si les parents sont séparés ou s'il y a deux tuteurs, il remplit la seconde zone.
 * 5. Chaque modification est transmise instantanément au formulaire principal via `handleInputChange`.
 * 6. Les données sont validées lors de l'enregistrement final de la fiche élève.
 */
