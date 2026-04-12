import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../../lib/database';
import { Tabs, SuspenseLoader as Loader, EmptyState, Badge, Card, Input, Button, Select } from '../../../core';
import { 
    Calendar, 
    List, 
    Users, 
    Search, 
    Clock, 
    BookOpen, 
    ChevronRight, 
    ArrowUpDown, 
    CheckCircle2, 
    Clock3, 
    AlertCircle,
    LayoutGrid
} from 'lucide-react';

interface DailyLogContext {
    user: any;
    selectedGroup: any;
    setSelectedGroup: (group: any) => void;
    groups: any[];
    students: any[];
}

const DailyLog: React.FC = () => {
    const { user, selectedGroup, setSelectedGroup, groups, students } = useOutletContext<DailyLogContext>();
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [view, setView] = useState<'table' | 'pills'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [pillSort, setPillSort] = useState<'name' | 'count'>('count');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Fetch daily encodings
    const { data: encodings, isLoading } = useQuery({
        queryKey: ['daily-encodings', selectedGroup?.id, selectedDate],
        queryFn: async () => {
            if (!selectedGroup) return [];

            const start = startOfDay(parseISO(selectedDate)).toISOString();
            const end = endOfDay(parseISO(selectedDate)).toISOString();

            const studentIds = students.map(s => s.id);
            if (studentIds.length === 0) return [];

            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    id,
                    etat,
                    updated_at,
                    eleve_id,
                    Eleve:eleve_id (id, prenom, nom, photo_url),
                    Activite:activite_id (
                        id, 
                        titre, 
                        Module:module_id (id, nom)
                    )
                `)
                .eq('user_id', user.id)
                .in('eleve_id', studentIds)
                .in('etat', ['termine', 'a_verifier'])
                .gte('updated_at', start)
                .lte('updated_at', end)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedGroup && students.length > 0
    });

    // Formatting helpers
    const getStatusColor = (etat: string) => {
        switch (etat) {
            case 'termine': return 'success';
            case 'a_verifier': return 'warning';
            case 'besoin_d_aide': return 'danger';
            case 'ajustement': return 'info';
            default: return 'default';
        }
    };

    const getStatusLabel = (etat: string) => {
        switch (etat) {
            case 'termine': return 'Terminé';
            case 'a_verifier': return 'À vérifier';
            case 'besoin_d_aide': return 'Besoin d\'aide';
            case 'ajustement': return 'Ajustement';
            default: return etat;
        }
    };

    const getStatusIcon = (etat: string) => {
        switch (etat) {
            case 'termine': return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
            case 'a_verifier': return <Clock3 className="w-3 h-3 text-amber-500" />;
            case 'besoin_d_aide': return <AlertCircle className="w-3 h-3 text-red-500" />;
            default: return null;
        }
    };

    // Filtered data for table
    const filteredEncodings = useMemo(() => {
        if (!encodings) return [];
        if (!searchQuery) return encodings;
        
        const q = searchQuery.toLowerCase();
        return encodings.filter(e => 
            `${e.Eleve?.prenom} ${e.Eleve?.nom}`.toLowerCase().includes(q) ||
            e.Activite?.titre.toLowerCase().includes(q) ||
            e.Activite?.Module?.nom.toLowerCase().includes(q)
        );
    }, [encodings, searchQuery]);

    // Grouped data for pills
    const studentStats = useMemo(() => {
        if (!students || !encodings) return [];

        const stats = students.map(student => {
            const studentEncodings = encodings.filter(e => e.eleve_id === student.id);
            return {
                student,
                count: studentEncodings.length,
                lastActivity: studentEncodings[0]?.updated_at || null,
                items: studentEncodings
            };
        });

        // Filter by search
        let filtered = stats;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = stats.filter(s => `${s.student.prenom} ${s.student.nom}`.toLowerCase().includes(q));
        }

        // Sort
        return [...filtered].sort((a, b) => {
            if (pillSort === 'name') {
                return a.student.prenom.localeCompare(b.student.prenom);
            }
            return b.count - a.count;
        });
    }, [students, encodings, searchQuery, pillSort]);

    const selectedStudentData = useMemo(() => {
        if (!selectedStudentId) return null;
        return studentStats.find(s => s.student.id === selectedStudentId);
    }, [selectedStudentId, studentStats]);

    // Options for group selector
    const groupOptions = useMemo(() => {
        return groups.map(g => ({
            value: g.id,
            label: g.nom
        }));
    }, [groups]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Filters */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-dark/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Selecteurs Date et Groupe */}
                    <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                        {/* Group Selector */}
                        <div className="relative">
                            <Select 
                                variant="neu"
                                options={groupOptions}
                                value={selectedGroup?.id || ''}
                                onChange={(e) => {
                                    const group = groups.find(g => g.id === e.target.value);
                                    if (group) setSelectedGroup(group);
                                }}
                                icon={LayoutGrid}
                                className="min-w-[140px]"
                            />
                        </div>

                        <div className="h-4 w-px bg-white/10" />

                        {/* Date Selector */}
                        <div className="relative group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-9 pr-3 py-1.5 bg-transparent border-none text-[10px] font-bold text-white uppercase tracking-wider focus:ring-0 outline-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="hidden md:block h-8 w-px bg-white/10 mx-1" />

                    <Tabs 
                        tabs={[
                            { id: 'table', label: 'Flux direct', icon: List },
                            { id: 'pills', label: 'Par élève', icon: Users }
                        ]}
                        activeTab={view}
                        onChange={(id) => setView(id as 'table' | 'pills')}
                        level={3}
                        disableCompact
                        smart
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Input 
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e: any) => setSearchQuery(e.target.value)}
                        icon={Search}
                        className="max-w-[240px]"
                    />
                </div>
            </div>

            {!selectedGroup ? (
                <EmptyState 
                    title="Aucun groupe sélectionné" 
                    description="Veuillez choisir un groupe dans la liste déroulante ci-dessus pour afficher le journal d'encodage." 
                    icon={LayoutGrid}
                />
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader size="lg" />
                    <p className="text-sm font-bold uppercase tracking-widest text-grey-medium">Calcul des encodages...</p>
                </div>
            ) : encodings && encodings.length === 0 ? (
                <EmptyState 
                    title="Aucun encodage trouvé" 
                    description={`Aucune activité n'a été enregistrée pour le groupe ${selectedGroup.nom} le ${format(parseISO(selectedDate), 'dd MMMM yyyy', { locale: fr })}.`} 
                />
            ) : (
                <>
                    {/* View 1: Flux Tableau */}
                    {view === 'table' && (
                        <div className="overflow-x-auto rounded-3xl border border-white/5 shadow-2xl bg-surface-dark/20 backdrop-blur-xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-black/40 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium">Heure</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium">Élève</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium">Module / Activité</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredEncodings.map((enc: any) => (
                                        <tr key={enc.id} className="group hover:bg-primary/5 transition-colors duration-200">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm font-medium text-text-main/80">
                                                    <Clock className="w-3.5 h-3.5 text-primary/60" />
                                                    {format(parseISO(enc.updated_at), 'HH:mm')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {enc.Eleve?.photo_url ? (
                                                        <img 
                                                            src={enc.Eleve.photo_url} 
                                                            alt="" 
                                                            className="w-10 h-10 rounded-full object-cover border border-white/10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-primary/20 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary italic">
                                                            {enc.Eleve?.prenom?.[0]}{enc.Eleve?.nom?.[0]}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">
                                                        {enc.Eleve?.prenom} {enc.Eleve?.nom}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main/60">
                                                        <BookOpen className="w-3 h-3" />
                                                        {enc.Activite?.Module?.nom}
                                                    </div>
                                                    <div className="text-base font-medium text-text-main group-hover:translate-x-1 transition-transform">
                                                        {enc.Activite?.titre}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <Badge 
                                                    variant={getStatusColor(enc.etat)} 
                                                    className="pl-2 border border-white/5 shadow-lg"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {getStatusIcon(enc.etat)}
                                                        {getStatusLabel(enc.etat)}
                                                    </div>
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* View 2: Pilules Élèves */}
                    {view === 'pills' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Student List Sidebar */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-grey-medium">Élèves</h3>
                                    <button 
                                        onClick={() => setPillSort(prev => prev === 'name' ? 'count' : 'name')}
                                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-light transition-colors"
                                    >
                                        <ArrowUpDown className="w-3 h-3" />
                                        {pillSort === 'name' ? 'Nom' : 'Encodages'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5 max-h-[700px] overflow-y-auto no-scrollbar pr-1">
                                    {studentStats.map((stat) => (
                                        <button
                                            key={stat.student.id}
                                            onClick={() => setSelectedStudentId(stat.student.id)}
                                            className={`
                                                relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group
                                                ${selectedStudentId === stat.student.id 
                                                    ? 'bg-primary border-primary shadow-2xl shadow-primary/30 scale-[1.02] z-10' 
                                                    : 'bg-surface-dark/40 border-white/5 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    {stat.student.photo_url ? (
                                                        <img 
                                                            src={stat.student.photo_url} 
                                                            alt="" 
                                                            className={`w-12 h-12 rounded-full object-cover border-2 ${selectedStudentId === stat.student.id ? 'border-white/40' : 'border-white/10'}`} 
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-surface border border-white/10 flex items-center justify-center text-xs font-bold italic text-primary">
                                                            {stat.student.prenom[0]}
                                                        </div>
                                                    )}
                                                    {stat.count > 0 && (
                                                        <div className={`
                                                            absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2
                                                            ${selectedStudentId === stat.student.id ? 'bg-white text-primary border-primary' : 'bg-primary text-white border-surface-dark'}
                                                        `}>
                                                            {stat.count}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className={`text-base font-bold uppercase tracking-tight leading-none mb-1.5 ${selectedStudentId === stat.student.id ? 'text-white' : 'text-text-main'}`}>
                                                        {stat.student.prenom}
                                                    </p>
                                                    <p className={`text-[10px] font-medium opacity-60 ${selectedStudentId === stat.student.id ? 'text-white/80' : 'text-grey-medium'}`}>
                                                        {stat.count === 0 ? 'Aucune activité' : `Dernière: ${format(parseISO(stat.lastActivity!), 'HH:mm')}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 transition-transform ${selectedStudentId === stat.student.id ? 'text-white translate-x-1' : 'text-grey-medium opacity-20 group-hover:opacity-100 group-hover:translate-x-1'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Activity Detail Area */}
                            <div className="lg:col-span-2">
                                {selectedStudentData ? (
                                    <div className="h-full flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center justify-between mb-2 px-2">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-grey-medium">Activités de {selectedStudentData.student.prenom}</h3>
                                            <Badge variant="primary" className="font-black px-4 py-1.5 shadow-xl shadow-primary/20">
                                                {selectedStudentData.count} encodages
                                            </Badge>
                                        </div>

                                        {selectedStudentData.count > 0 ? (
                                            <div className="space-y-4">
                                                {selectedStudentData.items.map((item: any) => (
                                                    <Card key={item.id} className="p-5 bg-surface/40 hover:bg-surface/60 border-white/5 transition-all group overflow-hidden relative shadow-xl hover:shadow-primary/5">
                                                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                        
                                                        <div className="flex items-center justify-between gap-5 relative">
                                                            <div className="flex items-center gap-5">
                                                                <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-black/40 border border-white/10 min-w-[70px] shadow-inner">
                                                                    <Clock className="w-4 h-4 text-primary mb-1" />
                                                                    <span className="text-xs font-black text-white">{format(parseISO(item.updated_at), 'HH:mm')}</span>
                                                                </div>
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                                                        <Badge variant={getStatusColor(item.etat)} size="sm" className="shadow-md">
                                                                            <div className="flex items-center gap-1.5">
                                                                                {getStatusIcon(item.etat)}
                                                                                {getStatusLabel(item.etat)}
                                                                            </div>
                                                                        </Badge>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                                            {item.Activite?.Module?.nom}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors duration-300">
                                                                        {item.Activite?.titre}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center min-h-[400px] border-2 border-dashed border-white/5 rounded-3xl bg-surface-dark/20">
                                                <div className="text-center p-10">
                                                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                                                        <Clock3 className="w-10 h-10 text-grey-medium/30" />
                                                    </div>
                                                    <h4 className="text-xl font-bold text-text-main mb-3">Historique vide</h4>
                                                    <p className="text-sm text-grey-medium max-w-xs mx-auto leading-relaxed">
                                                        {selectedStudentData.student.prenom} n'a pas encore encodé d'activité aujourd'hui pour ce groupe.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center min-h-[500px] border-2 border-dashed border-white/5 rounded-[40px] bg-surface-dark/20 backdrop-blur-sm">
                                        <div className="text-center p-10">
                                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-2xl shadow-primary/20">
                                                <Users className="w-12 h-12 text-primary" />
                                            </div>
                                            <h4 className="text-2xl font-bold text-text-main mb-4 tracking-tight">Sélectionnez un élève</h4>
                                            <p className="text-grey-medium max-sm:px-4 mx-auto leading-relaxed text-base font-medium">
                                                Choisissez un élève dans la liste à gauche pour explorer le détail de son parcours pour la journée.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DailyLog;
