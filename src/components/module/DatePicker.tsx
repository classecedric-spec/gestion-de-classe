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
                    {fridayShortcuts.map((friday, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleDateShortcut(friday)}
                            className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors truncate"
                            title={formatDateForInput(friday)}
                        >
                            Ven. {formatDateLabel(friday)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
