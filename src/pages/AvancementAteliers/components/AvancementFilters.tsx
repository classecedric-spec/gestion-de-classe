import React from 'react';
import { Users, ChevronDown, Calendar, GitBranch, BookOpen } from 'lucide-react';
import { Group } from '../../../features/attendance/services/attendanceService';

interface AvancementFiltersProps {
    groups: Group[];
    modules: any[];
    branches: any[];
    selectedGroupId: string;
    setSelectedGroupId: (id: string) => void;
    dateOperator: string;
    setDateOperator: (op: string) => void;
    selectedDateFin: string;
    setSelectedDateFin: (date: string) => void;
    selectedBrancheId: string;
    setSelectedBrancheId: (id: string) => void;
    selectedModuleId: string;
    setSelectedModuleId: (id: string) => void;
    getFilteredModules: () => any[];
    onModuleSelectReset: () => void; // Used to reset moduleId when other filters change
}

export const AvancementFilters: React.FC<AvancementFiltersProps> = ({
    groups,
    modules,
    branches,
    selectedGroupId,
    setSelectedGroupId,
    dateOperator,
    setDateOperator,
    selectedDateFin,
    setSelectedDateFin,
    selectedBrancheId,
    setSelectedBrancheId,
    selectedModuleId,
    setSelectedModuleId,
    getFilteredModules,
    onModuleSelectReset
}) => {
    return (
        <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border border-white/5 shadow-lg">
            {/* 1. Group Selector */}
            <div className="flex-[2] min-w-[300px] flex items-end gap-4">
                <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium mb-2 block ml-1">
                        Groupe
                    </label>
                    <div className="relative group">
                        <select
                            title="Sélectionner le groupe"
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="w-full bg-background border border-white/5 text-white rounded-xl py-3 pl-10 pr-10 appearance-none focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                        >
                            <option value="">Sélectionner un groupe...</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id} className="bg-surface">{g.nom}</option>
                            ))}
                        </select>
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={16} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none group-hover:text-primary transition-colors" size={16} />
                    </div>
                </div>
            </div>

            {/* 2. Operator Selector */}
            <div className="w-[160px]">
                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                    Critère Date
                </label>
                <div className="relative">
                    <select
                        title="Sélectionner l'opérateur de date"
                        value={dateOperator}
                        onChange={(e) => {
                            setDateOperator(e.target.value);
                            onModuleSelectReset();
                        }}
                        className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-3 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                        <option value="lt">Avant le</option>
                        <option value="lte">Pour ou avant</option>
                        <option value="eq">Pour le</option>
                        <option value="gt">Après le</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                </div>
            </div>

            {/* 3. Date Selector */}
            <div className="min-w-[200px]">
                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                    Date de fin
                </label>
                <div className="relative">
                    <select
                        title="Sélectionner la date de fin"
                        value={selectedDateFin}
                        onChange={(e) => {
                            setSelectedDateFin(e.target.value);
                            onModuleSelectReset();
                        }}
                        className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                        <option value="">Toutes les dates</option>
                        {Array.from(new Set(modules.map(m => m.date_fin).filter(Boolean))).sort().map((date: any) => (
                            <option key={date} value={date}>
                                {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                </div>
            </div>

            {/* 4. Branch Selector */}
            <div className="min-w-[180px]">
                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                    Branche <span className="text-grey-dark">(facultatif)</span>
                </label>
                <div className="relative">
                    <select
                        title="Sélectionner la branche"
                        value={selectedBrancheId}
                        onChange={(e) => {
                            setSelectedBrancheId(e.target.value);
                            onModuleSelectReset();
                        }}
                        className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                        <option value="">Toutes les branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.nom}</option>
                        ))}
                    </select>
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                </div>
            </div>

            {/* 5. Module Selector */}
            <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-grey-medium uppercase tracking-wider mb-1.5 block">
                    Module
                </label>
                <div className="relative">
                    <select
                        title="Sélectionner le module"
                        value={selectedModuleId}
                        onChange={(e) => setSelectedModuleId(e.target.value)}
                        className="w-full bg-background border border-white/10 text-white rounded-lg p-2.5 pl-10 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    >
                        <option value="">
                            {(selectedDateFin || selectedBrancheId)
                                ? `Tous les modules (${getFilteredModules().length})`
                                : "Sélectionner un module..."}
                        </option>
                        {getFilteredModules()
                            .sort((a, b) => {
                                if (!a.date_fin) return 1;
                                if (!b.date_fin) return -1;
                                return new Date(a.date_fin).getTime() - new Date(b.date_fin).getTime();
                            })
                            .map(m => {
                                const dateStr = m.date_fin
                                    ? new Date(m.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                    : 'Sans date';
                                return (
                                    <option key={m.id} value={m.id}>
                                        {dateStr} - {m.nom}
                                    </option>
                                );
                            })}
                    </select>
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none" size={16} />
                </div>
            </div>
        </div>
    );
};
