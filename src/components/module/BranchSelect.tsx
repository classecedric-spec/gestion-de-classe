import React from 'react';

interface BranchSelectProps {
    value: string;
    branches: { id: string; nom: string }[];
    onChange: (value: string, shouldCreateNew: boolean) => void;
}

/**
 * Component for selecting a branch with option to create new
 */
export const BranchSelect: React.FC<BranchSelectProps> = ({ value, branches, onChange }) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'create_new') {
            onChange('', true);
        } else {
            onChange(val, false);
        }
    };

    return (
        <div className="space-y-2">
            <label htmlFor="branche_select" className="text-sm font-medium text-gray-300">
                Branche
            </label>
            <select
                id="branche_select"
                name="branche"
                value={value}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
                <option value="">Sélectionner une branche</option>
                {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.nom}</option>
                ))}
                <option value="create_new" className="text-primary font-bold">
                    + Créer une nouvelle branche
                </option>
            </select>
        </div>
    );
};
