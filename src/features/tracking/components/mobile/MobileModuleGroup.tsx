import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import MobileRequestCard from './MobileRequestCard'; // Reusing the existing card
import { ProgressionWithDetails, StudentBasicInfo } from '../../services/trackingService';

interface MobileModuleGroupProps {
    studentId: string;
    studentName: string;
    requests: ProgressionWithDetails[];
    expandedRequestId: string | null;
    helpersCache: Record<string, StudentBasicInfo[]>;
    onExpandHelp: (requestId: string, activityId: string | undefined) => void;
    onStatusUpdate: (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => void;
    onClear: (req: ProgressionWithDetails) => void;
}

const MobileModuleGroup: React.FC<MobileModuleGroupProps> = ({
    studentName,
    requests,
    expandedRequestId,
    helpersCache,
    onExpandHelp,
    onStatusUpdate,
    onClear
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-surface/50 border border-white/5 rounded-xl overflow-hidden mb-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-light transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={16} />
                    </div>
                    <span className="font-bold text-sm text-white">{studentName}</span>
                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-grey-light">
                        {requests.length}
                    </span>
                </div>
                {isExpanded ? <ChevronDown size={20} className="text-grey-medium" /> : <ChevronRight size={20} className="text-grey-medium" />}
            </button>

            {isExpanded && (
                <div className="p-3 space-y-3 bg-black/20 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                    {requests.map(req => (
                        <MobileRequestCard
                            key={req.id}
                            req={req}
                            isExpanded={expandedRequestId === req.id}
                            helpers={helpersCache[req.id]}
                            onExpand={onExpandHelp}
                            onStatusUpdate={onStatusUpdate}
                            onClear={onClear}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MobileModuleGroup;
