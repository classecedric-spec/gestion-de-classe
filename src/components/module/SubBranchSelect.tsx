import React from 'react';

interface SubBranchSelectProps {
    value: string;
    subBranches: { id: string; nom: string }[];
    disabled: boolean;
    onChange: (value: string, shouldCreateNew: boolean) => void;
}

/**
 * Component for selecting a sub-branch with option to create new
 */
export const SubBranchSelect: React.FC<SubBranchSelectProps> = ({
    value,
    subBranches,
    disabled,
    onChange
}) => {
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
            <label htmlFor="sub_branche_select" className="text-sm font-medium text-gray-300">
                Sous-branche
            </label>
            <select
                id="sub_branche_select"
                name="sub_branche"
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="">Sélectionner une sous-branche</option>
                {subBranches.map(sb => (
                    <option key={sb.id} value={sb.id}>{sb.nom}</option>
                ))}
                <option value="create_new" className="text-primary font-bold">
                    + Créer une nouvelle sous-branche
                </option>
            </select>
        </div>
    );
};
