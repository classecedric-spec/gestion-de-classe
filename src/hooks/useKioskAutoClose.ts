/**
 * ============================================================
 * HOOK : useKioskAutoClose
 * ============================================================
 * Rôle : Sécurité horaire des kiosques.
 *        Vérifie toutes les 30 secondes si l'heure actuelle
 *        (en heure de Bruxelles, Europe/Brussels) est >= 16h00.
 *        Si oui, retourne isClosed = true pour que le kiosque
 *        affiche un écran de fermeture automatique.
 *
 * Paramètres :
 *   - closeHour (optionnel, défaut = 16) : heure de fermeture
 *
 * Retourne :
 *   - isClosed  : boolean — true si le kiosque doit être fermé
 *   - timeNow   : string  — heure actuelle formatée (HH:MM)
 * ============================================================
 */

import { useState, useEffect } from 'react';

const BRUSSELS_TIMEZONE = 'Europe/Brussels';

function getBrusselsHour(): number {
    const now = new Date();
    // Récupère l'heure locale de Bruxelles
    const hour = parseInt(
        new Intl.DateTimeFormat('fr-BE', {
            timeZone: BRUSSELS_TIMEZONE,
            hour: '2-digit',
            hour12: false,
        }).format(now),
        10
    );
    return hour;
}

function getBrusselsTimeString(): string {
    const now = new Date();
    return new Intl.DateTimeFormat('fr-BE', {
        timeZone: BRUSSELS_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(now);
}

interface UseKioskAutoCloseOptions {
    closeHour?: number; // heure de fermeture (défaut : 16)
}

interface UseKioskAutoCloseResult {
    isClosed: boolean;
    timeNow: string;
}

export function useKioskAutoClose(
    options: UseKioskAutoCloseOptions = {}
): UseKioskAutoCloseResult {
    const { closeHour = 16 } = options;

    const [isClosed, setIsClosed] = useState<boolean>(
        () => getBrusselsHour() >= closeHour
    );
    const [timeNow, setTimeNow] = useState<string>(getBrusselsTimeString);

    useEffect(() => {
        const check = () => {
            const hour = getBrusselsHour();
            setIsClosed(hour >= closeHour);
            setTimeNow(getBrusselsTimeString());
        };

        // Vérification immédiate puis toutes les 30 secondes
        check();
        const interval = setInterval(check, 30_000);
        return () => clearInterval(interval);
    }, [closeHour]);

    return { isClosed, timeNow };
}
