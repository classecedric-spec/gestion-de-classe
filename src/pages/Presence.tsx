/**
 * Nom du module/fichier : Presence.tsx
 * 
 * Données en entrée : 
 *   - Liste des élèves et des classes (via le Hook `useAttendance`).
 *   - Dates et périodes (Matin/Après-midi).
 *   - Configuration des types d'appels (Matin, Cantine, Étude, etc.).
 * 
 * Données en sortie : 
 *   - Une interface interactive de type "Tableau Blanc" avec des colonnes.
 *   - Des actions d'enregistrement des présences en temps réel.
 * 
 * Objectif principal : Offrir la page maîtresse pour faire l'appel en classe. L'enseignant voit tout son effectif d'un coup. Il peut faire l'appel de manière ludique en faisant glisser les photos des élèves dans les colonnes correspondantes (ex: glisser 'Léa' dans la colonne 'Cantine'). La page gère aussi l'historique et l'impression des rapports PDF.
 * 
 * Ce que ça affiche : 
 *   - En haut : le sélecteur de date, le choix "Matin / Après-midi" et l'accès aux réglages.
 *   - À gauche : les élèves qui n'ont pas encore été pointés ("Non assignés").
 *   - Au centre : les différentes colonnes de présence colorées.
 */

import React, { useState } from 'react';
// Force reload to resolve ReferenceError
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, Button, EmptyState } from '../core';
import PageLayout from '../components/layout/PageLayout';

import useAttendance from '../features/attendance/hooks/useAttendance';
import AttendanceStudentCard from '../features/attendance/components/AttendanceStudentCard';
import AttendanceColumn from '../features/attendance/components/AttendanceColumn';
import AttendanceConfigModal from '../features/attendance/components/AttendanceConfigModal';
import { Student } from '../features/attendance/services/attendanceService';

/**
 * Composant de page pour la gestion quotidienne des appels.
 */
