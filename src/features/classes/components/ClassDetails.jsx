import React from 'react';
import { BookOpen, GraduationCap, LayoutGrid, Table as TableIcon, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2, X, Plus } from 'lucide-react';
import clsx from 'clsx';
import ImageUpload from '../../../components/ui/ImageUpload'; // Using reusable component if possible or just standard img

const ClassDetails = ({
    selectedClass,
    students,
    loadingStudents,
    viewMode,
    setViewMode,
    sortConfig,
    onSort,
    onUpdateStudent,
    onEditStudent,
    onRemoveStudent,
    onAddStudent
}) => {

    if (!selectedClass) {
        return (
            <div className="flex-1 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 shadow-xl flex flex-col items-center justify-center text-grey-dark p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-surface border border-dashed border-border/20 flex items-center justify-center mb-6">
                    <BookOpen size={40} className="opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-grey-medium mb-2">Sélectionnez une classe</h3>
                <p className="max-w-xs text-sm opacity-60">Choisissez une classe dans la liste pour voir les élèves et les détails.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/5 overflow-hidden shadow-xl flex flex-col relative text-text-main animate-in slide-in-from-right-4 duration-300">

            {/* Class Header */}
            <div className="p-8 border-b border-border/5 flex items-start justify-between bg-surface/30">
                <div className="flex gap-6 items-center">
                    <div className={clsx(
                        "w-24 h-24 rounded-2xl border-4 border-surface shadow-2xl flex items-center justify-center text-3xl font-bold text-primary shrink-0 overflow-hidden",
                        (selectedClass.photo_base64 || selectedClass.logo_url) ? "bg-[#D9B981]" : "bg-input"
                    )}>
                        {selectedClass.photo_base64 ? (
                            <img src={selectedClass.photo_base64} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                        ) : selectedClass.logo_url ? (
                            <img src={selectedClass.logo_url} alt="Logo" className="w-[90%] h-[90%] object-contain" />
                        ) : (
                            selectedClass.acronyme || selectedClass.nom[0]
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-main mb-2 tracking-tight">{selectedClass.nom}</h1>
                        <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-md ring-1 ring-primary/20">
                                {selectedClass.acronyme || 'N/A'}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-grey-dark" />
                            <p className="text-grey-medium text-sm font-medium">
                                <strong className="text-text-main">{students.length}</strong> {students.length > 1 ? 'Enfants' : 'Enfant'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-border/5 bg-surface/5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-grey-dark flex items-center gap-2">
                    <GraduationCap size={16} className="text-primary" />
                    Liste des Élèves
                </h3>
                <div className="flex bg-surface p-1 rounded-lg border border-white/5 shadow-sm">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={clsx(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'grid' ? "bg-primary text-white shadow-sm" : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                        title="Vue Grille"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={clsx(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'table' ? "bg-primary text-white shadow-sm" : "text-grey-medium hover:text-white hover:bg-white/5"
                        )}
                        title="Vue Tableau"
                    >
                        <TableIcon size={16} />
                    </button>
                </div>
            </div>

            {/* Students Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative">
                {loadingStudents ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-grey-medium animate-pulse text-xs uppercase tracking-widest">Chargement...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-12 p-8 bg-input/10 rounded-2xl border border-dashed border-border/10 flex flex-col items-center gap-4">
                        <GraduationCap size={48} className="mx-auto text-grey-dark opacity-20" />
                        <div>
                            <p className="text-grey-medium italic text-sm">Aucun enfant dans cette classe.</p>
                            <p className="text-xs text-grey-dark mt-1">Commencez par ajouter des élèves.</p>
                        </div>
                        <button
                            onClick={onAddStudent}
                            className="mt-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-all"
                        >
                            Ajouter un élève
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    <TableView
                        students={students}
                        sortConfig={sortConfig}
                        onSort={onSort}
                        onUpdateStudent={onUpdateStudent}
                        onEditStudent={onEditStudent}
                        onRemoveStudent={onRemoveStudent}
                    />
                ) : (
                    <GridView
                        students={students}
                        onEditStudent={onEditStudent}
                        onRemoveStudent={onRemoveStudent}
                    />
                )}
            </div>

            {/* Footer Action */}
            <div className="p-6 border-t border-border/5 bg-surface/30">
                <button
                    onClick={onAddStudent}
                    className="w-full py-4 bg-transparent hover:bg-surface/50 text-grey-medium hover:text-primary rounded-2xl border-2 border-dashed border-border/10 hover:border-primary/30 transition-all flex items-center justify-center gap-3 group"
                >
                    <div className="p-1 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <Plus size={20} />
                    </div>
                    <span className="font-bold uppercase tracking-wider text-sm">Ajouter un enfant</span>
                </button>
            </div>
        </div>
    );
};

// --- Sub Components for Views ---

const TableView = ({ students, sortConfig, onSort, onUpdateStudent, onEditStudent, onRemoveStudent }) => {
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
                                    value={student.prenom}
                                    onChange={(e) => onUpdateStudent(student.id, 'prenom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={student.nom}
                                    onChange={(e) => onUpdateStudent(student.id, 'nom', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium text-text-main"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <select
                                    value={student.sex || ''}
                                    onChange={(e) => onUpdateStudent(student.id, 'sex', e.target.value)}
                                    className={clsx(
                                        "w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all font-medium cursor-pointer appearance-none",
                                        student.sex === 'M' ? "text-blue-400" : student.sex === 'F' ? "text-pink-400" : "text-grey-medium"
                                    )}
                                >
                                    <option value="" className="bg-surface text-grey-medium">-</option>
                                    <option value="M" className="bg-surface text-blue-400">G</option>
                                    <option value="F" className="bg-surface text-pink-400">F</option>
                                </select>
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="date"
                                    value={student.date_naissance || ''}
                                    onChange={(e) => onUpdateStudent(student.id, 'date_naissance', e.target.value)}
                                    className="w-full bg-transparent border-transparent focus:border-primary/50 focus:bg-black/20 rounded px-2 py-1 outline-none transition-all text-grey-light [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEditStudent(student)}
                                        className="p-1.5 text-grey-medium hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => onRemoveStudent(e, student.id)}
                                        className="p-1.5 text-grey-medium hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const GridView = ({ students, onEditStudent, onRemoveStudent }) => {
    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            {students.map(student => (
                <div key={student.id} className="relative group/card h-full">
                    <button
                        onClick={(e) => onRemoveStudent(e, student.id)}
                        className="absolute top-2 right-2 z-10 p-1.5 bg-surface hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-sm scale-90 hover:scale-100"
                        title="Retirer"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>

                    <button
                        onClick={() => onEditStudent(student)}
                        className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-surface/40 backdrop-blur-sm border border-white/5 hover:border-primary/40 hover:bg-surface/60 transition-all duration-300 group shadow-sm hover:shadow-md overflow-hidden"
                    >
                        <div className={clsx(
                            "w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-primary group-hover:scale-105 transition-transform duration-300 overflow-hidden shadow-lg mb-3 shrink-0",
                            student.photo_base64 ? "bg-[#D9B981] p-1" : "bg-input"
                        )}>
                            {student.photo_base64 ? (
                                <img src={student.photo_base64} alt="Student" className="w-full h-full object-contain rounded-xl" />
                            ) : (
                                <span className="text-xl tracking-tighter">{student.prenom[0]}{student.nom[0]}</span>
                            )}
                        </div>

                        <div className="w-full px-1">
                            <p className="font-bold text-text-main group-hover:text-primary transition-colors text-sm truncate">
                                {student.prenom} {student.nom}
                            </p>
                            <p className="text-[10px] uppercase font-bold text-grey-medium opacity-60 truncate mt-1">
                                {student.EleveGroupe?.length > 0 ? student.EleveGroupe[0].Groupe?.nom : 'Sans groupe'}
                            </p>
                        </div>
                    </button>
                </div>
            ))}
        </div>
    );
};

const SortableTh = ({ label, sortKey, config, onSort, width }) => (
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

export default ClassDetails;
