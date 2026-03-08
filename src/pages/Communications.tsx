import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Send, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // Load user profile to check for API Key
            const { data: profile } = await supabase
                .from('CompteUtilisateur')
                .select('*')
                .eq('id', user.id)
                .single();
            setUserProfile(profile);

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

        if (!userProfile?.brevo_api_key) {
            toast.error('Aucune clé API Brevo configurée dans votre profil');
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
                if (student.parent1_email) {
                    recipients.add(student.parent1_email);
                    hasEmail = true;
                }
                if (student.parent2_email) {
                    recipients.add(student.parent2_email);
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

            const recipientsList = Array.from(recipients).map(email => ({ email }));

            // 2. Prepare Report for Sender
            const senderReport = `
                <hr />
                <h3>Rapport d'envoi</h3>
                <p><strong>Message envoyé à :</strong> ${recipients.size} destinataire(s)</p>
                <ul>
                    ${reportLines.map(line => `<li>${line}</li>`).join('')}
                </ul>
            `;

            // 3. Send Email (Parents via BCC, Sender via TO + Report)
            // We'll make two calls or one smart call? 
            // The constraint: We want parents to NOT see each other. BCC does that.
            // We want sender to see the report. Parents MUST NOT see the report.
            // So we MUST make two separate calls.

            // Call 1: To Parents
            const { error: errorParents } = await supabase.functions.invoke('send-email', {
                body: {
                    to: [{ email: userProfile.email || 'no-reply@gestion-de-classe.com', name: 'Copie Professeur' }], // Brevo requires a TO
                    bcc: recipientsList,
                    subject: subject,
                    htmlContent: message
                }
            });

            if (errorParents) throw errorParents;

            // Call 2: To Sender with Report
            const { error: errorReport } = await supabase.functions.invoke('send-email', {
                body: {
                    to: [{ email: userProfile.email, name: `${userProfile.prenom} ${userProfile.nom}` }],
                    subject: `[Rapport] ${subject}`,
                    htmlContent: `
                        <div style="background-color: #f0f9ff; padding: 15px; margin-bottom: 20px; border-left: 4px solid #0ea5e9;">
                            Ceci est votre copie avec le rapport d'envoi.
                        </div>
                        ${message}
                        ${senderReport}
                    `
                }
            });

            if (errorReport) console.error('Error sending report:', errorReport);

            toast.success('Emails envoyés avec succès !');
            setSubject('');
            setMessage('');

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
                {!userProfile?.brevo_api_key && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        <AlertCircle size={18} />
                        <span className="text-sm font-bold">Clé API manquante dans votre profil</span>
                    </div>
                )}
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
                            <div className="bg-white rounded-xl overflow-hidden text-black min-h-[300px]">
                                <ReactQuill
                                    theme="snow"
                                    value={message}
                                    onChange={setMessage}
                                    className="h-[250px]"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSend}
                                loading={sending}
                                disabled={!userProfile?.brevo_api_key}
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
    const [stats, setStats] = useState<{ total: number, valid: number }>({ total: 0, valid: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const students = await attendanceRepository.getStudentsByGroup(groupId);
            let valid = 0;
            students.forEach((s: any) => {
                if (s.parent1_email || s.parent2_email) valid++;
            });
            setStats({ total: students.length, valid });
            setLoading(false);
        };
        load();
    }, [groupId]);

    if (loading) return <div className="animate-pulse h-20 bg-white/5 rounded-xl" />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-grey-light">Total Élèves</span>
                <span className="text-white font-bold">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-green-400">Avec Email Parent</span>
                <span className="text-green-400 font-bold">{stats.valid}</span>
            </div>
            {stats.total - stats.valid > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="text-red-400">Sans Email</span>
                    <span className="text-red-400 font-bold">{stats.total - stats.valid}</span>
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
