import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Avatar, SuspenseLoader } from '../../../core';
import { ClipboardList, Users } from 'lucide-react';
import { responsabiliteService } from '../services/responsabiliteService';
import { useAuth } from '../../../hooks/useAuth';
import { getInitials } from '../../../lib/helpers';

interface ResponsibilityOverviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ResponsibilityOverviewModal: React.FC<ResponsibilityOverviewModalProps> = ({
    isOpen,
    onClose
}) => {
    const { session } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['responsibilities', session?.user.id],
        queryFn: () => responsabiliteService.getResponsibilities(session!.user.id),
        enabled: !!session?.user.id && isOpen,
    });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tableau des Responsabilités"
            className="!max-w-[1000px] !h-[80vh]"
        >
            {isLoading ? (
                <div className="h-full flex items-center justify-center">
                    <SuspenseLoader />
                </div>
            ) : tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-grey-medium p-12 text-center">
                    <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-xl font-bold text-white mb-2">Aucune responsabilité définie</p>
                    <p>Rendez-vous dans la page "Responsabilités" pour commencer.</p>
                </div>
            ) : (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-xs text-grey-medium">Tableau des Responsabilités</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                        {tasks.map(task => (
                            <div key={task.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group flex flex-col h-full">
                                <h4 className="text-xl font-black text-white mb-4 group-hover:text-primary transition-colors">{task.titre}</h4>
                                <div className="flex flex-wrap gap-4 mt-auto">
                                    {task.eleves && task.eleves.length > 0 ? (
                                        task.eleves.map(assignment => (
                                            <div key={assignment.id} className="flex flex-col items-center gap-2 group/avatar">
                                                <Avatar
                                                    size="md"
                                                    initials={getInitials(assignment.eleve as any)}
                                                    src={assignment.eleve.photo_url}
                                                    className="ring-2 ring-transparent group-hover/avatar:ring-primary/50 transition-all shadow-premium"
                                                />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-grey-light text-center w-20 truncate">
                                                    {assignment.eleve.prenom}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-2 text-grey-dark py-2">
                                            <Users className="w-4 h-4 opacity-50" />
                                            <span className="text-xs font-bold uppercase tracking-widest italic opacity-50">Aucun élève</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ResponsibilityOverviewModal;
