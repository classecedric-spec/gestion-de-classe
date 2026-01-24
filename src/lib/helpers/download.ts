import { saveAs } from 'file-saver';

/**
 * Télécharge un fichier en utilisant l'API File System Access (showSaveFilePicker)
 * avec un fallback vers file-saver (saveAs).
 * 
 * @param blob Les données du fichier
 * @param suggestedName Le nom suggéré pour le fichier
 * @param mimeTypeDescription Description du type MIME (ex: 'Fichier Excel', 'PDF Document')
 */
export const downloadFile = async (
    blob: Blob,
    suggestedName: string,
    mimeTypeDescription: string = 'Fichier'
): Promise<void> => {
    try {
        // Tentative d'utilisation de l'API moderne si supportée (Chrome/Edge/Safari récent)
        if ('showSaveFilePicker' in window) {
            const extension = suggestedName.split('.').pop() || '';
            const mimeType = blob.type;

            const handle = await (window as any).showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: mimeTypeDescription,
                    accept: { [mimeType]: [`.${extension}`] }
                }],
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        }
    } catch (err: any) {
        // L'utilisateur a annulé la fenêtre de dialogue ou erreur de geste utilisateur (si le délai est trop long)
        if (err.name === 'AbortError' || err.name === 'SecurityError') return;
        console.warn("Erreur inattendue avec showSaveFilePicker, utilisation du fallback:", err);
    }

    // Fallback standard
    saveAs(blob, suggestedName);
};
