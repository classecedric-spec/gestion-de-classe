import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Loader2, Archive, Clock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';
import Modal from './ui/Modal';

const SelectModuleModal = ({ isOpen, onClose, onSelect }) => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, en_preparation, en_cours, archive

    useEffect(() => {
        if (isOpen) {
            fetchModules();
        }
    }, [isOpen]);

    const fetchModules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Module')
                .select('id, nom, statut')
                .order('nom');
            if (error) throw error;
            setModules(data || []);
        } catch (err) {
            console.error('Error fetching modules:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredModules = useMemo(() => {
        return modules.filter(m => {
            const matchesSearch = m.nom.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || m.statut === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [modules, searchTerm, statusFilter]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'archive': return <Archive size={14} className="text-gray-400" />;
            case 'en_cours': return <PlayCircle size={14} className="text-success" />;
            default: return <Clock size={14} className="text-primary" />;
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sélectionner un Module"
            noPadding={true}
            className="max-w-lg max-h-[80vh] h-[80vh]"
        >
            <div className="flex flex-col h-full">
                <div className="p-4 space-y-4 border-b border-white/5 bg-surface/5 flex-none">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            id="module_search"
                            name="module_search"
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                            aria-label="Rechercher un module"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <FilterButton
                            active={statusFilter === 'all'}
                            onClick={() => setStatusFilter('all')}
                            label="Tous"
                        />
                        <FilterButton
                            active={statusFilter === 'en_preparation'}
                            onClick={() => setStatusFilter('en_preparation')}
                            label="Prép."
                            icon={<Clock size={12} />}
                        />
                        <FilterButton
                            active={statusFilter === 'en_cours'}
                            onClick={() => setStatusFilter('en_cours')}
                            label="Cours"
                            icon={<PlayCircle size={12} />}
                        />
                        <FilterButton
                            active={statusFilter === 'archive'}
                            onClick={() => setStatusFilter('archive')}
                            label="Arch."
                            icon={<Archive size={12} />}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredModules.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 text-sm">Aucun module trouvé.</div>
                    ) : (
                        <div className="space-y-1">
                            {filteredModules.map(module => (
                                <button
                                    key={module.id}
                                    onClick={() => {
                                        onSelect(module);
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                                >
                                    <span className="text-white font-medium text-sm">{module.nom}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                                            module.statut === 'en_cours' ? "bg-success/10 text-success" :
                                                module.statut === 'archive' ? "bg-white/5 text-gray-400" :
                                                    "bg-primary/10 text-primary"
                                        )}>
                                            {getStatusIcon(module.statut)}
                                            {module.statut === 'en_cours' ? 'En Cours' :
                                                module.statut === 'archive' ? 'Archivé' : 'Préparation'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

const FilterButton = ({ active, onClick, label, icon }) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all border",
            active
                ? "bg-primary text-text-dark border-primary"
                : "bg-transparent text-gray-400 border-white/10 hover:bg-white/5 hover:text-white"
        )}
    >
        {icon}
        <span className="truncate">{label}</span>
    </button>
);

export default SelectModuleModal;
