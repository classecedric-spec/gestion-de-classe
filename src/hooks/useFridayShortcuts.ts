/**
 * Hook for calculating Friday date shortcuts
 */
export const useFridayShortcuts = () => {
    const getFridayShortcuts = () => {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 5 = Friday

        let daysUntilNextFriday = 5 - currentDay;
        if (daysUntilNextFriday < 0) {
            daysUntilNextFriday += 7;
        }

        const f1 = new Date(today);
        f1.setDate(today.getDate() + daysUntilNextFriday);

        const f2 = new Date(f1);
        f2.setDate(f1.getDate() + 7);

        const f3 = new Date(f2);
        f3.setDate(f2.getDate() + 7);

        return [f1, f2, f3];
    };

    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const formatDateLabel = (date: Date) => {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return {
        fridays: getFridayShortcuts(),
        formatDateForInput,
        formatDateLabel
    };
};
