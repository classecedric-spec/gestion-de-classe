import React from 'react';
import { Select } from '../../../core';
import { BookOpen, Calendar, Users } from 'lucide-react';

interface GradeContextSelectorProps {
    branches: any[];
    groups: any[];
    selectedBrancheId?: string;
    setSelectedBrancheId: (id: string) => void;
    selectedGroupId?: string;
    setSelectedGroupId: (id: string) => void;
    selectedPeriode?: string;
    setSelectedPeriode: (periode: string) => void;
    disabled?: boolean;
}

const PERIOD_OPTIONS = [
    { value: 'Trimestre 1', label: 'Trimestre 1' },
    { value: 'Trimestre 2', label: 'Trimestre 2' },
    { value: 'Trimestre 3', label: 'Trimestre 3' },
    { value: 'Année complète', label: 'Année complète' },
];

const GradeContextSelector: React.FC<GradeContextSelectorProps> = ({
    branches,
    groups,
    selectedBrancheId,
    setSelectedBrancheId,
    selectedGroupId,
    setSelectedGroupId,
    selectedPeriode,
    setSelectedPeriode,
    disabled
}) => {
    const brancheOptions = [
        { value: '', label: 'Choisir une matière...' },
        ...branches.map(b => ({ value: b.id, label: b.nom }))
    ];

    const groupOptions = [
        { value: '', label: 'Choisir un groupe...' },
        ...groups.map(g => ({ value: g.id, label: g.nom }))
    ];

    const periodOptions = [
        ...PERIOD_OPTIONS
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
            <div className="flex-1">
                <Select
                    label="Groupe"
                    icon={Users}
                    options={groupOptions}
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={disabled}
                    variant="inset"
                />
            </div>
            <div className="flex-1">
                <Select
                    label="Branche / Matière"
                    icon={BookOpen}
                    options={brancheOptions}
                    value={selectedBrancheId || ''}
                    onChange={(e) => setSelectedBrancheId(e.target.value)}
                    disabled={disabled}
                    variant="inset"
                />
            </div>
            <div className="flex-1">
                <Select
                    label="Période"
                    icon={Calendar}
                    options={periodOptions}
                    value={selectedPeriode || ''}
                    onChange={(e) => setSelectedPeriode(e.target.value)}
                    disabled={disabled}
                    variant="inset"
                />
            </div>
        </div>
    );
};

export default GradeContextSelector;
