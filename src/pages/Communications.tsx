import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tabs, Tab, Card, Button, Input } from '../core';
import { getCurrentUser, supabase } from '../lib/database';
import { SupabaseGroupRepository } from '../features/groups/repositories/SupabaseGroupRepository';
import { SupabaseAttendanceRepository } from '../features/attendance/repositories/SupabaseAttendanceRepository';
import { toast } from 'react-hot-toast';

const groupRepository = new SupabaseGroupRepository();
const attendanceRepository = new SupabaseAttendanceRepository();

const Communications: React.FC = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    
    // Tab state
    const [activeTab, setActiveTab] = useState('general');

    // General Message state
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    // Late Work state
    const [beforeMessage, setBeforeMessage] = useState('Bonjour,\n\nVoici la liste des travaux non terminés de votre enfant à ce jour :');
    const [afterMessage, setAfterMessage] = useState('Merci de veiller à ce que ces travaux soient complétés dès que possible.\n\nCordialement,');
    const [selectedLateDate, setSelectedLateDate] = useState<string>('');
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [lateWorksMap, setLateWorksMap] = useState<Record<string, any[]>>({});

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedGroupId) {
            loadStudents(selectedGroupId);
            loadAvailableDates();
        }
    }, [selectedGroupId]);

    useEffect(() => {
        if (selectedGroupId && selectedLateDate && activeTab === 'retard') {
            loadLateWorks(selectedLateDate);
        }
    }, [selectedGroupId, selectedLateDate, activeTab]);

    const loadInitialData = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // Load groups
            const userGroups = await groupRepository.getUserGroups(user.id);
            setGroups(userGroups);
            if (userGroups.length > 0) {
                setSelectedGroupId(userGroups[0].id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableDates = async () => {
        try {
            // Fetch modules associated with this group via students progressions or directly if we assume modules are assigned to class
            // To be accurate and follow user's request "afficher toutes les activités qui sont en retard et encore actives", 
            // we look for modules with statut 'en_cours' that have activities.
            const { data, error } = await supabase
                .from('Module')
                .select('date_fin')
                .eq('statut', 'en_cours')
                .not('date_fin', 'is', null)
                .order('date_fin', { ascending: false });

            if (error) throw error;

            const dates = Array.from(new Set(data.map(m => m.date_fin))).sort().reverse();
            setAvailableDates(dates);
            if (dates.length > 0 && !selectedLateDate) {
                setSelectedLateDate(dates[0]);
            }
        } catch (error) {
            console.error('Error loading dates:', error);
        }
    };

    const loadStudents = async (groupId: string) => {
        try {
            const data = await attendanceRepository.getStudentsByGroup(groupId);
            setStudents(data);
            // Default select all students with emails
            const initialSelected = new Set<string>();
            data.forEach((s: any) => {
                if (s.parent1_email?.trim() || s.parent2_email?.trim()) {
                    initialSelected.add(s.id);
                }
            });
            setSelectedStudentIds(initialSelected);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    const loadLateWorks = async (date: string) => {
        try {
            const studentIds = students.map(s => s.id);
            if (studentIds.length === 0) return;

            // Note: We filter by the module's date_fin.
            const { data, error } = await supabase
                .from('Progression')
                .select(`
                    *,
                    Activite!inner (
                        id, titre,
                        Module!inner (
                            id, nom, date_fin, statut
                        )
                    )
                `)
                .in('eleve_id', studentIds)
                .eq('Activite.Module.statut', 'en_cours')
                .not('etat', 'in', '("termine","valide","a_verifier")')
                .lte('Activite.Module.date_fin', date)
                .order('ordre', { foreignTable: 'Activite', ascending: true });

            if (error) throw error;

            const map: Record<string, any[]> = {};
            data.forEach((p: any) => {
                if (!map[p.eleve_id]) map[p.eleve_id] = [];
                map[p.eleve_id].push(p);
            });
            setLateWorksMap(map);
        } catch (error) {
            console.error('Error loading late works:', error);
        }
    };

    const toggleStudent = (studentId: string) => {
        const newSelected = new Set(selectedStudentIds);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudentIds(newSelected);
    };

    const handleSelectAll = () => {
        const withEmail = students.filter(s => s.parent1_email?.trim() || s.parent2_email?.trim());
        setSelectedStudentIds(new Set(withEmail.map(s => s.id)));
    };

    const handleDeselectAll = () => {
        setSelectedStudentIds(new Set());
    };

    const handleSendGeneral = async () => {
        if (!selectedGroupId || !subject || !message) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        if (selectedStudentIds.size === 0) {
            toast.error('Veuillez sélectionner au moins un destinataire');
            return;
        }

        setSending(true);
        try {
            const recipients = new Set<string>();
            students.forEach((student: any) => {
                if (!selectedStudentIds.has(student.id)) return;
                if (student.parent1_email?.trim()) recipients.add(student.parent1_email.trim());
                if (student.parent2_email?.trim()) recipients.add(student.parent2_email.trim());
            });

            if (recipients.size === 0) {
                toast.error('Aucun email de parent trouvé pour la sélection');
                return;
            }

            const bccList = Array.from(recipients).join(',');
            const mailtoLink = `mailto:?bcc=${bccList}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            window.location.href = mailtoLink;
            toast.success('Ouverture de votre client mail local...');
        } finally {
            setSending(false);
        }
    };

    const getIndividualMailtoData = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return null;

        const works = lateWorksMap[studentId] || [];
        if (works.length === 0) return null;

        const recipients: string[] = [];
        if (student.parent1_email?.trim()) recipients.push(student.parent1_email.trim());
        if (student.parent2_email?.trim()) recipients.push(student.parent2_email.trim());

        if (recipients.length === 0) return null;

        // Group by module
        const groupedWorks: Record<string, { activities: string[], date: string | null }> = {};
        works.forEach(w => {
            const moduleName = w.Activite.Module.nom;
            if (!groupedWorks[moduleName]) {
                groupedWorks[moduleName] = { 
                    activities: [], 
                    date: w.Activite.Module.date_fin 
                };
            }
            groupedWorks[moduleName].activities.push(w.Activite.titre);
        });

        const sortedModuleEntries = Object.entries(groupedWorks).sort((a, b) => {
            // Sort modules by date_fin then name
            if (a[1].date && b[1].date && a[1].date !== b[1].date) {
                return a[1].date.localeCompare(b[1].date);
            }
            return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
        });

        const formattedWorks = sortedModuleEntries.map(([moduleName, data]) => {
            const cleanModuleName = moduleName.replace(/\[FP\]/g, '').trim();
            const dateStr = data.date ? ` (${format(parseISO(data.date), 'dd/MM/yyyy')})` : '';
            const headerText = `${cleanModuleName.toUpperCase()}${dateStr}`;
            const header = `${headerText}\n${'='.repeat(headerText.length)}`;
            
            // Natural sort for activities (30.1 before 30.10)
            const sortedActivities = [...data.activities].sort((a, b) => 
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );

            return `${header}\n${sortedActivities.map(a => `- ${a.replace(/\[FP\]/g, '').trim()}`).join('\n')}`;
        }).join('\n\n');

        const fullBody = `${beforeMessage.replace('Prénom', student.prenom)}\n\n${formattedWorks}\n\n${afterMessage}`;
        const individualSubject = subject || `Travaux en retard pour ${student.prenom}`;

        return {
            to: recipients.join(','),
            subject: individualSubject,
            body: fullBody,
            studentName: student.prenom
        };
    };

    const handleSendIndividual = (studentId: string) => {
        const data = getIndividualMailtoData(studentId);
        if (!data) {
            toast.error(`Impossible de générer l'email pour cet élève (pas de retard ou pas d'email parents)`);
            return;
        }

        const mailtoLink = `mailto:${data.to}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
        window.open(mailtoLink, '_blank');
        toast.success(`Email préparé pour ${data.studentName}`);
    };

    const handleSendAllLate = async () => {
        const selectedWithLate = Array.from(selectedStudentIds).filter(id => (lateWorksMap[id] || []).length > 0);
        
        if (selectedWithLate.length === 0) {
            toast.error('Aucun élève sélectionné avec des travaux en retard');
            return;
        }

        let sentCount = 0;
        for (const studentId of selectedWithLate) {
            const data = getIndividualMailtoData(studentId);
            if (data) {
                const mailtoLink = `mailto:${data.to}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`;
                window.open(mailtoLink, '_blank');
                sentCount++;
                // Small delay to help browser handle multiple popups
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (sentCount > 0) {
            toast.success(`${sentCount} emails ont été ouverts`);
        }
    };

    const tabs: Tab[] = [
        { id: 'general', label: 'Message Général', icon: Send },
        { id: 'retard', label: 'Travaux en retard', icon: AlertCircle }
    ];

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Communication</h1>
                    <p className="text-grey-medium mt-1">Envoyez des emails groupés ou individuels aux parents.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">Utilise votre client mail local</span>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="glass" className="p-6 space-y-6 overflow-visible">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Groupe</label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full h-11 bg-surface-light border border-white/10 rounded-xl px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    title="Sélectionner un groupe"
                                >
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.nom}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Sujet</label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={activeTab === 'general' ? "Sujet de l'email..." : "Laissez vide pour sujet auto"}
                                />
                            </div>
                        </div>

                        <div className="border-b border-white/5">
                            <Tabs 
                                tabs={tabs} 
                                activeTab={activeTab} 
                                onChange={setActiveTab} 
                                level={2}
                            />
                        </div>

                        {activeTab === 'general' ? (
                            <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Message</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Rédigez votre message ici..."
                                        className="w-full min-h-[300px] p-4 bg-surface-light border border-white/10 rounded-xl text-white placeholder-grey-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y transition-all"
                                    />
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={handleSendGeneral}
                                        loading={sending}
                                        icon={Send}
                                        size="lg"
                                    >
                                        Envoyer le message groupé
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Travaux en retard jusqu'au :</label>
                                    <select
                                        value={selectedLateDate}
                                        onChange={(e) => setSelectedLateDate(e.target.value)}
                                        className="w-full h-11 bg-surface-light border border-white/10 rounded-xl px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        title="Choisir la date limite"
                                    >
                                        {availableDates.map(date => (
                                            <option key={date} value={date}>
                                                {format(parseISO(date), 'dd MMMM yyyy', { locale: fr })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Message Avant</label>
                                    <textarea
                                        value={beforeMessage}
                                        onChange={(e) => setBeforeMessage(e.target.value)}
                                        placeholder="Bonjour, voici les travaux..."
                                        className="w-full min-h-[100px] p-4 bg-surface-light border border-white/10 rounded-xl text-white placeholder-grey-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y transition-all"
                                    />
                                    <p className="text-[10px] text-grey-medium italic">Astuce: Prénom sera remplacé par le prénom de l'élève.</p>
                                </div>
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <p className="text-xs text-primary font-bold mb-2 uppercase tracking-wider text-center underline">Liste des travaux (Génération auto)</p>
                                    <p className="text-[10px] text-primary/60 text-center italic">Le contenu dépendra de chaque élève.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Message Après</label>
                                    <textarea
                                        value={afterMessage}
                                        onChange={(e) => setAfterMessage(e.target.value)}
                                        placeholder="Merci beaucoup..."
                                        className="w-full min-h-[100px] p-4 bg-surface-light border border-white/10 rounded-xl text-white placeholder-grey-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y transition-all"
                                    />
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-4">
                                    <div className="flex gap-3 items-center">
                                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                        <p className="text-xs text-amber-200">
                                            Dans cet onglet, vous pouvez envoyer les emails <strong>un par un</strong> ou <strong>tous d'un coup</strong>.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleSendAllLate}
                                        variant="secondary"
                                        className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30"
                                        icon={Send}
                                    >
                                        Envoyer à tous les sélectionnés
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card variant="glass" className="p-6">
                        <div className="flex flex-col gap-4 mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-primary" />
                                {activeTab === 'general' ? 'Destinataires' : 'Envois Individuels'}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectAll}
                                    className="text-[10px] items-center uppercase font-black px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors"
                                >
                                    Tout Sélectionner
                                </button>
                                <button
                                    onClick={handleDeselectAll}
                                    className="text-[10px] items-center uppercase font-black px-2 py-1 bg-white/5 text-grey-light border border-white/10 rounded hover:bg-white/10 transition-colors"
                                >
                                    Tout Désélectionner
                                </button>
                            </div>
                        </div>
                        {selectedGroupId ? (
                            <RecipientsList 
                                students={students} 
                                selectedStudentIds={selectedStudentIds}
                                onToggleStudent={toggleStudent}
                                activeTab={activeTab}
                                lateWorksMap={lateWorksMap}
                                onSendIndividual={handleSendIndividual}
                            />
                        ) : (
                            <p className="text-grey-medium italic">Sélectionnez un groupe pour voir les destinataires.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

const RecipientsList = ({ 
    students, 
    selectedStudentIds,
    onToggleStudent,
    activeTab,
    lateWorksMap,
    onSendIndividual
}: { 
    students: any[],
    selectedStudentIds: Set<string>,
    onToggleStudent: (id: string) => void,
    activeTab: string,
    lateWorksMap: Record<string, any[]>,
    onSendIndividual: (id: string) => void
}) => {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState<'with' | 'without' | null>('with');

    const studentsWithEmail = students.filter(s => s.parent1_email?.trim() || s.parent2_email?.trim());
    const studentsWithoutEmail = students.filter(s => !(s.parent1_email?.trim() || s.parent2_email?.trim()));
    
    const validCount = studentsWithEmail.filter(s => selectedStudentIds.has(s.id)).length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-grey-light">Total Élèves</span>
                <span className="text-white font-bold">{students.length}</span>
            </div>

            <div
                className={clsx(
                    "flex flex-col p-3 rounded-lg border transition-all",
                    expanded === 'with' ? "bg-green-500/10 border-green-500/40" : "bg-green-500/5 border-green-500/20"
                )}
            >
                <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(expanded === 'with' ? null : 'with')}
                >
                    <span className="text-green-400">{activeTab === 'retard' ? 'Prêts à envoyer' : 'Sélectionnés (Emails)'}</span>
                    <span className="text-green-400 font-bold">{validCount} / {studentsWithEmail.length}</span>
                </div>
                {expanded === 'with' && studentsWithEmail.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-500/20 space-y-2">
                        {studentsWithEmail.map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            const lateWorks = lateWorksMap[s.id] || [];
                            const hasLateWork = lateWorks.length > 0;

                            return (
                                <div key={s.id} className="text-sm pl-2 flex flex-col gap-1 group/student">
                                    <div className="flex items-center justify-between text-green-300">
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer select-none"
                                            onClick={() => onToggleStudent(s.id)}
                                        >
                                            <div className={clsx(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                isSelected ? "bg-green-500 border-green-500" : "border-green-500/30 bg-transparent"
                                            )}>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className={clsx(
                                                "font-bold transition-opacity",
                                                !isSelected && "opacity-50"
                                            )}>{s.prenom} {s.nom}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {activeTab === 'retard' && isSelected && (
                                                <button
                                                    onClick={() => onSendIndividual(s.id)}
                                                    className={clsx(
                                                        "p-1 rounded transition-all flex items-center gap-1",
                                                        hasLateWork ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-white/5 text-grey-dark cursor-not-allowed"
                                                    )}
                                                    title={hasLateWork ? "Envoyer le récapitulatif" : "Aucun retard"}
                                                >
                                                    <Send size={14} />
                                                    {hasLateWork && <span className="text-[10px] font-black">{lateWorks.length}</span>}
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/dashboard/user/students', { state: { selectedStudentId: s.id } });
                                                }}
                                                className="p-1 opacity-10 group-hover/student:opacity-100 hover:bg-green-500/20 rounded transition-all text-green-300 hover:text-green-200"
                                                title="Voir la fiche de l'élève"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pl-6 flex flex-col gap-0.5 text-xs text-green-400/60 font-medium">
                                        {s.parent1_email?.trim() && <span>P1: {s.parent1_email.trim()}</span>}
                                        {s.parent2_email?.trim() && <span>P2: {s.parent2_email.trim()}</span>}
                                    </div>
                                    {activeTab === 'retard' && isSelected && hasLateWork && expanded === 'with' && (
                                        <div className="pl-6 mt-1 flex flex-wrap gap-1">
                                            {lateWorks.slice(0, 3).map(w => (
                                                <span key={w.id} className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500/70 border border-amber-500/10 rounded uppercase font-bold">
                                                    {w.Activite.titre}
                                                </span>
                                            ))}
                                            {lateWorks.length > 3 && <span className="text-[9px] text-grey-medium">+{lateWorks.length - 3}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {studentsWithoutEmail.length > 0 && (
                <div
                    className={clsx(
                        "flex flex-col p-3 rounded-lg border transition-all",
                        expanded === 'without' ? "bg-red-500/10 border-red-500/40" : "bg-red-500/5 border-red-500/20"
                    )}
                >
                    <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpanded(expanded === 'without' ? null : 'without')}
                    >
                        <span className="text-red-400">Sans Email</span>
                        <span className="text-red-400 font-bold">{studentsWithoutEmail.length}</span>
                    </div>
                    {expanded === 'without' && (
                        <div className="mt-3 pt-3 border-t border-red-500/20 space-y-1">
                            {studentsWithoutEmail.map(s => (
                                <div key={s.id} className="text-sm pl-2 text-red-300 flex items-center justify-between group/student">
                                    <span>• {s.prenom} {s.nom}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/dashboard/user/students', { state: { selectedStudentId: s.id } });
                                        }}
                                        className="p-1 opacity-0 group-hover/student:opacity-100 hover:bg-red-500/20 rounded transition-all text-red-300 hover:text-red-200"
                                        title="Voir la fiche de l'élève"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <p className="text-xs text-grey-dark mt-2">
                {activeTab === 'general' 
                    ? "Les emails sont envoyés en Copie Cachée (BCC). Les parents ne voient pas les adresses des autres."
                    : "Les emails individuels vous permettent de personnaliser la liste des travaux pour chaque famille."
                }
            </p>
        </div>
    );
};

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
    </div>
);

export default Communications;
