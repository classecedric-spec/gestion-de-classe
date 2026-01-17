import { useState, useEffect, useMemo, useCallback } from 'react';
import { adultService } from '../services/adultService';
import { toast } from 'sonner';

export const useAdults = () => {
    const [adults, setAdults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAdults = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adultService.fetchAdults();
            setAdults(data);
        } catch (error) {
            console.error("Error fetching adults:", error);
            toast.error("Erreur lors du chargement des adultes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdults();
    }, [fetchAdults]);

    const filteredAdults = useMemo(() => {
        return adults.filter(a =>
            a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.prenom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [adults, searchTerm]);

    const createAdult = async (adultData) => {
        try {
            const newAdult = await adultService.createAdult(adultData);
            setAdults(prev => [...prev, newAdult].sort((a, b) => a.nom.localeCompare(b.nom)));
            toast.success("Adulte ajouté");
            return true;
        } catch (error) {
            console.error("Error creating adult:", error);
            toast.error("Erreur lors de la création de l'adulte");
            return false;
        }
    };

    const updateAdult = async (id, adultData) => {
        try {
            const updatedAdult = await adultService.updateAdult(id, adultData);
            setAdults(prev => prev.map(a => a.id === id ? updatedAdult : a));
            toast.success("Profil mis à jour");
            return true;
        } catch (error) {
            console.error("Error updating adult:", error);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteAdult = async (id) => {
        try {
            await adultService.deleteAdult(id);
            setAdults(prev => prev.filter(a => a.id !== id));
            toast.success("Adulte supprimé");
            return true;
        } catch (error) {
            console.error("Error deleting adult:", error);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    return {
        adults,
        loading,
        searchTerm,
        setSearchTerm,
        filteredAdults,
        fetchAdults,
        createAdult,
        updateAdult,
        deleteAdult
    };
};
