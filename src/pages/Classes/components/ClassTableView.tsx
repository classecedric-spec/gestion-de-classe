import React, { ChangeEvent } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../../../core';
import { StudentWithRelations } from '../../../features/classes/services/classService';

interface TableViewProps {
    students: StudentWithRelations[];
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    onUpdateStudent: (id: string, field: string, value: any) => void;
    onEditStudent: (student: StudentWithRelations) => void;
    onRemoveStudent: (e: React.MouseEvent, id: string) => void;
}

interface SortableThProps {
    label: string;
    sortKey: string;
    config: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    width?: string;
}

const SortableTh: React.FC<SortableThProps> = ({ label, sortKey, config, onSort, width }) => (
    <th
        className={clsx("px-4 py-3 font-bold cursor-pointer hover:bg-white/10 transition-colors select-none group/th", width)}
        onClick={() => onSort(sortKey)}
    >
        <div className="flex items-center gap-1">
            {label}
            {config.key === sortKey ? (
                config.direction === 'asc' ? <ArrowUp size={12} className="text-primary" /> : <ArrowDown size={12} className="text-primary" />
            ) : <ArrowUpDown size={12} className="opacity-0 group-hover/th:opacity-50" />}
        </div>
    </th>
);

export const ClassTableView: React.FC<TableViewProps> = ({ students, sortConfig, onSort, onUpdateStudent, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="rounded-xl border border-white/5 bg-surface/30 overflow-hidden">
            <table className="w-full text-sm text-left student-table">
                <thead className="text-xs text-grey-medium uppercase bg-surface/50 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <SortableTh label="Prénom" sortKey="prenom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Nom" sortKey="nom" config={sortConfig} onSort={onSort} />
                        <SortableTh label="Sexe" sortKey="sex" config={sortConfig} onSort={onSort} width="w-24" />
                        <SortableTh label="Date de naissance" sortKey="date_naissance" config={sortConfig} onSort={onSort} />
                        <th className="px-4 py-3 font-bold w-24 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {students.map(student => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.prenom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'prenom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Prénom de l'élève"
                                    placeholder="Prénom"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.nom || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'nom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                    title="Nom de l'élève"
                                    placeholder="Nom"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <select
                                    value={student.sex || ''}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => onUpdateStudent(student.id, 'sex', e.target.value)}
                                    title="Sexe de l'élève"
                                    className={clsx(
                                        "w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium cursor-pointer appearance-none",
                                        student.sex === 'M' ? "text-info" : student.sex === 'F' ? "text-pink-accent" : "text-grey-medium"
                                    )}
                                >
                                    <option value="" className="bg-surface text-grey-medium">-</option>
                                    <option value="M" className="bg-surface text-info">G</option>
                                    <option value="F" className="bg-surface text-pink-accent">F</option>
                                </select>
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="date"
                                    value={student.date_naissance || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateStudent(student.id, 'date_naissance', e.target.value)}
                                    title="Date de naissance de l'élève"
                                    placeholder="JJ/MM/AAAA"
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all text-grey-light [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEditStudent(student)}
                                        className="h-8 w-8 p-0"
                                        title="Modifier l'élève"
                                        icon={Edit}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => onRemoveStudent(e, student.id)}
                                        className="h-8 w-8 p-0 text-danger hover:text-danger hover:bg-danger/10"
                                        title="Supprimer l'élève de la classe"
                                        icon={Trash2}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
