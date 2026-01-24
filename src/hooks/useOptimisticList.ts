import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * useOptimisticList
 * 
 * Un hook générique pour gérer les listes avec des suppressions optimistes.
 * @param initialItems La liste initiale d'éléments
 * @param deleteFn La fonction de suppression à appeler sur le serveur
 * @param itemName Le nom de l'élément pour les messages toast (ex: "Élève")
 * @returns { items, setItems, handleDelete }
 */
export function useOptimisticList<T extends { id: string }>(
    initialItems: T[],
    deleteFn: (id: string) => Promise<any>,
    itemName: string = 'Élément'
) {
    const [items, setItems] = useState<T[]>(initialItems);

    // Mettre à jour les items si la liste initiale change (ex: après un fetch)
    const updateItems = useCallback((newItems: T[]) => {
        setItems(newItems);
    }, []);

    const handleDelete = useCallback(async (id: string, prenom?: string, nom?: string) => {
        const itemToDelete = items.find(item => item.id === id);
        if (!itemToDelete) return;

        const displayName = prenom || nom ? `${prenom} ${nom}`.trim() : itemName;

        // 1. Sauvegarde pour Rollback
        const previousItems = [...items];

        // 2. Mise à jour Optimiste
        setItems(prev => prev.filter(item => item.id !== id));

        try {
            await deleteFn(id);
            toast.success(`${displayName} supprimé avec succès`);
            return true;
        } catch (error: any) {
            // 3. Rollback sur erreur
            setItems(previousItems);
            toast.error(`Erreur lors de la suppression de ${displayName}: ` + error.message);
            return false;
        }
    }, [items, deleteFn, itemName]);

    return {
        items,
        setItems: updateItems,
        handleDelete
    };
}
