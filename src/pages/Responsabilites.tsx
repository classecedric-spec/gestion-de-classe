/**
 * Nom du module/fichier : Responsabilites.tsx
 * 
 * Données en entrée : 
 *   - Liste des responsabilités (via TanStack Query).
 *   - État de l'utilisateur (Session).
 * 
 * Données en sortie : 
 *   - Interface de gestion (CRUD) des métiers de la classe.
 *   - Attribution des élèves aux tâches.
 * 
 * Objectif principal : Fournir à l'enseignant un outil pour organiser la vie de la classe. Il peut créer des "rôles" (ex: 'Rangement des jeux'), assigner des élèves à ces rôles, et supprimer les tâches inutiles. L'interface utilise des "mutations" pour que les changements soient visibles instantanément (mises à jour optimistes).
 * 
 * Ce que ça orchestre : 
 *   - La lecture en temps réel des responsabilités.
 *   - L'ajout rapide d'une nouvelle tâche via le champ en haut à droite.
 *   - L'ouverture d'un sélecteur d'élèves (Modal) pour chaque tâche.
 *   - Le retrait individuel d'un élève d'une mission.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Avatar, Input, SuspenseLoader } from '../core';
import { ClipboardList, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { responsabiliteService, ResponsabiliteWithEleves } from '../features/responsibilities/services/responsabiliteService';
import AddStudentToTaskModal from '../features/responsibilities/components/AddStudentToTaskModal';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { getInitials } from '../lib/helpers';

/**
 * Page de gestion des Responsabilités / Métiers de la classe.
 */
