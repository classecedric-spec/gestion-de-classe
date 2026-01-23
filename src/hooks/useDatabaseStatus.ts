import { useState, useEffect } from 'react';
import { checkDatabaseSetup } from '../lib/database';

/**
 * Hook to check and manage database connection status
 */
export const useDatabaseStatus = () => {
    const [dbStatus, setDbStatus] = useState<{
        checked: boolean;
        exists: boolean;
        errorType: string | null;
        rawError: any | null
    }>({
        checked: false,
        exists: true,
        errorType: null,
        rawError: null
    });

    useEffect(() => {
        checkDB();
    }, []);

    const checkDB = async () => {
        setDbStatus(prev => ({ ...prev, checked: false }));
        const status = await checkDatabaseSetup();
        setDbStatus({
            checked: true,
            exists: status.exists,
            errorType: status.errorType,
            rawError: status.rawError
        });
    };

    return { dbStatus };
};
