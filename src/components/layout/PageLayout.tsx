import React from 'react';
import clsx from 'clsx';

interface PageLayoutProps {
    title?: string;
    subtitle?: string;
    leftContent?: React.ReactNode;
    centerContent?: React.ReactNode;
    rightContent?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    noOverflow?: boolean;
    headerClassName?: string;
}

/**
 * PageLayout - A generic template for all pages in Gestion de Classe.
 * Standardizes the header structure (Left, Center, Right) and content area.
 */
const PageLayout: React.FC<PageLayoutProps> = ({
    title,
    subtitle,
    leftContent,
    centerContent,
    rightContent,
    children,
    className,
    containerClassName,
    noOverflow = true,
    headerClassName
}) => {
    return (
        <div className={clsx(
            "flex flex-col h-full w-full bg-background transition-colors duration-500",
            noOverflow && "overflow-hidden",
            className
        )}>
            {/* Header Area - Balanced for Human & LLM readability */}
            <header className={clsx(
                "bg-surface/50 border-b border-white/5 px-6 py-4 flex items-center sticky top-0 z-40 backdrop-blur-md shrink-0 transition-all duration-300",
                headerClassName
            )}>
                {/* 1. Left Section: Primary Branding or Action */}
                <div className="flex-1 flex items-center justify-start min-w-0">
                    {leftContent || (title && (
                        <div className="z-10 truncate pr-4">
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider mb-0.5 truncate drop-shadow-sm">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-sm font-medium text-grey-medium truncate opacity-80 uppercase tracking-widest">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* 2. Center Section: Navigation (Tabs, Search) */}
                {centerContent && (
                    <div className="flex items-center gap-4 px-2">
                        {centerContent}
                    </div>
                )}

                {/* 3. Right Section: Utility actions (Clock, Timer, Profile) */}
                <div className="flex-1 flex justify-end items-center gap-6 min-w-0">
                    {rightContent}
                </div>
            </header>

            {/* Content Area - Where the page magic happens */}
            <main className={clsx(
                "flex-1 min-h-0 relative",
                noOverflow && "overflow-hidden",
                containerClassName
            )}>
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
