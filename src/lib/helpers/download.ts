import { saveAs } from 'file-saver';

/**
 * Télécharge un fichier en utilisant l'API File System Access (showSaveFilePicker)
 * avec un fallback vers file-saver (saveAs).
 * 
 * @param blob Les données du fichier
 * @param suggestedName Le nom suggéré pour le fichier
 * @param mimeTypeDescription Description du type MIME (ex: 'Fichier Excel', 'PDF Document')
 */
/**
 * Obtient un handle de fichier via showSaveFilePicker (API moderne).
 * Doit être appelé suite à un geste utilisateur (clic).
 */
export const getFileHandle = async (
    suggestedName: string,
    mimeType: string,
    mimeTypeDescription: string = 'Fichier'
): Promise<any> => {
    try {
        if ('showSaveFilePicker' in window) {
            const extension = suggestedName.split('.').pop() || '';
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: mimeTypeDescription,
                    accept: { [mimeType]: [`.${extension}`] }
                }],
            });
            return handle;
        }
    } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn("L'API File System Access n'a pas pu être utilisée, passage au fallback tardif:", err);
    }
    return null;
};

/**
 * Écrit un blob dans un handle précédemment obtenu.
 */
export const writeToHandle = async (handle: any, blob: Blob): Promise<void> => {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
};

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
        if ('showSaveFilePicker' in window) {
            const handle = await getFileHandle(suggestedName, blob.type, mimeTypeDescription);
            if (handle) {
                await writeToHandle(handle, blob);
                return;
            }
        }
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn("Erreur avec downloadFile, utilisation du fallback FileSaver:", err);
    }

    saveAs(blob, suggestedName);
};
