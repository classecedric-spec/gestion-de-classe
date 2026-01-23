import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { compressImage, formatBytes, needsCompression } from '../../../lib/storage';
import { toast } from 'sonner';

interface OptimizationProgress {
    current: number;
    total: number;
}

interface OptimizationStats {
    before: number;
    after: number;
    saved: number;
}

interface PhotoAnalysisItem {
    nom: string;
    prenom: string;
    hasPhoto: boolean;
    sizeBytes: number;
    sizeFormatted: string;
    needsOptimization: boolean;
}

/**
 * usePhotoOptimization
 * 
 * Hook pour :
 * - Analyser les photos des élèves
 * - Optimiser (compresser) toutes les photos
 */
export const usePhotoOptimization = (setProfile?: React.Dispatch<React.SetStateAction<any>>, refreshProfile?: () => void) => {
    const [isOptimizingPhotos, setIsOptimizingPhotos] = useState(false);
    const [optimizationProgress, setOptimizationProgress] = useState<OptimizationProgress>({ current: 0, total: 0 });
    const [optimizationStats, setOptimizationStats] = useState<OptimizationStats>({ before: 0, after: 0, saved: 0 });

    const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showPhotoAnalysis, setShowPhotoAnalysis] = useState(false);

    // Analyse les photos pour voir lesquelles ont besoin d'optimisation
    const handleAnalyzePhotos = useCallback(async () => {
        setIsAnalyzing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            const { data: students, error } = await supabase
                .from('Eleve')
                .select('id, nom, prenom, photo_url')
                .eq('titulaire_id', user.id)
                .order('nom', { ascending: true });

            if (error) throw error;

            const analysis: PhotoAnalysisItem[] = students?.map((s: any) => {
                const size = s.photo_base64 ? (s.photo_base64.split(',')[1] || s.photo_base64).length * 0.75 : 0;
                return {
                    nom: s.nom || 'N/A',
                    prenom: s.prenom || 'N/A',
                    hasPhoto: !!s.photo_base64,
                    sizeBytes: size,
                    sizeFormatted: formatBytes(size),
                    needsOptimization: size > 10 * 1024 // Plus de 10KB
                };
            }) || [];

            setPhotoAnalysis(analysis);
            setShowPhotoAnalysis(true);
        } catch (error: any) {
            toast.error("Erreur lors de l'analyse: " + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Optimise toutes les photos (élèves + profil)
    const handleOptimizeAllPhotos = useCallback(async () => {
        setIsOptimizingPhotos(true);
        const toastId = toast.loading("Optimisation des photos en cours...");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            let totalBefore = 0;
            let totalAfter = 0;
            let optimizedCount = 0;

            // 1. Photos des élèves
            const { data: students, error: studentsError } = await supabase
                .from('Eleve')
                .select('id, photo_url')
                .not('photo_url', 'is', null)
                .eq('titulaire_id', user.id);

            if (studentsError) throw studentsError;

            // 2. Photo du profil
            const { data: profile, error: profileError } = await supabase
                .from('CompteUtilisateur')
                .select('id, photo_url')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            const allPhotos: { type: 'student' | 'profile', id: string, photo: string }[] = [];

            // Ajouter les photos qui ont besoin d'optimisation
            students?.forEach((s: any) => {
                if (s.photo_base64 && needsCompression(s.photo_base64, 10)) {
                    allPhotos.push({ type: 'student', id: s.id, photo: s.photo_base64 });
                }
            });

            if (profile?.photo_base64 && needsCompression(profile.photo_base64, 10)) {
                allPhotos.push({ type: 'profile', id: profile.id, photo: profile.photo_base64 });
            }

            setOptimizationProgress({ current: 0, total: allPhotos.length });

            if (allPhotos.length === 0) {
                toast.success("Toutes les photos sont déjà optimisées !", { id: toastId });
                setIsOptimizingPhotos(false);
                return;
            }

            // 3. Compresser chaque photo
            for (let i = 0; i < allPhotos.length; i++) {
                const item = allPhotos[i];

                const originalSize = (item.photo.split(',')[1] || item.photo).length * 0.75;
                totalBefore += originalSize;

                const compressed = await compressImage(item.photo, 100, 100, 10);
                const compressedSize = (compressed.split(',')[1] || compressed).length * 0.75;
                totalAfter += compressedSize;

                // Mettre à jour la base de données
                if (item.type === 'student') {
                    await supabase
                        .from('Eleve')
                        .update({ photo_base64: compressed })
                        .eq('id', item.id);
                } else {
                    await supabase
                        .from('CompteUtilisateur')
                        .update({ photo_base64: compressed })
                        .eq('id', item.id);

                    // Mettre à jour l'état local du profil
                    if (setProfile) {
                        setProfile((prev: any) => ({ ...prev, photo_base64: compressed }));
                    }
                }

                optimizedCount++;
                setOptimizationProgress({ current: i + 1, total: allPhotos.length });
            }

            const saved = totalBefore - totalAfter;
            setOptimizationStats({
                before: totalBefore,
                after: totalAfter,
                saved: saved
            });

            toast.success(
                `${optimizedCount} photo(s) optimisée(s) ! Économie: ${formatBytes(saved)}`,
                { id: toastId, duration: 5000 }
            );

            if (refreshProfile) refreshProfile();

        } catch (error: any) {
            toast.error("Erreur lors de l'optimisation: " + error.message, { id: toastId });
        } finally {
            setIsOptimizingPhotos(false);
            setOptimizationProgress({ current: 0, total: 0 });
        }
    }, [setProfile, refreshProfile]);

    return {
        isOptimizingPhotos,
        optimizationProgress,
        optimizationStats,
        photoAnalysis,
        isAnalyzing,
        showPhotoAnalysis,
        setShowPhotoAnalysis,
        handleAnalyzePhotos,
        handleOptimizeAllPhotos
    };
};

// Re-export formatBytes pour utilisation dans le composant
export { formatBytes };
