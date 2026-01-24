import React from 'react';
import { Edit, X, ChevronRight, LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import Avatar, { AvatarProps } from './Avatar';

export interface ListItemProps {
    id: string;
    title: string;
    subtitle?: React.ReactNode;
    isSelected?: boolean;
    onClick?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    avatar?: Partial<AvatarProps>;
    badges?: React.ReactNode[];
    left?: React.ReactNode;
    rightIcon?: LucideIcon;
    className?: string;
    deleteTitle?: string;
    noTruncate?: boolean;
}

/**
 * ListItem - A generic list item component following the premium design system.
 * Used for students, groups, classes, etc.
 */
const ListItem: React.FC<ListItemProps> = ({
    title,
    subtitle,
    isSelected = false,
    onClick,
    onEdit,
    onDelete,
    avatar,
    badges,
    left,
    rightIcon: RightIcon = ChevronRight,
    className,
    deleteTitle = "Supprimer",
    noTruncate = false
}) => {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "w-full flex items-center gap-4 py-1.5 px-4 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                isSelected
                    ? "selected-state shadow-lg ring-1 ring-primary/20"
                    : "bg-surface/50 border-white/5 hover:border-white/10 hover:bg-surface",
                className
            )}
        >
            {/* Left Section (e.g. Drag Handle) */}
            {left && (
                <div onClick={(e) => e.stopPropagation()}>
                    {left}
                </div>
            )}

            {/* Avatar Section */}
            {avatar && (
                <div onClick={(e) => e.stopPropagation()}>
                    <Avatar
                        size="sm"
                        {...avatar}
                        className={clsx(
                            isSelected ? "bg-white/20" : "",
                            avatar.className
                        )}
                    />
                </div>
            )}

            {/* Content Section */}
            <div className="flex-1 min-w-0">
                <p className={clsx(
                    "font-semibold",
                    noTruncate ? "whitespace-normal overflow-visible" : "truncate",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {title}
                </p>
                {subtitle && (
                    <p className={clsx(
                        "text-xs mt-0.5",
                        noTruncate ? "whitespace-normal overflow-visible" : "truncate",
                        isSelected ? "text-text-dark/60 font-medium" : "text-grey-medium"
                    )}>
                        {subtitle}
                    </p>
                )}

                {/* Badges Section */}
                {badges && badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {badges}
                    </div>
                )}
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2">
                {onEdit && (
                    <div
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className={clsx(
                            "p-1.5 rounded-lg transition-all cursor-pointer",
                            isSelected
                                ? "opacity-100 text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                : "opacity-0 pointer-events-none text-grey-medium"
                        )}
                        title="Modifier"
                    >
                        <Edit size={14} />
                    </div>
                )}

                <RightIcon size={16} className={clsx(
                    "transition-transform",
                    isSelected ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                )} />
            </div>

            {/* Absolute Delete Button - Stylized like the student list */}
            {onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                    title={deleteTitle}
                >
                    <X size={14} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default ListItem;
