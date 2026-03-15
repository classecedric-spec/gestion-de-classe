import React from 'react';
import { Database } from 'lucide-react';
import { SETUP_SQL } from '../../lib/database';
import { toast } from 'react-hot-toast';
import { copyToClipboard } from '../../utils/clipboardUtils';

interface DatabaseStatusAlertProps {
    dbStatus: {
        checked: boolean;
        exists: boolean;
        errorType: string | null;
        rawError: any | null;
    };
}

export const DatabaseStatusAlert: React.FC<DatabaseStatusAlertProps> = ({ dbStatus }) => {
    if (dbStatus.exists || !dbStatus.checked) return null;

    const copySQL = async () => {
        const success = await copyToClipboard(SETUP_SQL);
        if (success) {
            toast.success("SQL copié !");
        } else {
            toast.error("Échec de la copie");
        }
    };

    return (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6 animate-in fade-in zoom-in-95">
            {dbStatus.errorType === 'API_KEY' ? (
                <div className="text-xs text-amber-200">
                    <div className="font-bold flex items-center gap-2 mb-1"><Database size={12} /> API ERROR</div>
                    Vérifiez vos clés dans .env.local
                </div>
            ) : (
                <div className="text-xs text-grey-medium">
                    <div className="font-bold text-amber-500 flex items-center gap-2 mb-1"><Database size={12} /> SETUP REQUIS</div>
                    Table manquante. <button type="button" onClick={copySQL} className="text-primary hover:underline">Copier SQL</button>
                    <pre className="mt-2 bg-black/40 p-2 rounded text-[10px] overflow-hidden truncate">{SETUP_SQL}</pre>
                </div>
            )}
        </div>
    );
};
