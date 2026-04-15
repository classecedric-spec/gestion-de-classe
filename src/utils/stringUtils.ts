/**
 * Normalise un titre (évaluation, question, etc.) :
 * - Supprime les espaces en début et fin de chaîne.
 * - Met la première lettre en majuscule.
 * - Ajoute un point final si la chaîne ne se termine pas déjà par une ponctuation (. ? !).
 * 
 * @param title Le titre à normaliser
 * @returns Le titre normalisé
 */
export function normalizeTitle(title: string | undefined | null): string {
    if (!title) return '';
    
    // Trim
    let t = title.trim();
    if (t.length === 0) return '';
    
    // Capitalize first letter
    t = t.charAt(0).toUpperCase() + t.slice(1);
    
    // Add period if no punctuation (. ? !) at the end
    if (!/[.!?]$/.test(t)) {
        t += '.';
    }
    
    return t;
}