const Presence: React.FC = () => {
    // On extrait toute la "mécanique" (données et actions) du Hook spécialisé
    const {
        // État de l'application
        groups, selectedGroup, setSelectedGroup,
        setups, selectedSetup, setSelectedSetup,
        categories,
        attendances,
        students,
        currentDate, setCurrentDate,
        currentPeriod, setCurrentPeriod,
        loading, isInitialLoading, error,
        isSetupLocked,
        refreshData,
        unlockEditing,

        // Actions déclenchables par l'enseignant
        moveStudent,
        markUnassignedAbsent,
        markUnassignedPresent,

        // Outils de filtrage des données
        getStudentsForCategory,
        getUnassignedStudents,
    } = useAttendance();

    // États locaux pour l'affichage des fenêtres surgissantes (Modales)
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState<Student | null>(null);

    // Configuration des capteurs pour le "Glisser-Déposer" (supporte Souris et Écrans Tactiles)
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }), // Évite les déplacements accidentels
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }) // Appui long sur tablette
    );

    /**
     * DÉBUT DU GLISSEMENT : Mémorise quel élève est en train d'être déplacé pour afficher sa photo sous le curseur.
     */
    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current) {
            setActiveDragItem(event.active.data.current.student);
        }
    };

    /**
     * FIN DU GLISSEMENT : Détermine où l'élève a été "déposé" et déclenche la sauvegarde.
     */
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null); // On efface la photo sous le curseur

        if (!over) return; // Si déposé en dehors d'une colonne, on ne fait rien

        const studentId = active.id as string;
        const targetId = over.id as string; // C'est l'ID de la colonne de destination (ex: 'Absent')

        // Cas particulier : si déposé sur la zone 'Absent' mais qu'elle est virtuelle
        if (targetId === 'absent') {
            const absentCat = categories.find(c => c.nom === 'Absent');
            if (absentCat) {
                await moveStudent(studentId, absentCat.id);
            } else {
                toast.error("Catégorie 'Absent' introuvable");
            }
        } else {
            // Sauvegarde classique dans la catégorie choisie
            await moveStudent(studentId, targetId);
        }
    };

    // Gestion des cas d'erreur ou d'absence de données initiales
    if (error) {
        return <div className="p-10 text-center text-red-500">Erreur: {error}</div>;
    }

    if (isInitialLoading) {
        return (
            <PageLayout
                leftContent={
                    <div className="z-10 truncate pr-4 pl-20">
                        <div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg mb-2" />
                        <div className="h-4 w-32 bg-white/5 animate-pulse rounded-lg" />
                    </div>
                }
                centerContent={null}
                rightContent={null}
                containerClassName="p-6"
            >
                <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-primary/20 rounded-full animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Chargement de votre classe</h3>
                        <p className="text-grey-medium animate-pulse">Préparation du tableau d'appel...</p>
                    </div>
                </div>
            </PageLayout>
        );
    }

    if (!selectedGroup && !loading && groups.length === 0) {
        return <div className="p-10 text-center text-grey-medium">Aucun groupe trouvé. Veuillez configurez vos classes.</div>;
    }

    const trulyUnassigned = getUnassignedStudents();

    /**
     * Tri les élèves par ordre du niveau (Niveau.ordre ou Niveau.nom) puis par prénom.
     */
    const sortStudents = (list: any[]) => {
        return [...list].sort((a, b) => {
            const niveauA = a.Niveau;
            const niveauB = b.Niveau;
            // Tri par ordre du niveau, puis par nom du niveau, puis par prénom
            const ordreA = niveauA?.ordre ?? 9999;
            const ordreB = niveauB?.ordre ?? 9999;
            if (ordreA !== ordreB) return ordreA - ordreB;
            const nomNiveauA = niveauA?.nom ?? '';
            const nomNiveauB = niveauB?.nom ?? '';
            if (nomNiveauA !== nomNiveauB) return nomNiveauA.localeCompare(nomNiveauB, 'fr');
            return a.prenom.localeCompare(b.prenom, 'fr');
        });
    };

    /**
     * Groupe les élèves par niveau et retourne un tableau de { levelName, students }.
     */
    const groupByLevel = (list: any[]) => {
        const sorted = sortStudents(list);
        const groups: { levelName: string; students: any[] }[] = [];
        for (const student of sorted) {
            const levelName = student.Niveau?.nom ?? 'Sans niveau';
            const last = groups[groups.length - 1];
            if (last && last.levelName === levelName) {
                last.students.push(student);
            } else {
                groups.push({ levelName, students: [student] });
            }
        }
        return groups;
    };

    const unassignedGroups = groupByLevel(trulyUnassigned);

    // --- CONSTRUCTION DES ÉLÉMENTS DE L'EN-TÊTE ---
    
    // Le sélecteur "Matin / Après-midi"
    const centerContent = (
        <div className="hidden md:block">
            <Tabs
                tabs={[
                    { id: 'matin', label: 'Matin' },
                    { id: 'apres_midi', label: 'Après-midi' }
                ]}
                activeTab={currentPeriod}
                onChange={(id) => setCurrentPeriod(id as 'matin' | 'apres_midi')}
                level={3}
                className="min-w-[200px]"
                disableCompact={true}
                smart
            />
        </div>
    );

    // Le bouton de réglages et le choix de la date
    const rightContent = (
        <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-white/5 shadow-sm h-[52px] group transition-all duration-300 hover:border-primary/20">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2 aspect-square h-full"
                        icon={Settings}
                        title="Configuration"
                    />
                    <div className="w-px h-6 bg-white/10 mx-1" />
                </div>

                <div className="relative h-full flex items-center">
                    <label htmlFor="presence-date-picker" className="sr-only">Date</label>
                    <input
                        id="presence-date-picker"
                        type="date"
                        title="Sélectionner la date"
                        value={currentDate}
                        onClick={(e: any) => e.target.showPicker && e.target.showPicker()}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="h-full px-3 bg-black/20 border border-white/5 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary/50 font-medium [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer flex items-center"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <PageLayout
            leftContent={
                <div className="z-10 truncate pr-4 pl-20">
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-0.5 truncate drop-shadow-sm">
                        Présence
                    </h1>
                    <p className="text-sm font-medium text-grey-medium truncate opacity-80 uppercase tracking-widest">
                        Gérez les présences et l'organisation de la classe
                    </p>
                </div>
            }
            centerContent={centerContent}
            rightContent={rightContent}
            containerClassName="p-6"
        >
            {/* Sélecteur de période mobile (visible uniquement sur petit écran) */}
            <div className="md:hidden flex justify-center mb-6">
                <Tabs
                    tabs={[
                        { id: 'matin', label: 'Matin' },
                        { id: 'apres_midi', label: 'Après-midi' }
                    ]}
                    activeTab={currentPeriod}
                    onChange={(id) => setCurrentPeriod(id as 'matin' | 'apres_midi')}
                    level={3}
                    fullWidth
                    smart
                />
            </div>

            {/* ZONE PRINCIPALE : LE TABLEAU DE BORD DES APPELS */}
            {selectedSetup ? (
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="h-full flex gap-6 min-h-0 overflow-hidden">

                        {/* COLONNE GAUCHE : ÉLÈVES À POINTer */}
                        <div className="w-1/4 min-w-[280px] flex flex-col gap-4">
                            <div className="flex-1 min-h-0 flex flex-col">
                                <AttendanceColumn
                                    id="unassigned"
                                    title="Non assignés"
                                    count={trulyUnassigned.length}
                                    isUnassigned={true}
                                >
                                    {unassignedGroups.map((group, groupIndex) => (
                                        <React.Fragment key={group.levelName}>
                                            {/* Ligne de séparation entre les niveaux (sauf avant le premier) */}
                                            {groupIndex > 0 && (
                                                <div className="col-span-full my-1 flex items-center gap-2">
                                                    <div className="flex-1 h-px bg-white/8" />
                                                    <span className="text-[10px] font-semibold text-grey-dark/50 uppercase tracking-widest whitespace-nowrap">{group.levelName}</span>
                                                    <div className="flex-1 h-px bg-white/8" />
                                                </div>
                                            )}
                                            {group.students.map(student => (
                                                <AttendanceStudentCard
                                                    key={student.id}
                                                    student={student}
                                                    disabled={isSetupLocked}
                                                />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </AttendanceColumn>
                            </div>

                            {/* Boutons d'action rapide pour terminer l'appel en un clic */}
                            {trulyUnassigned.length > 0 && !isSetupLocked && (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={markUnassignedPresent}
                                        variant="secondary"
                                        className="w-full hover:text-emerald-500 hover:border-emerald-500/30 group"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-pulse" />
                                        Marquer restants comme présents
                                    </Button>
                                    <Button
                                        onClick={markUnassignedAbsent}
                                        variant="secondary"
                                        className="w-full hover:text-danger hover:border-danger/30 group"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-danger group-hover:animate-pulse" />
                                        Marquer restants comme absents
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* ZONE DE DROITE : GRILLE DES STATUTS (Colonnes Présents, Absents, Cantine, etc.) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl p-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-20">
                                {categories.map(cat => {
                                    const catStudents = getStudentsForCategory(cat.id);
                                    const catGroups = groupByLevel(catStudents);

                                    return (
                                        <div key={cat.id} className="h-[300px] min-h-[300px]">
                                            <AttendanceColumn
                                                id={cat.id}
                                                title={cat.nom}
                                                color={cat.couleur ?? undefined}
                                                count={catStudents.length}
                                            >
                                                {catGroups.map((group, groupIndex) => (
                                                    <React.Fragment key={group.levelName}>
                                                        {groupIndex > 0 && (
                                                            <div className="col-span-full my-1 flex items-center gap-2">
                                                                <div className="flex-1 h-px bg-white/8" />
                                                                <span className="text-[10px] font-semibold text-grey-dark/50 uppercase tracking-widest whitespace-nowrap">{group.levelName}</span>
                                                                <div className="flex-1 h-px bg-white/8" />
                                                            </div>
                                                        )}
                                                        {group.students.map(student => (
                                                            <AttendanceStudentCard
                                                                key={student.id}
                                                                student={student}
                                                                currentStatus={{ status: 'present' }}
                                                                disabled={isSetupLocked}
                                                            />
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </AttendanceColumn>
                                        </div>
                                    );
                                })}

                                {categories.length === 0 && (
                                    <EmptyState
                                        title="Aucune catégorie"
                                        description="Aucune catégorie configurée pour ce setup."
                                        size="sm"
                                        className="col-span-full py-12"
                                    />
                                )}
                            </div>
                        </div>

                    </div>

                    {/* L'image fantôme qui suit la souris pendant le glissement */}
                    <DragOverlay>
                        {activeDragItem ? (
                            <AttendanceStudentCard student={activeDragItem} isOverlay />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            ) : (
                /* ÉTAT : AUCUNE CONFIGURATION CHOISIE */
                <EmptyState
                    title="Configuration requise"
                    description="Sélectionnez ou créez une configuration pour commencer à gérer les présences."
                    action={
                        <Button onClick={() => setIsConfigOpen(true)}>
                            Configurer
                        </Button>
                    }
                    className="flex-1"
                />
            )}

            {/* Fenêtre surgissante des réglages (Modal) */}
            <AttendanceConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                groups={groups}
                selectedGroup={selectedGroup}
                onSelectGroup={(group) => setSelectedGroup(group || null)}
                setups={setups}
                selectedSetup={selectedSetup}
                onSelectSetup={setSelectedSetup}
                isSetupLocked={isSetupLocked}
                onUnlockEditing={unlockEditing}
                onConfigSaved={refreshData}
                activeCategories={categories}
                studentsForExport={students}
                currentDateForExport={currentDate}
            />
        </PageLayout>
    );
};

export default Presence;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant arrive sur la page "Présence" (par défaut à la date du jour).
 * 2. Il voit sa classe dans la colonne de gauche (Section "Non assignés").
 * 3. Il commence l'appel :
 *    - Pour 'Sophie', il fait glisser sa photo vers la colonne 'Cantine'.
 *    - Pour les autres, il clique sur "Marquer restants comme présents".
 * 4. À chaque action :
 *    - L'interface se met à jour immédiatement (Sophie change de colonne).
 *    - Le système enregistre l'information dans la base de données.
 * 5. S'il veut faire une modification après coup :
 *    - Il déplace à nouveau les cartes.
 *    - Ou il clique sur "Réactiver l'édition" pour modifier les paramètres globaux.
 */
