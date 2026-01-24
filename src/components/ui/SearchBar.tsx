import React, { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
    className?: string;
    iconColor?: string;
}

/**
 * SearchBar Component
 * Barre de recherche stylisée avec icône intégrée.
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(({
    className,
    iconColor = "text-primary", // Par défaut "doré" (primary) comme demandé
    ...props
}, ref) => {
    return (
        <div className={clsx("relative group flex-1", className)}>
            <Search
                className={clsx(
                    "absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10",
                    iconColor,
                    // Effet de surbrillance supplémentaire au focus si désiré, sinon couleur fixe
                    // "group-focus-within:text-primary"
                )}
                size={18}
            />
            <input
                ref={ref}
                type="text"
                className={clsx(
                    "w-full input-inset rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-main",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "transition-all border border-transparent focus:border-primary/50",
                    "placeholder:text-grey-medium"
                )}
                {...props}
            />
        </div>
    );
});

SearchBar.displayName = "SearchBar";
