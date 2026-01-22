import React, { ChangeEvent } from 'react';
import { User, Users, Plus } from 'lucide-react';
import clsx from 'clsx';
import ImageUpload from '../../../components/ui/ImageUpload';
import { StudentFormState } from '../hooks/useStudentForm';
import { Tables } from '../../../types/supabase';

export interface StudentGeneralInfoProps {
    student: StudentFormState;
    handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    updateField: (name: keyof StudentFormState, value: any) => void;
    handleClassChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    handleNiveauChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    handleToggleGroup: (groupId: string) => void;
    classesList: Tables<'Classe'>[];
    niveauxList: Tables<'Niveau'>[];
    groupsList: Tables<'Groupe'>[];
    setShowAddGroupModal: (show: boolean) => void;
}

const StudentGeneralInfo: React.FC<StudentGeneralInfoProps> = ({
    student,
    handleInputChange,
    updateField,
    handleClassChange,
    handleNiveauChange,
    handleToggleGroup,
    classesList,
    niveauxList,
    groupsList,
    setShowAddGroupModal
}) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            {/* Photo Upload */}
            <div className="flex justify-center mb-6">
                <ImageUpload
                    value={student.photo_url || student.photo_base64}
                    onChange={(v: string) => {
                        if (v && v.startsWith('http')) {
                            updateField('photo_url', v);
                        } else {
                            updateField('photo_base64', v);
                        }
                    }}
                    label="Photo de l'élève"
                    className="w-full"
                    placeholderIcon={User}
                    storagePath={student.nom ? `eleve/${student.nom}.jpg` : undefined} // Using nom as fallback for ID if not present in state but it should be
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Prénom <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        name="prenom"
                        value={student.prenom}
                        onChange={handleInputChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-grey-medium"
                        placeholder="Ex: Jean"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Nom <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        name="nom"
                        value={student.nom}
                        onChange={handleInputChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-grey-medium"
                        placeholder="Ex: Dupont"
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Date de naissance</label>
                <input
                    type="date"
                    name="date_naissance"
                    title="Date de naissance"
                    placeholder="Date de naissance"
                    value={student.date_naissance}
                    onChange={handleInputChange}
                    onClick={(e) => { try { (e.target as any).showPicker(); } catch (err) { } }}
                    onFocus={(e) => { try { (e.target as any).showPicker(); } catch (err) { } }}
                    className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Sexe</label>
                <div className="flex gap-4">
                    <label className={clsx(
                        "flex-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2",
                        student.sex === 'M'
                            ? "bg-blue-500/20 border-blue-500 text-blue-500 font-bold"
                            : "bg-input border-border/10 text-grey-medium hover:bg-white/5"
                    )}>
                        <input
                            type="radio"
                            name="sex"
                            value="M"
                            checked={student.sex === 'M'}
                            onChange={handleInputChange}
                            className="hidden"
                        />
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Garçon
                    </label>
                    <label className={clsx(
                        "flex-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2",
                        student.sex === 'F'
                            ? "bg-pink-500/20 border-pink-500 text-pink-500 font-bold"
                            : "bg-input border-border/10 text-grey-medium hover:bg-white/5"
                    )}>
                        <input
                            type="radio"
                            name="sex"
                            value="F"
                            checked={student.sex === 'F'}
                            onChange={handleInputChange}
                            className="hidden"
                        />
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        Fille
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Classe</label>
                    <select
                        value={student.classe_id}
                        title="Classe de l'élève"
                        onChange={handleClassChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Sélectionner...</option>
                        {classesList.map(c => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                        <option value="create_new" className="font-bold text-primary bg-surface">+ Nouvelle classe</option>
                    </select>
                </div>
                <div className="space-y-1 relative">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Niveau</label>
                    <select
                        value={student.niveau_id}
                        title="Niveau de l'élève"
                        onChange={handleNiveauChange}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Sélectionner...</option>
                        {niveauxList.map(n => (
                            <option key={n.id} value={n.id}>{n.nom}</option>
                        ))}
                        <option value="create_new" className="font-bold text-primary bg-surface">+ Nouveau niveau</option>
                    </select>
                </div>
            </div>

            {/* Multi-Group Selection */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-2">
                    <Users size={14} />
                    Groupes (Sélection multiple)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-input border border-border/10 rounded-xl min-h-[60px]">
                    {groupsList.map(g => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => handleToggleGroup(g.id)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border user-select-none",
                                student.groupe_ids?.includes(g.id)
                                    ? "bg-primary text-text-dark border-primary shadow-sm ring-1 ring-primary/20"
                                    : "bg-surface text-grey-medium border-border/10 hover:border-border/30 hover:bg-input"
                            )}
                        >
                            {g.nom}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setShowAddGroupModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-primary/50 text-primary hover:bg-primary/10 flex items-center gap-1"
                    >
                        <Plus size={12} />
                        Nouveau
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentGeneralInfo;
