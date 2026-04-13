/**
 * Retourne la date du lundi de la semaine d'une date donnée (ou de la date actuelle par défaut)
 * au format ISO 'YYYY-MM-DD'.
 */
export function getMonday(d: Date = new Date()): string {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}
