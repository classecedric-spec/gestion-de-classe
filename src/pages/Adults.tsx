import React, { useState, useRef, useLayoutEffect } from 'react';
import { useAdults } from '../features/adults/hooks/useAdults';
import { useActivityTypes } from '../features/adults/hooks/useActivityTypes';
import { Badge, EmptyState, Avatar, ListItem, CardInfo, CardList, CardTabs, ConfirmModal, Input, InfoSection, InfoRow } from '../components/ui';
import { User, Activity, Plus, Search, BookOpen, Clock, ChevronDown, Save, X, ShieldCheck } from 'lucide-react';
import type { Database } from '../types/supabase';

type AdultRow = Database['public']['Tables']['Adulte']['Row'];

const Adults: React.FC = () => {
    // Hooks
    const {
        loading: loadingAdults,
        searchTerm,
        setSearchTerm,
        filteredAdults,
        createAdult,
        updateAdult,
        deleteAdult
    } = useAdults();

    const {
        activityTypes,
        loading: loadingActivities,
        createActivityType,
        updateActivityType,
        deleteActivityType
    } = useActivityTypes();

    const [selectedAdult, setSelectedAdult] = useState<AdultRow | null>(null);
    const [activeTab, setActiveTab] = useState<'types' | 'details'>('types');

    // Modals state
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [isEditingAdult, setIsEditingAdult] = useState(false);
    const [currentAdultForm, setCurrentAdultForm] = useState<any>({ nom: '', prenom: '', fonction: '' });
    const [adultToDelete, setAdultToDelete] = useState<AdultRow | null>(null);

    const [showActivityModal, setShowActivityModal] = useState(false);
    const [isEditingActivity, setIsEditingActivity] = useState(false);
    const [currentActivityForm, setCurrentActivityForm] = useState<any>({ label: '' });
    const [activityToDelete, setActivityToDelete] = useState<any>(null);

    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        return () => clearTimeout(t);
    }, [filteredAdults.length, selectedAdult, searchTerm]);

    // Handlers: Adults
    const handleOpenAddAdult = () => {
        setCurrentAdultForm({ nom: '', prenom: '', fonction: '' });
        setIsEditingAdult(false);
        setShowAdultModal(true);
    };

    const handleOpenEditAdult = (e: React.MouseEvent, adult: AdultRow) => {
        e.stopPropagation();
        setCurrentAdultForm({ ...adult, fonction: (adult as any).fonction || '' });
        setIsEditingAdult(true);
        setShowAdultModal(true);
    };

    const handleAdultSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { nom: currentAdultForm.nom, prenom: currentAdultForm.prenom };
        let success = false;
        if (isEditingAdult && currentAdultForm.id) {
            success = await updateAdult(currentAdultForm.id, payload as any);
        } else {
            success = await createAdult(payload as any);
        }
        if (success) setShowAdultModal(false);
    };

    const handleDeleteAdultConfirm = async () => {
        if (adultToDelete) {
            await deleteAdult(adultToDelete.id);
            if (selectedAdult?.id === adultToDelete.id) setSelectedAdult(null);
            setAdultToDelete(null);
        }
    };

    // Handlers: Activities
    const handleOpenAddActivity = () => {
        setCurrentActivityForm({ label: '' });
        setIsEditingActivity(false);
        setShowActivityModal(true);
    };

    const handleOpenEditActivity = (act: any) => {
        setCurrentActivityForm(act);
        setIsEditingActivity(true);
        setShowActivityModal(true);
    };

    const handleActivitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;
        if (isEditingActivity && currentActivityForm.id) {
            success = await updateActivityType(currentActivityForm.id, currentActivityForm.label || '');
        } else {
            success = await createActivityType(currentActivityForm.label || '');
        }
        if (success) setShowActivityModal(false);
    };

    const handleDeleteActivityConfirm = async () => {
        if (activityToDelete) {
            await deleteActivityType(activityToDelete.id);
            setActivityToDelete(null);
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in duration-500 relative">
            {/* Left Column: List */}
            <div className="w-80 flex flex-col gap-6 h-full">
                <CardInfo ref={leftContentRef} height={headerHeight}>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-text-main flex items-center gap-2">
                                <User size={24} className="text-secondary" />
                                Adultes
                            </h2>
                            <Badge variant="primary" size="sm" className="bg-secondary/20 text-secondary border-none">
                                {filteredAdults.length}
                            </Badge>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-secondary transition-colors" size={18} />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/5 border-white/5 focus:bg-white/10"
                            />
                        </div>
                    </div>
                </CardInfo>

                <CardList
                    actionLabel="Nouvel Adulte"
                    onAction={handleOpenAddAdult}
                    actionIcon={Plus}
                >
                    {loadingAdults ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                            <Avatar size="lg" loading initials="" />
                            <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                        </div>
                    ) : filteredAdults.length === 0 ? (
                        <EmptyState
                            icon={User}
                            title="Aucun adulte"
                            description={searchTerm ? "Aucun adulte ne correspond." : "Commencez par ajouter un adulte."}
                            size="sm"
                        />
                    ) : (
                        <div className="space-y-1 flex-1">
                            {filteredAdults.map((adult) => (
                                <ListItem
                                    key={adult.id}
                                    id={adult.id}
                                    title={`${adult.prenom} ${adult.nom}`}
                                    subtitle={(adult as any).fonction}
                                    isSelected={selectedAdult?.id === adult.id}
                                    onClick={() => setSelectedAdult(adult)}
                                    onEdit={() => handleOpenEditAdult({ stopPropagation: () => { } } as any, adult)}
                                    onDelete={() => setAdultToDelete(adult)}
                                    avatar={{
                                        initials: `${adult.prenom?.[0]}${adult.nom?.[0]}`,
                                        className: "bg-surface"
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </CardList>
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 flex flex-col gap-6 h-full min-w-0">
                {!selectedAdult ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={User}
                            title="Sélectionnez un adulte"
                            description="Choisissez un adulte dans la liste pour voir les détails et types d'actions."
                            size="lg"
                        />
                    </div>
                ) : (
                    <>
                        <CardInfo ref={rightContentRef} height={headerHeight}>
                            <div className="flex gap-6 items-center">
                                <Avatar
                                    size="xl"
                                    initials={`${selectedAdult.prenom?.[0]}${selectedAdult.nom?.[0]}`}
                                    className="bg-surface"
                                />
                                <div className="min-w-0">
                                    <h1 className="text-cq-xl font-black text-text-main mb-1 tracking-tight truncate">{selectedAdult.prenom} {selectedAdult.nom}</h1>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="primary" size="sm" className="border border-secondary/20 text-secondary">
                                            {(selectedAdult as any).fonction || 'Adulte'}
                                        </Badge>
                                        <div className="w-1 h-1 rounded-full bg-grey-dark" />
                                        <p className="text-grey-medium text-sm font-medium">
                                            Équipe pédagogique
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardInfo>

                        <CardTabs
                            tabs={[
                                { id: 'types', label: "Types d'actions", icon: Activity },
                                { id: 'details', label: 'Informations', icon: BookOpen }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                            actionLabel={activeTab === 'types' ? "Nouveau type" : undefined}
                            onAction={activeTab === 'types' ? handleOpenAddActivity : undefined}
                            actionIcon={Plus}
                        >
                            {activeTab === 'types' ? (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto px-2 pt-2 custom-scrollbar">
                                        {loadingActivities ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                <Avatar size="lg" loading initials="" />
                                                <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                                            </div>
                                        ) : activityTypes.length === 0 ? (
                                            <EmptyState
                                                icon={Activity}
                                                title="Aucun type"
                                                description="Aucun type d'action configuré."
                                                size="md"
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {activityTypes.map(act => (
                                                    <ListItem
                                                        key={act.id}
                                                        id={act.id}
                                                        title={act.label}
                                                        avatar={{
                                                            icon: Activity,
                                                            className: "bg-background text-primary"
                                                        }}
                                                        onEdit={() => handleOpenEditActivity(act)}
                                                        onDelete={() => setActivityToDelete(act)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoSection title="Profil de l'Adulte">
                                        <InfoRow
                                            icon={User}
                                            label="Nom complet"
                                            value={`${selectedAdult.prenom} ${selectedAdult.nom}`}
                                        />
                                        <InfoRow
                                            icon={ShieldCheck}
                                            label="Fonction"
                                            value={(selectedAdult as any).fonction || 'Non définie'}
                                        />
                                        <InfoRow
                                            icon={Clock}
                                            label="Membre depuis"
                                            value={new Date(selectedAdult.created_at).toLocaleDateString()}
                                        />
                                    </InfoSection>
                                </div>
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* Modals Adults */}
            {showAdultModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{isEditingAdult ? 'Modifier l\'adulte' : 'Ajouter un adulte'}</h2>
                            <button onClick={() => setShowAdultModal(false)} className="text-grey-medium hover:text-white transition-colors" title="Fermer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdultSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Prénom</label>
                                <Input required type="text" value={currentAdultForm.prenom} onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, prenom: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Nom</label>
                                <Input required type="text" value={currentAdultForm.nom} onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, nom: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Fonction</label>
                                <div className="relative group">
                                    <select
                                        title="Fonction de l'adulte"
                                        value={currentAdultForm.fonction}
                                        onChange={(e) => setCurrentAdultForm({ ...currentAdultForm, fonction: e.target.value })}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer font-medium"
                                    >
                                        <option value="" className="bg-surface">Sélectionner une fonction...</option>
                                        <option value="Titulaire" className="bg-surface">Titulaire</option>
                                        <option value="AESH" className="bg-surface">AESH</option>
                                        <option value="ATSEM" className="bg-surface">ATSEM</option>
                                        <option value="Stagiaire" className="bg-surface">Stagiaire</option>
                                        <option value="Remplaçant" className="bg-surface">Remplaçant</option>
                                        <option value="Autre" className="bg-surface">Autre</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-medium pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowAdultModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all">
                                    <Save size={20} />
                                    {isEditingAdult ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!adultToDelete}
                onClose={() => setAdultToDelete(null)}
                onConfirm={handleDeleteAdultConfirm}
                title="Supprimer l'adulte ?"
                message={`Voulez-vous vraiment supprimer "${adultToDelete?.prenom} ${adultToDelete?.nom}" ?`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />

            {/* Modals Activities */}
            {showActivityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{isEditingActivity ? 'Modifier le type' : 'Nouvelle action'}</h2>
                            <button onClick={() => setShowActivityModal(false)} className="text-grey-medium hover:text-white transition-colors" title="Fermer"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleActivitySubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-grey-medium mb-1 uppercase tracking-wider text-[10px]">Libellé</label>
                                <Input required type="text" placeholder="Ex: Observation, Coaching..." value={currentActivityForm.label} onChange={(e) => setCurrentActivityForm({ ...currentActivityForm, label: e.target.value })} className="bg-background/50 border-white/10" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowActivityModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-grey-light rounded-xl font-medium transition-colors">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-primary hover:bg-primary/90 text-text-dark rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all">
                                    <Save size={20} />
                                    {isEditingActivity ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!activityToDelete}
                onClose={() => setActivityToDelete(null)}
                onConfirm={handleDeleteActivityConfirm}
                title="Supprimer le type ?"
                message={`Voulez-vous vraiment supprimer "${activityToDelete?.label}" ?`}
                confirmText="Supprimer"
                cancelText="Annuler"
                variant="danger"
            />
        </div>
    );
};

export default Adults;
