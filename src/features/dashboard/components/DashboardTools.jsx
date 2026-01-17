import React from 'react';
import { Settings2, CheckSquare, LayoutList, GraduationCap, FileText, Users, Zap, User } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const DashboardTools = ({
    selectedGroup,
    groups,
    onGroupChange,
    isGenerating,
    handleGenerateGroupTodoList,
    onOpenRandomPicker,
    onOpenHomework,
    onOpenNoiseMeter
}) => {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-8">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                    <Settings2 className="text-primary" /> Configuration & Actions
                </h2>
                <div className="space-y-4">
                    <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                        <h3 className="text-xs font-black text-grey-medium uppercase tracking-widest mb-3">Accès Rapide</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'Faire l\'appel', icon: CheckSquare, path: '/dashboard/presence', color: 'bg-emerald-500' },
                                { label: 'Suivi Global', icon: LayoutList, path: '/dashboard/suivi', color: 'bg-primary' },
                                { label: 'Gestion Classes', icon: GraduationCap, path: '/dashboard/user/classes', color: 'bg-amber-500' }
                            ].map(action => (
                                <button
                                    key={action.label}
                                    onClick={() => navigate(action.path)}
                                    className="flex items-center gap-3 p-3 bg-surface hover:bg-white/5 border border-white/5 rounded-xl transition-all"
                                >
                                    <div className={clsx("p-1.5 rounded-lg text-white", action.color)}>
                                        <action.icon size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-text-main">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Tools Grid */}
            <section className="md:col-span-2 bg-gradient-to-br from-surface to-background p-8 rounded-3xl border border-white/5">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-3 mb-8">
                    <FileText className="text-warning" /> Centre de téléchargement
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PDF Generator */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                <Users size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">Listes par Groupe</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">Générez un livret A5 contenant les listes de travail pour chaque élève du groupe sélectionné.</p>

                        {/* Group Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-grey-medium uppercase tracking-wider">
                                Sélectionner un groupe
                            </label>
                            <select
                                value={selectedGroup?.id || ''}
                                onChange={(e) => {
                                    const group = groups?.find(g => g.id === e.target.value);
                                    onGroupChange(group);
                                }}
                                className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            >
                                <option value="">Choisir un groupe...</option>
                                {groups?.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleGenerateGroupTodoList}
                            disabled={!selectedGroup || isGenerating}
                            className="w-full py-3 bg-primary text-text-dark rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? "Génération..." : "Lancer l'impression"}
                        </button>
                    </div>

                    {/* Random Picker */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-500">
                                <Zap size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">La Main Innocente</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">Tirage au sort d'un élève avec animation.</p>
                        <button
                            onClick={onOpenRandomPicker}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Lancer le tirage
                        </button>
                    </div>

                    {/* Homework Tracker (Placeholder) */}
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                                <CheckSquare size={18} />
                            </div>
                            <h3 className="font-bold text-text-main">Check-up Devoirs</h3>
                        </div>
                        <p className="text-xs text-grey-medium leading-relaxed italic">En développement...</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DashboardTools;
