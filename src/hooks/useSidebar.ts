import { useState, useEffect } from 'react';

/**
 * Hook for managing sidebar state
 */
export function useSidebar() {
    const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsOpen(false);
            } else {
                setIsOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { isOpen, setIsOpen };
}
