import React from 'react';
import PropTypes from 'prop-types';
import { Folder, Sparkles } from 'lucide-react';
import clsx from 'clsx';

/**
 * ModuleHeader
 * Displays module title, status badge, and action buttons
 */
const ModuleHeader = ({ module, onToggleStatus, onCreateSeries }) => {
    const statusConfig = {
        en_cours: {
            bg: 'bg-success/20',
            text: 'text-success',
            border: 'border-success/30',
            label: 'En cours'
        },
        archive: {
            bg: 'bg-danger/20',
            text: 'text-danger',
            border: 'border-danger/30',
            label: 'Archive'
        },
        en_preparation: {
            bg: 'bg-primary/20',
            text: 'text-primary',
            border: 'border-primary/30',
            label: 'En préparation'
        }
    };

    const currentStatus = module.statut || 'en_preparation';
    const config = statusConfig[currentStatus] || statusConfig.en_preparation;

    return (
        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
            <div className="flex gap-6 items-center">
                <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0">
                    <Folder size={48} />
                </div>
                <div>
                    <h1 className="text-4xl font-bold text-text-main mb-2">{module.nom}</h1>
                    <div className="flex items-center gap-4 text-grey-medium">
                        {module.SousBranche && (
                            <span className="text-sm text-grey-medium font-medium flex items-center gap-2">
                                {module.SousBranche.Branche && `${module.SousBranche.Branche.nom} - `}
                                {module.SousBranche.nom}
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <button
                            onClick={() => onToggleStatus(module)}
                            className="transition-transform active:scale-95 focus:outline-none"
                        >
                            <span className={clsx(
                                "px-3 py-1 text-[10px] font-bold uppercase rounded-lg border cursor-pointer hover:opacity-80 transition-colors tracking-wider",
                                config.bg,
                                config.text,
                                config.border
                            )}>
                                {config.label}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 items-center">
                <button
                    onClick={onCreateSeries}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-text-dark text-[11px] font-bold uppercase rounded-lg border border-primary/20 transition-all active:scale-95"
                >
                    <Sparkles size={14} />
                    Créer une série
                </button>
            </div>
        </div>
    );
};

ModuleHeader.propTypes = {
    module: PropTypes.shape({
        nom: PropTypes.string.isRequired,
        statut: PropTypes.string,
        SousBranche: PropTypes.object
    }).isRequired,
    onToggleStatus: PropTypes.func.isRequired,
    onCreateSeries: PropTypes.func.isRequired
};

export default ModuleHeader;
