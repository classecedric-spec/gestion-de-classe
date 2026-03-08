import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Card, Button, Input } from '../core';
import { supabase, getCurrentUser } from '../lib/database';
import { SupabaseGroupRepository } from '../features/groups/repositories/SupabaseGroupRepository';
import { SupabaseAttendanceRepository } from '../features/attendance/repositories/SupabaseAttendanceRepository';
import { toast } from 'react-hot-toast';

const groupRepository = new SupabaseGroupRepository();
const attendanceRepository = new SupabaseAttendanceRepository();

const Communications: React.FC = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

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

    const handleSend = async () => {
        if (!selectedGroupId || !subject || !message) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        setSending(true);
        try {
            // 1. Get students and parents emails
            const students = await attendanceRepository.getStudentsByGroup(selectedGroupId);

            const recipients = new Set<string>();
            const reportLines: string[] = [];

            students.forEach((student: any) => {
                let hasEmail = false;
                if (student.parent1_email?.trim()) {
                    recipients.add(student.parent1_email.trim());
                    hasEmail = true;
                }
                if (student.parent2_email?.trim()) {
                    recipients.add(student.parent2_email.trim());
                    hasEmail = true;
                }

                if (hasEmail) {
                    reportLines.push(`✅ ${student.prenom} ${student.nom}`);
                } else {
                    reportLines.push(`❌ ${student.prenom} ${student.nom} (Aucun email parent)`);
                }
            });

            if (recipients.size === 0) {
                toast.error('Aucun email de parent trouvé dans ce groupe');
                setSending(false);
                return;
            }

            // Create mailto link
            const bccList = Array.from(recipients).join(',');
            const mailtoLink = `mailto:?bcc=${bccList}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

            // Open local mail client
            window.location.href = mailtoLink;

            toast.success('Ouverture de votre client mail local...');

        } catch (error: any) {
            console.error('Error sending emails:', error);
            toast.error('Erreur lors de l\'envoi: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Communication</h1>
                    <p className="text-grey-medium mt-1">Envoyez des emails groupés aux parents.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">Utilise votre client mail local</span>
                </div>
            </header>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card variant="glass" className="p-6 space-y-6">
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
                                    placeholder="Sujet de l'email..."
                                />
                            </div>
                        </div>

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
                                onClick={handleSend}
                                loading={sending}
                                icon={Send}
                                size="lg"
                            >
                                Envoyer le message
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card variant="glass" className="p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users size={20} className="text-primary" />
                            Aperçu des destinataires
                        </h3>
                        {selectedGroupId ? (
                            <RecipientsList groupId={selectedGroupId} />
                        ) : (
                            <p className="text-grey-medium italic">Sélectionnez un groupe pour voir les destinataires.</p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

const RecipientsList = ({ groupId }: { groupId: string }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<{ total: number, valid: number }>({ total: 0, valid: 0 });
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [expanded, setExpanded] = useState<'with' | 'without' | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await attendanceRepository.getStudentsByGroup(groupId);
            let valid = 0;
            data.forEach((s: any) => {
                if (s.parent1_email?.trim() || s.parent2_email?.trim()) valid++;
            });
            setStudents(data);
            setStats({ total: data.length, valid });
            setLoading(false);
        };
        load();
    }, [groupId]);

    if (loading) return <div className="animate-pulse h-20 bg-white/5 rounded-xl" />;

    const studentsWithEmail = students.filter(s => s.parent1_email?.trim() || s.parent2_email?.trim());
    const studentsWithoutEmail = students.filter(s => !(s.parent1_email?.trim() || s.parent2_email?.trim()));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-grey-light">Total Élèves</span>
                <span className="text-white font-bold">{stats.total}</span>
            </div>

            <div
                onClick={() => setExpanded(expanded === 'with' ? null : 'with')}
                className={clsx(
                    "flex flex-col p-3 rounded-lg border cursor-pointer transition-all",
                    expanded === 'with' ? "bg-green-500/10 border-green-500/40" : "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                )}
            >
                <div className="flex items-center justify-between">
                    <span className="text-green-400">Avec Email Parent</span>
                    <span className="text-green-400 font-bold">{stats.valid}</span>
                </div>
                {expanded === 'with' && studentsWithEmail.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-500/20 space-y-2">
                        {studentsWithEmail.map(s => (
                            <div key={s.id} className="text-sm pl-2 flex flex-col gap-1 group/student">
                                <div className="flex items-center justify-between text-green-300">
                                    <span className="font-bold">• {s.prenom} {s.nom}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/dashboard/user/students', { state: { selectedStudentId: s.id } });
                                        }}
                                        className="p-1 opacity-0 group-hover/student:opacity-100 hover:bg-green-500/20 rounded transition-all text-green-300 hover:text-green-200"
                                        title="Voir la fiche de l'élève"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                                <div className="pl-4 flex flex-col gap-0.5 text-xs text-green-400/60 font-medium">
                                    {s.parent1_email?.trim() && <span>Parent 1 : {s.parent1_email.trim()}</span>}
                                    {s.parent2_email?.trim() && <span>Parent 2 : {s.parent2_email.trim()}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {stats.total - stats.valid > 0 && (
                <div
                    onClick={() => setExpanded(expanded === 'without' ? null : 'without')}
                    className={clsx(
                        "flex flex-col p-3 rounded-lg border cursor-pointer transition-all",
                        expanded === 'without' ? "bg-red-500/10 border-red-500/40" : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-red-400">Sans Email</span>
                        <span className="text-red-400 font-bold">{stats.total - stats.valid}</span>
                    </div>
                    {expanded === 'without' && studentsWithoutEmail.length > 0 && (
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
                Les emails sont envoyés en Copie Cachée (BCC). Les parents ne voient pas les adresses des autres.
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
