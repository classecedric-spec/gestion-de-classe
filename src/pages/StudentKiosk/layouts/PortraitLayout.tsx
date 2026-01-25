import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

interface PortraitLayoutProps {
    children: React.ReactNode;
}

const PortraitLayout: React.FC<PortraitLayoutProps> = ({ children }) => {
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (isLandscape) {
        return (
            <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-surface/50 p-6 rounded-2xl border border-white/10 flex flex-col items-center gap-4 max-w-sm">
                    <Smartphone className="text-primary w-16 h-16 animate-pulse rotate-90" />
                    <h2 className="text-xl font-bold text-white">Mode Portrait Requis</h2>
                    <p className="text-grey-medium">
                        Pour une meilleure expérience, veuillez tourner votre tablette à la verticale.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background text-text-main font-outfit flex flex-col overflow-hidden">
            {children}
        </div>
    );
};

export default PortraitLayout;
