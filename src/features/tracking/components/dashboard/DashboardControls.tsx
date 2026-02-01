import React from 'react';
import { Users, Settings2, Maximize, Minimize, Check, Loader2 } from 'lucide-react';
import { Button } from '@/core';
import clsx from 'clsx';
import { Timer } from '../../hooks/useTimerIntegration';

interface DashboardControlsProps {
    isFullScreen: boolean;
    setFullScreen: (full: boolean) => void;
    onShowGroupSelector: () => void;
    isEditMode: boolean;
    setIsEditMode: (edit: boolean) => void;
    isSaving: boolean;
    showSyncSuccess: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
    isFullScreen,
    setFullScreen,
    onShowGroupSelector,
    isEditMode,
    setIsEditMode,
    isSaving,
    showSyncSuccess
}) => {

    const handleFullScreenToggle = () => {
        const element = document.documentElement;
        // @ts-ignore
        const currentFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

        if (!currentFs) {
            if (element.requestFullscreen) {
                element.requestFullscreen().then(() => setFullScreen(true)).catch(console.error);
                // @ts-ignore
            } else if (element.webkitRequestFullscreen) {
                // @ts-ignore
                element.webkitRequestFullscreen(); setFullScreen(true);
                // @ts-ignore
            } else if (element.mozRequestFullScreen) {
                // @ts-ignore
                element.mozRequestFullScreen(); setFullScreen(true);
                // @ts-ignore
            } else if (element.msRequestFullscreen) {
                // @ts-ignore
                element.msRequestFullscreen(); setFullScreen(true);
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setFullScreen(false)).catch(console.error);
                // @ts-ignore
            } else if (document.webkitExitFullscreen) {
                // @ts-ignore
                document.webkitExitFullscreen(); setFullScreen(false);
                // @ts-ignore
            } else if (document.mozCancelFullScreen) {
                // @ts-ignore
                document.mozCancelFullScreen(); setFullScreen(false);
                // @ts-ignore
            } else if (document.msExitFullscreen) {
                // @ts-ignore
                document.msExitFullscreen(); setFullScreen(false);
            }
        }
    };

    return (
        <div className="absolute top-4 right-4 z-[90] flex flex-col items-end gap-2 group">
            <div className={clsx("flex items-center gap-2 transition-opacity duration-300",
                // Allow visibility if edit mode is active or on hover
                isEditMode ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            )}>
                <Button
                    onClick={handleFullScreenToggle}
                    variant="secondary"
                    className="p-2.5 h-auto bg-surface/60 backdrop-blur-xl border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
                >
                    {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </Button>
                <Button
                    onClick={onShowGroupSelector}
                    variant="secondary"
                    className="p-2.5 h-auto bg-surface/60 backdrop-blur-xl border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    title="Changer de groupe"
                >
                    <Users size={20} />
                </Button>

                <Button
                    onClick={() => setIsEditMode(!isEditMode)}
                    variant={isEditMode ? "primary" : "secondary"}
                    className={clsx(
                        "p-2.5 h-auto backdrop-blur-xl transition-all",
                        isEditMode
                            ? "bg-primary text-black border-primary hover:bg-primary/90"
                            : "bg-surface/60 border-white/10 hover:border-primary/50 hover:text-white hover:bg-surface/80"
                    )}
                    title={isEditMode ? "Mode Édition" : "Ajuster Layout"}
                >
                    {isEditMode ? (
                        <Settings2 size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
                    ) : (
                        <Settings2 size={20} />
                    )}
                </Button>
            </div>

            {/* SAVING INDICATOR */}
            <div className={
                clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-500",
                    isSaving || showSyncSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )
            }>
                {
                    isSaving ? (
                        <>
                            <Loader2 size={10} className="animate-spin text-primary" />
                            <span className="text-[9px] font-bold text-grey-medium uppercase tracking-tighter">Enregistrement...</span>
                        </>
                    ) : showSyncSuccess && (
                        <>
                            <Check size={10} className="text-success" />
                            <span className="text-[9px] font-bold text-success uppercase tracking-tighter">Config. synchronisée</span>
                        </>
                    )
                }
            </div>
        </div>
    );
};
