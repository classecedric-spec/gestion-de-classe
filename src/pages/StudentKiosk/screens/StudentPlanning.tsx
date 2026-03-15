import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, RotateCcw, ChevronRight, Check, AlertTriangle, Home, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useStudentPlanningData, PlanningActivity, PlanningStatus } from '../hooks/useStudentPlanningData';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const JOURS_COURTS = ['L', 'Ma', 'Me', 'J', 'V'];

type Step = 'status' | 'homework' | 'weekwork' | 'summary';

const StudentPlanning: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const [step, setStep] = useState<Step>('status');

    const [showValidationErrors, setShowValidationErrors] = useState(false);
    const [onlyShowUnassigned, setOnlyShowUnassigned] = useState(false);
    const {
        student, loading, saving, kioskPlanningOpen,
        choices, overdueActivities, weekActivities,
        homeworkActivities,
        overdueModules, weekModules,
        homeworkModules, weekworkModules,
        setChoice, toggleLieu, toggleStatut, savePlanification, refresh,
    } = useStudentPlanningData(studentId);

    // --- LOADING ---
    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p className="text-white font-medium animate-pulse">Chargement de ta planification...</p>
            </div>
        );
    }

    if (!student) return null;

    // --- FERMÉ ---
    if (!kioskPlanningOpen) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-32 h-32 bg-danger/10 rounded-full flex items-center justify-center border-4 border-danger/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-pulse">
                    <CalendarDays size={64} className="text-danger" />
                </div>
                <div className="space-y-4 max-w-md">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                        Planification Fermée
                    </h1>
                    <p className="text-xl text-grey-medium">
                        L'accès à la planification est désactivé pour le moment.
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-bold border border-primary/30 transition-all active:scale-95"
                >
                    <RotateCcw size={20} />
                    <span>Réessayer</span>
                </button>
            </div>
        );
    }

    // Validation étape 2 (devoirs) : tous les devoirs en retard (0 ou 1 carré) doivent avoir un jour
    const allHomeworkAssigned = homeworkActivities.every(a => {
        const choice = choices[a.id];
        return !!choice?.jour;
    });

    const handleGoToWeekWork = () => {
        if (!allHomeworkAssigned && homeworkActivities.length > 0) {
            setShowValidationErrors(true);
            toast.error("Veuillez planifier tous les devoirs en rouge avant de continuer.");
            return;
        }
        setShowValidationErrors(false);
        setStep('weekwork');
    };

    const handleGoToSummary = () => {
        if (!allHomeworkAssigned && homeworkActivities.length > 0) {
            setShowValidationErrors(true);
            setStep('homework'); // Retour forcée à l'étape 1 si problème
            toast.error("Veuillez planifier tous les devoirs en rouge.");
            return;
        }
        setStep('summary');
    };

    const handleSave = async () => {
        const success = await savePlanification();
        if (success) {
            setStep('done' as Step);
        }
    };

    // --- TERMINÉ ---
    if (step === ('done' as Step)) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-500">
                <div className="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                    <Check size={64} className="text-emerald-400" />
                </div>
                <div className="space-y-4 max-w-md">
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                        C'est enregistré !
                    </h1>
                    <p className="text-xl text-grey-medium">
                        Ta planification de la semaine est sauvegardée. Tu peux fermer cette page.
                    </p>
                </div>
            </div>
        );
    }

    // --- Composant cases de statut ---
    const StatusGrid: React.FC<{
        activity: PlanningActivity;
    }> = ({ activity }) => {
        const choice = choices[activity.id];
        const currentStatut = choice?.statut || 'non_demarre';

        const statusOrder: PlanningStatus[] = ['non_demarre', 'demarre', 'fini', 'corrige', 'valide'];
        const currentIndex = statusOrder.indexOf(currentStatut);

        const statusConfigs: { key: PlanningStatus; label: string }[] = [
            { key: 'demarre', label: 'Démarré' },
            { key: 'fini', label: 'Fini' },
            { key: 'corrige', label: 'Corrigé' },
            { key: 'valide', label: 'Validé et encodé' },
        ];

        return (
            <div className="flex items-center gap-1.5 shrink-0">
                {statusConfigs.map((cfg, idx) => {
                    const itemOrder = idx + 1;
                    const isActive = currentIndex >= itemOrder;
                    
                    return (
                        <button
                            key={cfg.key}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleStatut(activity.id, cfg.key);
                            }}
                            title={cfg.label}
                            className={clsx(
                                'w-6 h-6 rounded border-2 transition-all active:scale-90',
                                isActive 
                                    ? 'bg-primary border-white/20 shadow-[0_0_15px_rgba(217,185,129,0.4)] ring-2 ring-primary/20' 
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                            )}
                        />
                    );
                })}
            </div>
        );
    };

    // --- Composant grille de jours inline ---
    const DayGrid: React.FC<{
        activity: PlanningActivity;
        mode: 'homework' | 'weekwork';
    }> = ({ activity, mode }) => {
        const choice = choices[activity.id];

        // L'UI affiche les jours seulement si l'activité n'est pas déjà "validée" ou "corrigée" ?
        // Non, on laisse le choix, mais on peut griser si c'est validé.
        const isLocked = choice?.statut === 'valide';

        return (
            <div className={clsx("flex items-center gap-1.5", isLocked && "opacity-50 pointer-events-none")}>
                {JOURS.map((jour, idx) => {
                    const choice = choices[activity.id];
                    const isSelected = choice?.jour === jour;
                    const lieu = choice?.lieu;
                    const statut = choice?.statut || 'non_demarre';
                    const hasError = showValidationErrors && mode === 'homework' && !choice?.jour && statut !== 'valide';
                    
                    // 2 carrés (fini) -> Vert / Classe
                    const isCorrection = statut === 'fini';

                    let bgClass = 'bg-white/5 border-white/10 hover:bg-white/10';
                    let textClass = 'text-grey-medium';

                    if (isSelected) {
                        if (lieu === 'classe') {
                            bgClass = 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/20';
                            textClass = 'text-white font-black';
                        } else {
                            bgClass = 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/20';
                            textClass = 'text-white font-black';
                        }
                    } else if (hasError) {
                        bgClass = 'bg-danger/10 border-danger/40 animate-pulse';
                        textClass = 'text-danger font-bold';
                    }

                    return (
                        <button
                            key={jour}
                            onClick={() => {
                                if (mode === 'homework') {
                                    if (isSelected) setChoice(activity.id, null, null);
                                    else setChoice(activity.id, jour, isCorrection ? 'classe' : 'domicile');
                                } else {
                                    if (isSelected) toggleLieu(activity.id, jour);
                                    else setChoice(activity.id, jour, isCorrection ? 'classe' : 'classe');
                                }
                            }}
                            className={clsx(
                                'w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90',
                                bgClass
                            )}
                        >
                            <span className={clsx('text-xs md:text-sm font-bold', textClass)}>
                                {JOURS_COURTS[idx]}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    };

    // --- Composant Module avec ses activités ---
    const ModuleBlock: React.FC<{
        moduleNom: string;
        moduleDateFin: string | null;
        activities: PlanningActivity[];
        mode: 'status' | 'homework' | 'weekwork';
        isOverdue?: boolean;
    }> = ({ moduleNom, moduleDateFin, activities: acts, mode, isOverdue }) => (
        <div className={clsx(
            'rounded-2xl border-2 overflow-hidden mb-4',
            isOverdue ? 'border-orange-500/40 bg-orange-500/5' : 'border-white/10 bg-surface/30'
        )}>
            <div className={clsx(
                'px-5 py-3 flex items-center justify-between',
                isOverdue ? 'bg-orange-500/10' : 'bg-white/5'
            )}>
                <h3 className={clsx(
                    'font-bold text-lg',
                    isOverdue ? 'text-orange-400' : 'text-white'
                )}>
                    {moduleNom}
                </h3>
                {moduleDateFin && (
                    <span className={clsx(
                        'text-sm font-medium px-3 py-1 rounded-full border',
                        isOverdue
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                            : 'bg-primary/10 text-primary/70 border-primary/20'
                    )}>
                        {new Date(moduleDateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                )}
            </div>
            <div className="divide-y divide-white/5">
                {acts.map(act => {
                    const choice = choices[act.id];
                    const isValide = choice?.statut === 'valide';
                    const hasError = showValidationErrors && mode === 'homework' && !choice?.jour && !isValide;
                    return (
                        <div 
                            key={act.id} 
                            className={clsx(
                                "px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                                hasError && "bg-danger/5"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {mode === 'status' && <StatusGrid activity={act} />}
                                <span className={clsx(
                                    "font-medium mt-0.5 truncate block",
                                    hasError ? "text-danger" : "text-white"
                                )}>
                                    {act.titre}
                                    {hasError && <span className="ml-2 text-[10px] uppercase font-black tracking-widest bg-danger text-white px-1.5 py-0.5 rounded">Oublié</span>}
                                </span>
                            </div>
                            {mode !== 'status' && <DayGrid activity={act} mode={mode as 'homework' | 'weekwork'} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // --- Résumé ---
    const renderSummary = () => {
        // Structure : { domicile: { Lundi: { "Totem 30": ["Totem 30.1", "Totem 30.2"] } } }
        const grouped: Record<string, Record<string, Record<string, string[]>>> = {
            domicile: {},
            classe: {},
        };

        const allModules = [...overdueModules, ...weekModules];

        Object.values(choices).forEach(c => {
            if (!c.jour || !c.lieu) return;
            const allActs = [...overdueActivities, ...weekActivities];
            const act = allActs.find(a => a.id === c.activite_id);
            if (!act) return;

            // Trouver le module de cette activité
            const module = allModules.find(m => m.activities.some(a => a.id === act.id));
            const moduleName = module ? module.moduleNom : 'Autre';

            if (!grouped[c.lieu][c.jour]) grouped[c.lieu][c.jour] = {};
            if (!grouped[c.lieu][c.jour][moduleName]) grouped[c.lieu][c.jour][moduleName] = [];
            
            grouped[c.lieu][c.jour][moduleName].push(act.titre);
        });

        const renderDayContent = (jourModules: Record<string, string[]> | undefined) => {
            if (!jourModules || Object.keys(jourModules).length === 0) return null;
            
            return (
                <div className="space-y-2">
                    {Object.entries(jourModules).map(([modName, acts], idx) => (
                        <div key={idx} className="pl-4">
                            <p className="text-white font-medium text-sm mb-0.5">{modName}</p>
                            <ul className="pl-3 space-y-0.5 border-l-2 border-white/10">
                                {acts.map((name, i) => (
                                    <li key={i} className="text-white/70 text-sm">{name}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Domicile */}
                <div className="rounded-2xl border-2 border-orange-500/30 bg-orange-500/5 overflow-hidden">
                    <div className="bg-orange-500/10 px-5 py-3 flex items-center gap-3">
                        <Home size={20} className="text-orange-400" />
                        <h3 className="text-lg font-black text-orange-400 uppercase tracking-wide">À domicile</h3>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                        {JOURS.map(jour => {
                            const hasContent = grouped.domicile[jour] && Object.keys(grouped.domicile[jour]).length > 0;
                            if (!hasContent) return null;
                            return (
                                <div key={jour}>
                                    <p className="text-orange-300 font-bold mb-2">{jour}</p>
                                    {renderDayContent(grouped.domicile[jour])}
                                </div>
                            );
                        })}
                        {Object.keys(grouped.domicile).length === 0 && (
                            <p className="text-grey-medium italic">Aucun travail à domicile planifié</p>
                        )}
                    </div>
                </div>

                {/* En classe */}
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                    <div className="bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
                        <CalendarDays size={20} className="text-emerald-400" />
                        <h3 className="text-lg font-black text-emerald-400 uppercase tracking-wide">En classe</h3>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                        {JOURS.map(jour => {
                            const hasContent = grouped.classe[jour] && Object.keys(grouped.classe[jour]).length > 0;
                            if (!hasContent) return null;
                            return (
                                <div key={jour}>
                                    <p className="text-emerald-300 font-bold mb-2">{jour}</p>
                                    {renderDayContent(grouped.classe[jour])}
                                </div>
                            );
                        })}
                        {Object.keys(grouped.classe).length === 0 && (
                            <p className="text-grey-medium italic">Aucun travail en classe planifié</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDU PRINCIPAL ---
    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <div className="shrink-0 p-4 md:p-6 z-10">
                <div className="flex flex-col md:flex-row items-center md:justify-between bg-surface/40 p-4 md:p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl gap-4">
                    <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 shadow-lg bg-surface shrink-0">
                            {student.photo_url ? (
                                <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-black text-primary">
                                    {(student.prenom || ' ')[0]}{(student.nom || ' ')[0]}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl md:text-2xl font-black text-white leading-tight truncate">
                                📅 Planification de {student.prenom}
                            </h1>
                            <p className="text-sm text-grey-medium truncate">
                                Semaine du {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center md:justify-end shrink-0">
                        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border-2 border-orange-500/30 bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10">
                            <span className="text-sm font-black italic">
                                {step === 'status' ? '1' : step === 'homework' ? '2' : step === 'weekwork' ? '3' : '4'}
                            </span>
                            <span className="text-sm font-black uppercase tracking-widest leading-none">
                                {step === 'status' ? 'Évolution' : step === 'homework' ? 'Devoirs' : step === 'weekwork' ? 'Semaine' : 'Résumé'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <div className="max-w-3xl mx-auto w-full pt-4">

                    {/* ÉTAPE 1 : ÉVOLUTION DES TRAVAUX */}
                    {step === 'status' && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                <p className="text-primary font-bold">Où en es-tu dans ton travail ?</p>
                                <p className="text-primary/60 text-sm mt-1">
                                    Prends ta farde et clique sur les carrés correspondants à ton avancement.
                                </p>
                            </div>
                            
                            {/* Devoirs en retard */}
                            {overdueModules.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-lg font-black text-orange-400 mb-4 px-2">Travaux en retard</h2>
                                    {overdueModules.map((mod, idx) => (
                                        <ModuleBlock
                                            key={`overdue-${idx}`}
                                            moduleNom={mod.moduleNom}
                                            moduleDateFin={mod.moduleDateFin}
                                            activities={mod.activities}
                                            mode="status"
                                            isOverdue
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Semaine */}
                            {weekModules.length > 0 && (
                                <div>
                                    <h2 className="text-lg font-black text-primary mb-4 px-2">Travaux de la semaine</h2>
                                    {weekModules.map((mod, idx) => (
                                        <ModuleBlock
                                            key={`week-${idx}`}
                                            moduleNom={mod.moduleNom}
                                            moduleDateFin={mod.moduleDateFin}
                                            activities={mod.activities}
                                            mode="status"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ÉTAPE 2 : DEVOIRS */}
                    {step === 'homework' && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            {homeworkModules.length === 0 ? (
                                <div className="text-center py-16 space-y-4">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                                        <Check size={40} className="text-emerald-500" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white">Aucun devoir en retard !</h2>
                                    <p className="text-grey-medium">Tu es à jour, bravo 🎉</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3">
                                        <AlertTriangle size={24} className="text-orange-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-orange-300 font-bold">Ces travaux sont en retard !</p>
                                            <p className="text-orange-200/70 text-sm">Choisis un jour pour chaque exercice. Ils seront faits à domicile.</p>
                                        </div>
                                    </div>
                                    {homeworkModules.map((mod) => {
                                        const filteredActs = mod.activities.filter(a => {
                                            const c = choices[a.id];
                                            if (onlyShowUnassigned && c?.jour) return false;
                                            return true;
                                        });

                                        if (filteredActs.length === 0) return null;

                                        return (
                                            <ModuleBlock
                                                key={mod.moduleNom}
                                                moduleNom={mod.moduleNom}
                                                moduleDateFin={mod.moduleDateFin}
                                                activities={filteredActs}
                                                mode="homework"
                                                isOverdue
                                            />
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    {/* ÉTAPE 3 : TRAVAUX DE LA SEMAINE */}
                    {step === 'weekwork' && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            {weekworkModules.length === 0 ? (
                                <div className="text-center py-16 space-y-4">
                                    <CalendarDays size={48} className="text-grey-dark mx-auto" />
                                    <h2 className="text-2xl font-black text-white">Aucun travail cette semaine</h2>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                        <p className="text-primary font-bold">Planifie tes travaux de la semaine</p>
                                        <p className="text-primary/60 text-sm mt-1">
                                            Clique sur un jour : 🟢 vert = en classe, 🟠 orange = à domicile. Reclique pour changer.
                                        </p>
                                    </div>

                                    {weekworkModules.map((mod, idx) => (
                                        <ModuleBlock
                                            key={idx}
                                            moduleNom={mod.moduleNom}
                                            moduleDateFin={mod.moduleDateFin}
                                            activities={mod.activities}
                                            mode="weekwork"
                                            isOverdue={mod.activities.some(a => a.isOverdue)}
                                        />
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* ÉTAPE 3 : RÉSUMÉ */}
                    {step === 'summary' && (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-black text-white text-center mb-6">
                                Récapitulatif de ta semaine
                            </h2>
                            {renderSummary()}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer avec boutons de navigation et légende */}
            <div className="shrink-0 bg-surface/90 border-t border-white/10 backdrop-blur-xl p-4 md:p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-20">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Légende type PDF - Aligné à gauche, texte petit */}
                    <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1">
                        {[
                            { label: 'Démarré' },
                            { label: 'Fini' },
                            { label: 'Corrigé' },
                            { label: 'Validé et encodé' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded border border-white/20 bg-white/5" />
                                <span className="text-[10px] text-grey-medium font-bold uppercase tracking-tight">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Bouton retour */}
                        {step !== 'status' ? (
                            <button
                                onClick={() => {
                                    if (step === 'summary') setStep('weekwork');
                                    else if (step === 'weekwork') setStep('homework');
                                    else if (step === 'homework') setStep('status');
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10 transition-all active:scale-95"
                            >
                                ← Retour
                            </button>
                        ) : (
                            <div />
                        )}

                        {/* Bouton suivant STATUS */}
                        {step === 'status' && (
                            <button
                                onClick={() => setStep('homework')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-black hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                            >
                                <span>Continuer</span>
                                <ChevronRight size={18} />
                            </button>
                        )}

                        {/* Boutons et filtres HOMEWORK */}
                        {step === 'homework' && (
                            <div className="flex items-center gap-6">
                                {/* Toggle Masquer Planifiés */}
                                <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                                    <span className={clsx(
                                        "text-xs font-bold uppercase tracking-tight transition-colors",
                                        onlyShowUnassigned ? "text-orange-400" : "text-grey-medium"
                                    )}>
                                        Masquer planifiés
                                    </span>
                                    <button
                                        onClick={() => setOnlyShowUnassigned(!onlyShowUnassigned)}
                                        className={clsx(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                                            onlyShowUnassigned ? "bg-orange-500/50" : "bg-white/10"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                                            onlyShowUnassigned ? "translate-x-6 bg-orange-400" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                <button
                                    onClick={handleGoToWeekWork}
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg",
                                        !allHomeworkAssigned && homeworkActivities.length > 0
                                            ? "bg-white/10 text-grey-medium hover:bg-white/20 border border-white/10"
                                            : "bg-primary text-black hover:bg-primary/90 shadow-primary/20"
                                    )}
                                >
                                    {!allHomeworkAssigned && homeworkActivities.length > 0 && <AlertTriangle size={18} className="text-orange-400" />}
                                    <span>{homeworkActivities.length === 0 ? 'Passer aux travaux' : 'Valider les devoirs'}</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}

                        {step === 'weekwork' && (
                            <button
                                onClick={handleGoToSummary}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-black hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                            >
                                <span>Voir le résumé</span>
                                <ChevronRight size={18} />
                            </button>
                        )}

                        {step === 'summary' && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm bg-emerald-500 text-white hover:bg-emerald-400 transition-all active:scale-95 uppercase tracking-wider shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Check size={18} />
                                )}
                                <span>Confirmer</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentPlanning;
