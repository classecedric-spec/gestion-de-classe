import React from 'react';
import { User } from 'lucide-react';

const StudentParentsInfo = ({ student, handleInputChange, activeTab }) => {
    // Determine which section to show based on parent tab
    // We reuse this component for both, or just handle logic here.
    // The original modal had one component for both? No, it used tabs to hide/show.
    // Let's just make a component that renders the content of the current tab.

    if (activeTab === 'parent1') {
        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        Parent 1 (Principal)
                    </h3>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Nom Global des Parents (ex: M. & Mme Dupont)</label>
                        <input
                            type="text"
                            name="nom_parents"
                            value={student.nom_parents}
                            onChange={handleInputChange}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                            placeholder="Laissez vide pour utiliser les prénoms/noms ci-dessous"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Prénom</label>
                            <input
                                type="text"
                                name="parent1_prenom"
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
                            value={student.parent1_email}
                            onChange={handleInputChange}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (activeTab === 'parent2') {
        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
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
                            value={student.parent2_email}
                            onChange={handleInputChange}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default StudentParentsInfo;
