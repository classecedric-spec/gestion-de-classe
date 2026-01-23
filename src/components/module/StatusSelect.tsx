import React from 'react';
import clsx from 'clsx';

interface StatusSelectProps {
    value: string;
    onChange: (value: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'en_cours', label: 'En cours', activeClass: 'bg-success border-success text-white' },
    { value: 'archive', label: 'Archive', activeClass: 'bg-danger border-danger text-white' },
    { value: 'en_preparation', label: 'En préparation', activeClass: 'bg-primary border-primary text-[#1e1e1e]' }
];

/**
 * Component for selecting module status
 */
export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange }) => {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Statut du module</label>
            <div className="flex gap-2">
                {STATUS_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={clsx(
                            "flex-1 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all",
                            value === option.value
                                ? option.activeClass
                                : "bg-black/20 text-gray-400 border-white/10 hover:border-white/30"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
