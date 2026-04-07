/**
 * Nom du module/fichier : PhotoOptimizationSection.tsx
 * 
 * Données en entrée : 
 *   - `optimizationProgress` : État de l'avancement (ex: 5 photos traitées sur 30).
 *   - `photoAnalysis` : Liste détaillée des fichiers images trouvés et de leur taille.
 * 
 * Données en sortie : 
 *   - Compression massive des images pour libérer de l'espace de stockage.
 * 
 * Objectif principal : Éviter que l'application ne devienne trop lourde à cause des photos d'élèves. Cette section permet d'analyser le poids de chaque image et de lancer une moulinette de compression automatique qui réduit les photos à une taille minuscule (100x100 pixels, max 10 Ko) tout en restant lisibles. C'est l'outil "gain de place" par excellence.
 * 
 * Ce que ça gère : 
 *   - L'affichage d'une barre de progression durant le traitement.
 *   - Un tableau détaillé montrant quel élève a une photo trop lourde.
 *   - Le calcul de l'espace total économisé après optimisation.
 */

import React from 'react';
import { Image, Database, X } from 'lucide-react';
import { Card, Button, Badge } from '../../../core';
import { formatBytes } from '../hooks/usePhotoOptimization';

interface PhotoOptimizationSectionProps {
    isOptimizingPhotos: boolean;
    optimizationProgress: { current: number; total: number };
    optimizationStats: { saved: number };
    photoAnalysis: any[];
    isAnalyzing: boolean;
    showPhotoAnalysis: boolean;
    setShowPhotoAnalysis: (show: boolean) => void;
    handleAnalyzePhotos: () => void | Promise<void>;
    handleOptimizeAllPhotos: () => void | Promise<void>;
}

/**
 * SECTION : Gestion du poids des images de classe.
 */
export const PhotoOptimizationSection: React.FC<PhotoOptimizationSectionProps> = ({
    isOptimizingPhotos,
    optimizationProgress,
    optimizationStats,
    photoAnalysis,
    isAnalyzing,
    showPhotoAnalysis,
    setShowPhotoAnalysis,
    handleAnalyzePhotos,
    handleOptimizeAllPhotos
}) => {
    // Calcul du pourcentage pour la barre de progression
    const progressPercent = optimizationProgress.total > 0
        ? (optimizationProgress.current / optimizationProgress.total) * 100
        : 0;

    return (
        <Card variant="glass" className="p-6">
            {/* Titre avec icône Image */}
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Image size={20} className="text-primary" /> Optimisation des Photos
            </h2>

            <div className="space-y-4">
                {/* BLOC 1 : Action de compression */}
                <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Compresser toutes les photos</h3>
                        <p className="text-xs text-grey-medium">Réduit la taille des photos à 100x100px et max 10 KO pour économiser votre stockage cloud.</p>
                        
                        {/* Barre de progression (visible uniquement pendant le travail) */}
                        {isOptimizingPhotos && optimizationProgress.total > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-grey-light mb-1">
                                    <span>Traitement en cours...</span>
                                    <span className="font-mono">{optimizationProgress.current}/{optimizationProgress.total}</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        {...{ style: { width: `${progressPercent}%` } as React.CSSProperties }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Résultat : Espace gagné */}
                        {optimizationStats.saved > 0 && !isOptimizingPhotos && (
                            <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                                <p className="text-xs text-success font-bold">
                                    ✓ Économie réalisée : {formatBytes(optimizationStats.saved)}
                                </p>
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleOptimizeAllPhotos}
                        loading={isOptimizingPhotos}
                        icon={Image}
                    >
                        Optimiser
                    </Button>
                </div>

                {/* BLOC 2 : Bouton d'Analyse (Simple lecture sans modification) */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Analyser les tailles</h3>
                        <p className="text-xs text-grey-medium">Affiche un tableau détaillé des tailles de photos pour chaque élève.</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleAnalyzePhotos}
                        loading={isAnalyzing}
                        icon={Database}
                    >
                        Analyser
                    </Button>
                </div>

                {/* TABLEAU DES RÉSULTATS (Caché par défaut) */}
                {showPhotoAnalysis && photoAnalysis.length > 0 && (
                    <div className="p-6 bg-background/50 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">Détails par élève</h4>
                            <button
                                aria-label="Fermer l'analyse"
                                onClick={() => setShowPhotoAnalysis(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={16} className="text-grey-medium" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-surface border-b border-white/10">
                                    <tr>
                                        <th className="text-left p-2 text-grey-light font-bold uppercase tracking-wider">Élève</th>
                                        <th className="text-center p-2 text-grey-light font-bold uppercase tracking-wider">Photo</th>
                                        <th className="text-right p-2 text-grey-light font-bold uppercase tracking-wider">Taille</th>
                                        <th className="text-center p-2 text-grey-light font-bold uppercase tracking-wider">État</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {photoAnalysis.map((student: any, idx: number) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-2 text-white">{student.prenom} {student.nom}</td>
                                            <td className="p-2 text-center">{student.hasPhoto ? <span className="text-success">✓</span> : <span className="text-grey-dark">✗</span>}</td>
                                            <td className="p-2 text-right font-mono text-white">{student.sizeFormatted}</td>
                                            <td className="p-2 text-center">
                                                {student.needsOptimization ? (
                                                    <Badge variant="warning" size="xs">Trop lourd</Badge>
                                                ) : student.hasPhoto ? (
                                                    <Badge variant="success" size="xs">Optimisé</Badge>
                                                ) : (
                                                    <span className="text-xs text-grey-dark">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

/**
 * LOGIGRAMME D'OPTIMISATION :
 * 
 * 1. ANALYSE -> L'enseignant lance une analyse pour voir l'état des lieux.
 * 2. DÉCISION -> Il voit des pastilles oranges "À optimiser".
 * 3. COMPRESSION -> Il clique sur "Optimiser". 
 * 4. BOUCLE -> L'application prend chaque photo, la réduit en mémoire, et remplace l'ancienne image lourde par la nouvelle légère sur le serveur.
 * 5. BILAN -> Une fois fini, le système affiche le gain total (ex: 5 Mo libérés).
 */
