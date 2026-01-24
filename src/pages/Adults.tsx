import React from 'react';
import { useAdults } from '../features/adults/hooks/useAdults';
import { useActivityTypes } from '../features/adults/hooks/useActivityTypes';
import AdultList from '../features/adults/components/AdultList';
import ActivityTypesPanel from '../features/adults/components/ActivityTypesPanel';

const Adults: React.FC = () => {
    // Hooks
    const {
        loading: loadingAdults,
        searchTerm,
        setSearchTerm,
        filteredAdults,
        createAdult,
        updateAdult,
        deleteAdult
    } = useAdults();

    const {
        activityTypes,
        loading: loadingActivities,
        createActivityType,
        updateActivityType,
        deleteActivityType
    } = useActivityTypes();

    return (
        <div className="h-full flex gap-8 animate-in fade-in duration-500">
            {/* LEFT PANEL: ADULT LIST */}
            <AdultList
                adults={filteredAdults}
                loading={loadingAdults}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={createAdult}
                onEdit={updateAdult}
                onDelete={deleteAdult}
            />

            {/* RIGHT PANEL: ACTIVITY TYPES */}
            <ActivityTypesPanel
                activityTypes={activityTypes}
                loading={loadingActivities}
                onAdd={createActivityType}
                onEdit={updateActivityType}
                onDelete={deleteActivityType}
            />
        </div>
    );
};

export default Adults;