const Responsabilites: React.FC = () => {
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // État pour savoir quelle tâche on est en train de modifier (pour l'assignation)
    const [selectedTask, setSelectedTask] = useState<ResponsabiliteWithEleves | null>(null);

    // État pour l'édition en ligne du titre
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskTitleValue, setEditingTaskTitleValue] = useState('');

    // 1. RÉCUPÉRATION DES DONNÉES : Charge la liste au démarrage
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['responsibilities', session?.user.id],
        queryFn: () => responsabiliteService.getResponsibilities(session!.user.id),
        enabled: !!session?.user.id,
    });

    // 2. MUTATIONS (Actions de modification)
    
    // ACTION : Créer une nouvelle responsabilité
    const createTaskMutation = useMutation({
        mutationFn: (titre: string) => responsabiliteService.createResponsibility(session!.user.id, titre),
        onMutate: async (titre) => {
            const queryKey = ['responsibilities', session?.user.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ResponsabiliteWithEleves[]>(queryKey) || [];

            // Ajout visuel immédiat avant même que le serveur réponde
            const tempTask: ResponsabiliteWithEleves = {
                id: `temp-${Date.now()}`,
                titre,
                user_id: session!.user.id,
                created_at: new Date().toISOString(),
                eleves: []
            };
            queryClient.setQueryData(queryKey, [tempTask, ...previous]);
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error("Erreur lors de la création");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['responsibilities', session?.user.id] });
            setNewTaskTitle('');
            toast.success("Responsabilité créée");
        }
    });

    // ACTION : Supprimer une responsabilité
    const deleteTaskMutation = useMutation({
        mutationFn: (id: string) => responsabiliteService.deleteResponsibility(id),
        onMutate: async (id) => {
            const queryKey = ['responsibilities', session?.user.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ResponsabiliteWithEleves[]>(queryKey) || [];

            queryClient.setQueryData(queryKey, previous.filter(t => t.id !== id));
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error("Erreur lors de la suppression");
        },
        onSuccess: () => {
            toast.success("Responsabilité supprimée");
        }
    });

    // ACTION : Assigner des élèves à une tâche
    const assignMutation = useMutation({
        mutationFn: ({ taskId, eleveIds }: { taskId: string, eleveIds: string[] }) =>
            responsabiliteService.assignStudents(session!.user.id, taskId, eleveIds),
        onMutate: async () => {
            // On bloque les rechargements parasites pendant l'assignation
            const queryKey = ['responsibilities', session?.user.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ResponsabiliteWithEleves[]>(queryKey) || [];
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            // Rollback en cas d'erreur serveur
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error("Erreur lors de l'assignation");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['responsibilities', session?.user.id] });
            toast.success("Élèves assignés");
            setSelectedTask(null);
        },
    });

    // ACTION : Retirer un élève d'une tâche
    const unassignMutation = useMutation({
        mutationFn: (assignmentId: string) => responsabiliteService.unassignStudent(assignmentId),
        onMutate: async (assignmentId) => {
            const queryKey = ['responsibilities', session?.user.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ResponsabiliteWithEleves[]>(queryKey) || [];

            const updated = previous.map(task => ({
                ...task,
                eleves: task.eleves.filter(e => e.id !== assignmentId)
            }));
            queryClient.setQueryData(queryKey, updated);
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error("Erreur lors du retrait");
        },
        onSuccess: () => {
            toast.success("Assignation retirée");
        }
    });

    // ACTION : Modifier le titre d'une responsabilité
    const updateTaskMutation = useMutation({
        mutationFn: ({ id, titre }: { id: string, titre: string }) => responsabiliteService.updateResponsibility(id, titre),
        onMutate: async ({ id, titre }) => {
            const queryKey = ['responsibilities', session?.user.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ResponsabiliteWithEleves[]>(queryKey) || [];

            queryClient.setQueryData(queryKey, previous.map(t => t.id === id ? { ...t, titre } : t));
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toast.error("Erreur lors de la modification");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['responsibilities', session?.user.id] });
            setEditingTaskId(null);
            toast.success("Responsabilité modifiée");
        }
    });

    // GESTIONNAIRES DE FORMULAIRE
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        createTaskMutation.mutate(newTaskTitle.trim());
    };

    const handleDoubleClick = (task: ResponsabiliteWithEleves) => {
        setEditingTaskId(task.id);
        setEditingTaskTitleValue(task.titre);
    };

    const handleSaveEdit = () => {
        if (!editingTaskId) return;
        if (!editingTaskTitleValue.trim()) {
            setEditingTaskId(null);
            return;
        }

        const task = tasks.find(t => t.id === editingTaskId);
        if (task && task.titre === editingTaskTitleValue.trim()) {
            setEditingTaskId(null);
            return;
        }

        updateTaskMutation.mutate({ id: editingTaskId, titre: editingTaskTitleValue.trim() });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') setEditingTaskId(null);
    };

    // Filtrage visuel de la table
    const filteredTasks = tasks.filter(task =>
        task.titre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) return <SuspenseLoader />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 1. Barre d'en-tête (Titre + Ajout rapide) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ClipboardList className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Responsabilités</h1>
                        <p className="text-grey-medium">Attribuez des rôles et tâches aux élèves</p>
                    </div>
                </div>

                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                    <Input
                        placeholder="Nouvelle tâche (ex: Facteur)..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full md:w-64"
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                        icon={Plus}
                    >
                        Ajouter
                    </Button>
                </form>
            </div>

            {/* 2. Tableau Principal */}
            <Card variant="glass" className="overflow-hidden border-none shadow-premium">
                {/* Barre de recherche interne au tableau */}
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-grey-medium" />
                        <input
                            type="text"
                            placeholder="Filtrer les tâches..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0 placeholder:text-grey-dark w-48 md:w-64"
                        />
                    </div>
                    <div className="text-xs font-medium text-grey-medium uppercase tracking-widest hidden md:block">
                        Total : {filteredTasks.length} tâches
                    </div>
                </div>

                {/* Contenu : Grille ou Message vide */}
                {filteredTasks.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="p-4 bg-white/5 rounded-full mb-4">
                            <ClipboardList className="w-12 h-12 text-grey-dark" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Aucune responsabilité</h3>
                        <p className="text-grey-medium max-w-xs mx-auto">
                            Commencez par ajouter une tâche pour organiser votre classe.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-card-bg/50 text-xs font-bold text-grey-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 w-1/3">Tâche / Responsabilité</th>
                                    <th className="px-6 py-4">Élèves Assignés</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTasks.map((task) => (
                                    <tr key={task.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-1">
                                                {editingTaskId === task.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingTaskTitleValue}
                                                        onChange={(e) => setEditingTaskTitleValue(e.target.value)}
                                                        onBlur={handleSaveEdit}
                                                        onKeyDown={handleKeyDown}
                                                        className="bg-white/10 border border-primary/50 text-white text-lg font-bold rounded px-2 py-0.5 focus:ring-1 focus:ring-primary outline-none"
                                                    />
                                                ) : (
                                                    <span
                                                        onDoubleClick={() => handleDoubleClick(task)}
                                                        className="text-lg font-bold text-white group-hover:text-primary transition-colors cursor-pointer"
                                                        title="Double-cliquez pour modifier"
                                                    >
                                                        {task.titre}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-grey-dark font-medium uppercase tracking-tighter">
                                                    Créé le {new Date(task.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-wrap gap-2 min-h-[44px]">
                                                {/* Liste des enfants sous forme de badges (Chips) */}
                                                {task.eleves && task.eleves.length > 0 ? (
                                                    task.eleves.map((assignment) => (
                                                        <div
                                                            key={assignment.id}
                                                            className="flex items-center gap-2 bg-white/5 pl-1 pr-2 py-1 rounded-full group/chip hover:bg-white/10 transition-all border border-white/5"
                                                        >
                                                            <Avatar
                                                                size="xs"
                                                                initials={getInitials(assignment.eleve as any)}
                                                                src={assignment.eleve.photo_url}
                                                            />
                                                            <span className="text-sm font-medium text-white pr-1">
                                                                {assignment.eleve.prenom} {assignment.eleve.nom}
                                                            </span>
                                                            <button
                                                                onClick={() => unassignMutation.mutate(assignment.id)}
                                                                className="p-0.5 hover:bg-danger/20 rounded-full text-grey-medium hover:text-danger transition-colors"
                                                                title="Retirer"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-grey-dark italic py-2">
                                                        Aucun élève assigné
                                                    </span>
                                                )}

                                                {/* Bouton pour ouvrir la sélection d'élèves */}
                                                <button
                                                    onClick={() => setSelectedTask(task)}
                                                    className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full transition-all border border-primary/20 hover:border-primary/50"
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                    Assigner
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right align-top">
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Supprimer la tâche "${task.titre}" ?`)) {
                                                        deleteTaskMutation.mutate(task.id);
                                                    }
                                                }}
                                                className="p-2 text-grey-dark hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                title="Supprimer la tâche"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* FENÊTRES SURGISSANTES (MODALES) */}
            {selectedTask && (
                <AddStudentToTaskModal
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    taskTitle={selectedTask.titre}
                    alreadyAssignedIds={selectedTask.eleves.map(e => e.eleve_id)}
                    onSelect={(eleveIds) => assignMutation.mutate({ taskId: selectedTask.id, eleveIds })}
                />
            )}
        </div>
    );
};

export default Responsabilites;

/**
 * LOGIGRAMME DE PAGE :
 * 
 * 1. CHARGEMENT -> La page liste tous les métiers configurés par l'enseignant.
 * 2. CRÉATION -> L'enseignant tape le nom d'un métier et valide. Le métier apparaît immédiatement (effet miroir).
 * 3. ASSIGNATION -> L'enseignant clique sur "Assigner" dans une ligne.
 * 4. CHOIX -> Une fenêtre s'ouvre pour choisir les enfants.
 * 5. VALIDATION -> Les enfants choisis apparaissent sous forme de badges ronds à côté du métier.
 * 6. RETRAIT -> L'enseignant clique sur la croix d'un badge pour libérer un élève de sa mission.
 */
