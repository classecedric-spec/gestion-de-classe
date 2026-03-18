import React from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    fridayShortcuts: Date[];
    formatDateForInput: (date: Date) => string;
    formatDateLabel: (date: Date) => string;
}

/**
 * Component for date selection with Friday shortcuts
 */
export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    fridayShortcuts,
    formatDateForInput,
    formatDateLabel
}) => {
    const handleDateShortcut = (date: Date) => {
        onChange(formatDateForInput(date));
    };

    return (
        <div className="space-y-2">
            <label htmlFor="end_date" className="text-sm font-medium text-gray-300">
                Date de fin (objectif)
            </label>
            <div className="space-y-2">
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        id="end_date"
                        name="end_date"
                        type="date"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch { } }}
                        onFocus={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch { } }}
                        className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                    />
                </div>
                <div className="flex gap-2">
                    {fridayShortcuts.map((friday, index) => {
                        const isSelected = formatDateForInput(friday) === value;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleDateShortcut(friday)}
                                className={`flex-1 px-2 py-1.5 text-xs font-medium transition-all truncate border-2 rounded-lg ${isSelected
                                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                        : 'text-gray-300 bg-white/5 hover:bg-white/10 border-transparent'
                                    }`}
                                title={formatDateForInput(friday)}
                            >
                                Ven. {formatDateLabel(friday)}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
