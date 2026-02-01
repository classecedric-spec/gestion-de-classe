import React from 'react';
import { Zap } from 'lucide-react';
import AdultTrackingPanel from '../../desktop/AdultTrackingPanel';

interface AdultColumnWrapperProps {
    adultActivities: any[];
    showAdultModal: boolean;
    allAdults: any[];
    availableActivityTypes: any[];
    currentAdultSelection: any;
    currentActivityTypeSelection: any;
    loadingAdults: boolean;
    // Actions
    onOpenRandomPicker: () => void;
    onAddClick: () => void;
    onAdultChange: (adult: any) => void;
    onActivityChange: (type: any) => void;
    onSave: () => void;
    onDelete: (id: string) => void;
    onCloseModal: () => void;
}

export const AdultColumnWrapper: React.FC<AdultColumnWrapperProps> = ({
    adultActivities,
    showAdultModal,
    allAdults,
    availableActivityTypes,
    currentAdultSelection,
    currentActivityTypeSelection,
    loadingAdults,
    onOpenRandomPicker,
    onAddClick,
    onAdultChange,
    onActivityChange,
    onSave,
    onDelete,
    onCloseModal
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* Random Picker Button */}
            <div className="p-4 border-b border-white/5 shrink-0">
                <button
                    onClick={onOpenRandomPicker}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                    <Zap size={18} />
                    <span>La Main Innocente</span>
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <AdultTrackingPanel
                    adultActivities={adultActivities}
                    showModal={showAdultModal}
                    allAdults={allAdults}
                    activityTypes={availableActivityTypes}
                    currentAdult={currentAdultSelection}
                    currentActivity={currentActivityTypeSelection}
                    loadingAdults={loadingAdults}
                    onAddClick={onAddClick}
                    onAdultChange={onAdultChange}
                    onActivityChange={onActivityChange}
                    onSave={onSave}
                    onDelete={onDelete}
                    onCloseModal={onCloseModal}
                />
            </div>
        </div>
    );
};
