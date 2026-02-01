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
    handleAnalyzePhotos: () => Promise<void>;
    handleOptimizeAllPhotos: () => Promise<void>;
}

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
    const progressPercent = optimizationProgress.total > 0
        ? (optimizationProgress.current / optimizationProgress.total) * 100
        : 0;

    return (
        <Card variant="glass" className="p-6">
            <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                <Image size={20} className="text-primary" /> Optimisation des Photos
            </h2>
            <div className="space-y-4">
                <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Compresser toutes les photos</h3>
                        <p className="text-xs text-grey-medium">Réduit la taille des photos à 100x100px et max 10 KB.</p>
                        {isOptimizingPhotos && optimizationProgress.total > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-grey-light mb-1">
                                    <span>Progression</span>
                                    <span className="font-mono">{optimizationProgress.current}/{optimizationProgress.total}</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        {optimizationStats.saved > 0 && !isOptimizingPhotos && (
                            <div className="mt-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                                <p className="text-xs text-success font-bold">
                                    ✓ Économie: {formatBytes(optimizationStats.saved)}
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

                {/* Analysis Button */}
                <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Analyser les tailles</h3>
                        <p className="text-xs text-grey-medium">Affiche un tableau détaillé des tailles de photos.</p>
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

                {/* Analysis Table */}
                {showPhotoAnalysis && photoAnalysis.length > 0 && (
                    <div className="p-6 bg-background/50 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-tight">Résultats de l'analyse</h4>
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
                                        <th className="text-left p-2 text-grey-light font-bold uppercase tracking-wider">Nom</th>
                                        <th className="text-left p-2 text-grey-light font-bold uppercase tracking-wider">Prénom</th>
                                        <th className="text-center p-2 text-grey-light font-bold uppercase tracking-wider">Photo</th>
                                        <th className="text-right p-2 text-grey-light font-bold uppercase tracking-wider">Taille</th>
                                        <th className="text-center p-2 text-grey-light font-bold uppercase tracking-wider">État</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {photoAnalysis.map((student: any, idx: number) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-2 text-white">{student.nom}</td>
                                            <td className="p-2 text-white">{student.prenom}</td>
                                            <td className="p-2 text-center">{student.hasPhoto ? <span className="text-success">✓</span> : <span className="text-grey-dark">✗</span>}</td>
                                            <td className="p-2 text-right font-mono text-white">{student.sizeFormatted}</td>
                                            <td className="p-2 text-center">
                                                {student.needsOptimization ? (
                                                    <Badge variant="warning" size="xs">À optimiser</Badge>
                                                ) : student.hasPhoto ? (
                                                    <Badge variant="success" size="xs">OK</Badge>
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
