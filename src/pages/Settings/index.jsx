import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import {
    User, Mail, School, Camera, Save, Loader2,
    Moon, Sun, Monitor, Palette, AlertTriangle, Trash2, Database, Sparkles, Settings as SettingsIcon,
    Key, Image, Activity, Layers, ArrowRight, ChevronDown
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';
import clsx from 'clsx';

// Import extracted hooks
import { useProfileSettings } from './hooks/useProfileSettings';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useCacheSettings } from './hooks/useCacheSettings';
import { usePhotoOptimization, formatBytes } from './hooks/usePhotoOptimization';

const Settings = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'systeme';

    const [activeTab, setActiveTab] = useState(initialTab);
    const { theme, setTheme } = useTheme();
    const { refreshProfile, pendingValidation } = useOutletContext() || {};

    // Use extracted hooks
    const {
        profile,
        setProfile,
        loadingProfile,
        updatingProfile,
        isDragging,
        setIsDragging,
        getProfile,
        updateProfile,
        handleFileChange,
        processFile
    } = useProfileSettings(refreshProfile);

    const {
        isResetting,
        isGenerating,
        showResetModal,
        setShowResetModal,
        showPasswordModal,
        setShowPasswordModal,
        passwordData,
        setPasswordData,
        updatingPassword,
        handleCheckAndFixProgressions,
        handleGenerateDemoData,
        handleHardReset,
        handleChangePassword
    } = useSystemSettings();

    const {
        cacheStats,
        cacheEnabled,
        loadCacheStats,
        handleClearCache,
        handleToggleCache,
        syncStats,
        loadSyncStats,
        handleClearSyncData,
        branches,
        allStudents,
        selectedBulkBranch,
        setSelectedBulkBranch,
        selectedBulkIndex,
        setSelectedBulkIndex,
        isUpdatingBulk,
        isLoadingBulkData,
        fetchBulkData,
        handleBulkUpdateIndices,
        handleBulkAdjustIndices
    } = useCacheSettings();

    const {
        isOptimizingPhotos,
        optimizationProgress,
        optimizationStats,
        photoAnalysis,
        isAnalyzing,
        showPhotoAnalysis,
        setShowPhotoAnalysis,
        handleAnalyzePhotos,
        handleOptimizeAllPhotos
    } = usePhotoOptimization(setProfile, refreshProfile);

    // Tab sync with URL
    useEffect(() => {
        if (activeTab === 'profil') getProfile();
    }, [activeTab]);

    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab && tab !== activeTab) setActiveTab(tab);
    }, [location.search]);

    useEffect(() => {
        if (activeTab === 'systeme') {
            loadSyncStats();
            fetchBulkData();
            if (cacheEnabled) loadCacheStats();
        }
    }, [activeTab, cacheEnabled]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/dashboard/settings?tab=${tabId}`, { replace: true });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-surface/50 border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shrink-0 pl-16">
                <div className="min-w-[200px]" />
                <div className="flex-1 flex justify-center">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-white/10 shadow-none">
                        <button
                            onClick={() => handleTabChange('systeme')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-none border-0 flex items-center gap-2",
                                activeTab === 'systeme' ? "bg-primary text-text-dark shadow-none" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <SettingsIcon size={16} /> Système
                        </button>
                        <button
                            onClick={() => handleTabChange('profil')}
                            className={clsx(
                                "px-8 py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-none border-0 flex items-center gap-2",
                                activeTab === 'profil' ? "bg-primary text-text-dark shadow-none" : "text-grey-medium hover:text-white hover:bg-white/5"
                            )}
                        >
                            <User size={16} /> Profil
                        </button>
                    </div>
                </div>
                <div className="min-w-[200px] flex justify-end">
                    <p className="text-[10px] text-grey-dark uppercase tracking-widest font-black opacity-50">Configuration</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    <div className="animate-in fade-in duration-500">

                        {/* --- PROFIL TAB --- */}
                        {activeTab === 'profil' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                {loadingProfile ? (
                                    <div className="h-64 flex items-center justify-center bg-surface/30 rounded-2xl border border-white/5">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                ) : (
                                    <form onSubmit={updateProfile} className="bg-surface/30 backdrop-blur-sm border border-white/5 rounded-2xl p-8 shadow-xl space-y-8">
                                        {/* Avatar Section */}
                                        <div className="flex flex-col items-center gap-4">
                                            <div
                                                className={clsx(
                                                    "w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center relative group overflow-hidden shadow-xl transition-all",
                                                    isDragging ? "border-primary bg-primary/20 scale-105" : "bg-white/5 border-white/20",
                                                    profile.photo_base64 && "bg-[#D9B981]"
                                                )}
                                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }}
                                            >
                                                {profile.photo_base64 ? (
                                                    <img src={profile.photo_base64} alt="Avatar" className="w-[90%] h-[90%] object-contain rounded-full shadow-inner" />
                                                ) : (
                                                    <User size={48} className={isDragging ? "text-primary animate-bounce" : "text-grey-medium"} />
                                                )}
                                                <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <Camera className="text-white mb-2" size={32} />
                                                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Modifier</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                                </label>
                                            </div>
                                            <p className="text-[10px] font-bold text-grey-medium uppercase tracking-wider">Photo de profil</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Prénom</label>
                                                <input
                                                    type="text"
                                                    value={profile.prenom}
                                                    onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                    placeholder="Votre prénom"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Nom</label>
                                                <input
                                                    type="text"
                                                    value={profile.nom}
                                                    onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                    placeholder="Votre nom"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                                                <Mail size={14} /> Email
                                            </label>
                                            <input type="email" value={profile.email} disabled className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-grey-dark cursor-not-allowed font-medium" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                                                <School size={14} /> Nom de l'école
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.nom_ecole}
                                                onChange={(e) => setProfile({ ...profile, nom_ecole: e.target.value })}
                                                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-grey-dark"
                                                placeholder="Ex: École Saint-Joseph"
                                            />
                                        </div>

                                        <div className="pt-4 flex justify-between items-center border-t border-white/5 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordModal(true)}
                                                className="text-xs text-primary hover:text-white transition-colors flex items-center gap-2 font-bold"
                                            >
                                                <Key size={14} /> Modifier le mot de passe
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={updatingProfile}
                                                className="px-8 py-3 bg-primary text-text-dark font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                                            >
                                                {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                Enregistrer les modifications
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {pendingValidation && (
                                    <div className="flex items-center justify-center gap-3 p-5 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner scale-in-fade duration-500">
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-xs text-grey-light font-medium">
                                            <span className="font-black text-primary uppercase tracking-widest">En attente de validation : </span>
                                            Votre accès complet sera débloqué après validation de l'administrateur.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- SYSTEME TAB --- */}
                        {activeTab === 'systeme' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Apparence */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Palette size={20} className="text-primary" /> Apparence
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { id: 'default', label: 'Défaut', icon: Palette },
                                            { id: 'light', label: 'Clair', icon: Sun },
                                            { id: 'dark', label: 'Sombre', icon: Moon },
                                            { id: 'neumo-2', label: 'Neumorphisme', icon: Sparkles },
                                            { id: 'glass', label: 'Vision', icon: Sparkles },
                                            { id: 'system', label: 'Système', icon: Monitor },
                                        ].map(t => {
                                            const Icon = t.icon;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id)}
                                                    className={clsx(
                                                        "flex flex-col items-center justify-center p-6 rounded-xl border transition-all gap-4 group",
                                                        theme === t.id ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/10 text-grey-medium hover:text-white"
                                                    )}
                                                >
                                                    <Icon size={24} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Environnement */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Database size={20} className="text-primary" /> Environnement
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Générer des données de test</h3>
                                                <p className="text-xs text-grey-medium">Créez une classe fictive avec des élèves et des activités.</p>
                                            </div>
                                            <button
                                                onClick={handleGenerateDemoData}
                                                disabled={isGenerating}
                                                className="w-full md:w-auto px-6 py-3 bg-primary text-text-dark font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                Générer
                                            </button>
                                        </div>

                                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Maintenance des Données</h3>
                                                <p className="text-xs text-grey-medium">Corrige les états de progression invalides.</p>
                                            </div>
                                            <button
                                                onClick={handleCheckAndFixProgressions}
                                                className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <SettingsIcon size={16} />
                                                Réparer
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bulk Index Update */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Layers size={20} className="text-primary" /> Mise à jour groupée des Indices
                                    </h2>
                                    <div className="p-6 bg-primary/5 rounded-xl border border-primary/10 space-y-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Branche</label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedBulkBranch}
                                                        onChange={(e) => setSelectedBulkBranch(e.target.value)}
                                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value="">Sélectionner une branche</option>
                                                        {branches.map(b => (
                                                            <option key={b.id} value={b.id}>{b.nom}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                                                        <ChevronDown size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-64 space-y-2">
                                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Indice de performance</label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedBulkIndex}
                                                        onChange={(e) => setSelectedBulkIndex(e.target.value)}
                                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer pr-10"
                                                    >
                                                        <option value={100}>100% (Tout vérifier)</option>
                                                        <option value={75}>75% (3/4)</option>
                                                        <option value={66}>66% (2/3)</option>
                                                        <option value={50}>50% (1/2)</option>
                                                        <option value={33}>33% (1/3)</option>
                                                        <option value={25}>25% (1/4)</option>
                                                        <option value={0}>0% (Aucun)</option>
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium">
                                                        <ChevronDown size={14} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-white/5 gap-4">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[11px] text-grey-medium leading-tight max-w-md">
                                                    <span className="text-warning font-bold">Attention:</span> Cette action modifiera l'indice pour <span className="text-white font-bold">{allStudents.length} élèves</span>.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                                                    <button
                                                        onClick={() => handleBulkAdjustIndices(-10)}
                                                        disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                                                        className="px-4 py-2 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-black disabled:opacity-30"
                                                    >
                                                        -10%
                                                    </button>
                                                    <button
                                                        onClick={() => handleBulkAdjustIndices(10)}
                                                        disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                                                        className="px-4 py-2 hover:bg-white/10 text-white rounded-lg transition-all text-[11px] font-black disabled:opacity-30"
                                                    >
                                                        +10%
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleBulkUpdateIndices}
                                                    disabled={isUpdatingBulk || isLoadingBulkData || !selectedBulkBranch}
                                                    className="flex-1 md:flex-none px-6 py-3 bg-primary text-text-dark font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                                >
                                                    {isUpdatingBulk ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                                    Fixer à {selectedBulkIndex}%
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Photo Optimization */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
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
                                                                style={{ width: `${(optimizationProgress.current / optimizationProgress.total) * 100}%` }}
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
                                            <button
                                                onClick={handleOptimizeAllPhotos}
                                                disabled={isOptimizingPhotos}
                                                className="w-full md:w-auto px-6 py-3 bg-primary text-text-dark font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {isOptimizingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
                                                Optimiser
                                            </button>
                                        </div>

                                        {/* Analysis Button */}
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Analyser les tailles</h3>
                                                <p className="text-xs text-grey-medium">Affiche un tableau détaillé des tailles de photos.</p>
                                            </div>
                                            <button
                                                onClick={handleAnalyzePhotos}
                                                disabled={isAnalyzing}
                                                className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                                                Analyser
                                            </button>
                                        </div>

                                        {/* Analysis Table */}
                                        {showPhotoAnalysis && photoAnalysis.length > 0 && (
                                            <div className="p-6 bg-background/50 rounded-xl border border-white/10 max-h-96 overflow-y-auto">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">Résultats de l'analyse</h4>
                                                    <button onClick={() => setShowPhotoAnalysis(false)} className="text-xs text-grey-medium hover:text-white">Fermer</button>
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
                                                            {photoAnalysis.map((student, idx) => (
                                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                                    <td className="p-2 text-white">{student.nom}</td>
                                                                    <td className="p-2 text-white">{student.prenom}</td>
                                                                    <td className="p-2 text-center">{student.hasPhoto ? <span className="text-success">✓</span> : <span className="text-grey-dark">✗</span>}</td>
                                                                    <td className="p-2 text-right font-mono text-white">{student.sizeFormatted}</td>
                                                                    <td className="p-2 text-center">
                                                                        {student.needsOptimization ? (
                                                                            <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded">À optimiser</span>
                                                                        ) : student.hasPhoto ? (
                                                                            <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">OK</span>
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
                                </div>

                                {/* Cache Management */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Database size={20} className="text-primary" /> Gestion du Cache Local
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Cache des photos</h3>
                                                <p className="text-xs text-grey-medium">Stocke les photos localement pour réduire la bande passante.</p>
                                                {cacheEnabled && (
                                                    <div className="mt-3 flex items-center gap-4 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-grey-light">Photos en cache:</span>
                                                            <span className="font-mono font-bold text-primary">{cacheStats.count}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-grey-light">Taille estimée:</span>
                                                            <span className="font-mono font-bold text-primary">{formatBytes(cacheStats.estimatedSize)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleToggleCache(!cacheEnabled)}
                                                    className={clsx("relative w-14 h-7 rounded-full transition-colors", cacheEnabled ? "bg-primary" : "bg-grey-dark")}
                                                >
                                                    <div className={clsx("absolute top-1 w-5 h-5 bg-white rounded-full transition-transform", cacheEnabled ? "right-1" : "left-1")} />
                                                </button>
                                                <span className="text-xs font-bold text-white">{cacheEnabled ? "Activé" : "Désactivé"}</span>
                                            </div>
                                        </div>

                                        {cacheEnabled && (
                                            <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider le cache</h3>
                                                    <p className="text-xs text-grey-medium">Supprime toutes les photos en cache.</p>
                                                </div>
                                                <button
                                                    onClick={handleClearCache}
                                                    className="w-full md:w-auto px-6 py-3 bg-danger/20 hover:bg-danger text-danger hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                                                >
                                                    <Trash2 size={16} />
                                                    Vider
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Delta Sync Management */}
                                <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
                                        <Activity size={20} className="text-primary" /> Synchronisation Incrémentale
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-white/5 rounded-xl border border-white/5">
                                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Delta Sync</h3>
                                            <p className="text-xs text-grey-medium mb-4">Charge uniquement les données modifiées depuis la dernière visite.</p>
                                            {syncStats.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-white uppercase tracking-wider">Dernières synchronisations :</p>
                                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                                        {syncStats.map((stat, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-xs bg-black/20 p-2 rounded">
                                                                <span className="font-mono text-primary">{stat.table}</span>
                                                                <span className="text-grey-light">{new Date(stat.lastSync).toLocaleString('fr-FR')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Réinitialiser la sync</h3>
                                                <p className="text-xs text-grey-medium">Force un rechargement complet des données.</p>
                                            </div>
                                            <button
                                                onClick={handleClearSyncData}
                                                className="w-full md:w-auto px-6 py-3 bg-danger/20 hover:bg-danger text-danger hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <Trash2 size={16} />
                                                Réinitialiser
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="bg-danger/5 backdrop-blur-md border border-danger/10 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-danger mb-6 flex items-center gap-2">
                                        <AlertTriangle size={20} /> Zone de Danger
                                    </h2>
                                    <div className="p-6 bg-danger/5 rounded-xl border border-danger/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Vider toutes les données</h3>
                                            <p className="text-xs text-grey-medium">Supprime définitivement vos élèves, classes et suivis.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowResetModal(true)}
                                            className="w-full md:w-auto px-6 py-3 bg-danger text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-danger/90 transition-all flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            <Trash2 size={16} /> Réinitialiser
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Effacer toutes les données ?</h2>
                        <p className="text-xs text-grey-medium mb-8 leading-relaxed">
                            Cette action supprimera tout votre contenu sauf votre profil. C'est irréversible.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-bold transition-all text-sm">Annuler</button>
                            <button onClick={handleHardReset} disabled={isResetting} className="flex-1 py-3 bg-danger text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                {isResetting ? <Loader2 size={14} className="animate-spin" /> : "Tout effacer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <Key size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white">Changer mon mot de passe</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Ancien mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.oldPassword}
                                    onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-grey-light uppercase tracking-wider ml-1">Confirmer le nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-bold transition-all text-sm"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingPassword}
                                    className="flex-1 py-3 bg-primary text-text-dark rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                                >
                                    {updatingPassword ? <Loader2 size={14} className="animate-spin" /> : "Mettre à jour"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
