import React from 'react';
import { Activity } from 'lucide-react';
import HelpRequestsPanel from '../../desktop/HelpRequestsPanel';

interface HelpColumnWrapperProps {
    helpRequests: any[];
    expandedRequestId: string | null;
    helpersCache: any;
    itemToDelete: any;
    onExpand: (id: string | null) => void;
    onStatusClick: (activityId: string, status: string, currentStatus?: string, studentId?: string) => void;
    onSetItemToDelete: (item: any) => void;
    onGenerateAutoSuivi: () => void;
}

export const HelpColumnWrapper: React.FC<HelpColumnWrapperProps> = ({
    helpRequests,
    expandedRequestId,
    helpersCache,
    itemToDelete,
    onExpand,
    onStatusClick,
    onSetItemToDelete,
    onGenerateAutoSuivi
}) => {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 h-[60px] flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-grey-medium">Suivi Personnalisé</span>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {helpRequests.length}
                </span>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <HelpRequestsPanel
                    helpRequests={helpRequests}
                    expandedRequestId={expandedRequestId}
                    helpersCache={helpersCache}
                    itemToDelete={itemToDelete}
                    onExpand={onExpand}
                    onStatusClick={onStatusClick}
                    onSetItemToDelete={onSetItemToDelete}
                />
            </div>
        </div>
    );
};
