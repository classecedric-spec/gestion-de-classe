import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, getCurrentUser } from '../lib/database';
import RandomPickerModal from '../components/RandomPickerModal';
import { Session } from '@supabase/supabase-js';

import {
    LogOut,
    Loader2,
    User,
    AlertCircle,
    Check,
    Zap,
    Clock,
    ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SupabaseAttendanceRepository } from '../features/attendance/repositories/SupabaseAttendanceRepository';
import { SupabaseGroupRepository } from '../features/groups/repositories/SupabaseGroupRepository';
import { SupabaseTrackingRepository } from '../features/tracking/repositories/SupabaseTrackingRepository';
import { SupabaseUserRepository } from '../features/users/repositories/SupabaseUserRepository';
// Using generic tables types for state where specific service types aren't available/matching perfectly yet, or keeping existing types if compatible
import { Tables } from '../types/supabase';
import { StatCard, Button } from '../core';

// Instantiate repositories
const attendanceRepository = new SupabaseAttendanceRepository();
const groupRepository = new SupabaseGroupRepository();
const trackingRepository = new SupabaseTrackingRepository();
const userRepository = new SupabaseUserRepository();
// const studentRepository = new SupabaseStudentRepository(); // For random picker students if needed, or use attendance repo

interface DashboardStats {
    helpPending: number;
    validationsToday: number;
    studentsToFollow: any[];
}

interface AttendanceSummary {
    present: number;
    absent: number;
    hasEncoding: boolean;
    period: 'matin' | 'apres_midi';
}

const MobileDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [groups, setGroups] = useState<Tables<'Groupe'>[]>([]);
    const [activeGroup, setActiveGroup] = useState<Tables<'Groupe'> | null>(null);

    // Random Picker State
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
    const [groupStudents, setGroupStudents] = useState<any[]>([]); // Using any for compatibility with RandomPickerModal props for now
    const [pickerPool, setPickerPool] = useState<any[]>([]);

    // Stats state
    const [stats, setStats] = useState<DashboardStats>({
        helpPending: 0,
        validationsToday: 0,
        studentsToFollow: []
    });

    // Attendance Summary State
    const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
        present: 0,
        absent: 0,
        hasEncoding: false,
        period: 'matin'
    });
    // Default to today for summary
    const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);

    // Helper to determine period based on time
    const getPeriodFromTime = (): 'matin' | 'apres_midi' => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours * 60 + minutes;

        // Matin: < 12:00 (720 minutes)
        if (currentTime < 720) {
            return 'matin';
        } else {
            return 'apres_midi';
        }
    };

    const fetchUserInfo = useCallback(async (userId: string) => {
        try {
            const user = await userRepository.getProfile(userId);

            if (user) {
                setUserName(`${user.prenom || ''} ${user.nom || ''}`.trim());

                // Fetch all groups for this user
                const userGroups = await groupRepository.getUserGroups(userId);
                setGroups(userGroups);

                let groupToSet: Tables<'Groupe'> | null = null;
                // 1. Try last selected
                if (user.last_selected_group_id) {
                    groupToSet = userGroups.find(g => g.id === user.last_selected_group_id) || null;
                }

                // 2. Fallback to first group
                if (!groupToSet && userGroups.length > 0) {
                    groupToSet = userGroups[0];
                }

                if (groupToSet) setActiveGroup(groupToSet);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }, []);

    const handleGroupChange = async (groupId: string) => {
        if (!session?.user.id) return;
        
        const selectedGroup = groups.find(g => g.id === groupId);
        if (selectedGroup) {
            setActiveGroup(selectedGroup);
            try {
                await userRepository.updateLastSelectedGroup(session.user.id, groupId);
            } catch (error) {
                console.error('Error saving last selected group:', error);
            }
        }
    };

    const fetchStats = useCallback(async (groupId: string | null = null) => {
        setLoadingStats(true);
        try {
            let filterStudentIds: string[] | null = null;
            if (groupId) {
                const students = await attendanceRepository.getStudentsByGroup(groupId);
                filterStudentIds = students.map(s => s.id);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const statsData = await trackingRepository.getDashboardStats(filterStudentIds, user.id);

            setStats({
                helpPending: statsData.helpPending,
                validationsToday: statsData.validationsToday,
                studentsToFollow: []
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const fetchDailyAttendance = useCallback(async () => {
        setLoadingAttendance(true);
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const currentPeriod = getPeriodFromTime();
            const summary = await attendanceRepository.getDailySummary(user.id, selectedDate, currentPeriod);

            setAttendanceSummary({
                present: summary.present,
                absent: summary.absent,
                hasEncoding: summary.hasEncoding,
                period: currentPeriod
            });

        } catch (error) {
            console.error('Error fetching attendance summary:', error);
        } finally {
            setLoadingAttendance(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) {
                fetchUserInfo(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                navigate('/mobile');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate, fetchUserInfo]);

    // Update stats when active group changes
    useEffect(() => {
        if (activeGroup) {
            fetchStats(activeGroup.id);
            // Fetch students for random picker
            const fetchGroupStudents = async () => {
                const students = await attendanceRepository.getStudentsByGroup(activeGroup.id);
                setGroupStudents(students);
                // Initialize/reset pool when group changes
                setPickerPool(students);
            };
            fetchGroupStudents();
        } else if (session) {
            // Fallback: fetch global stats if no group and session exists
            fetchStats();
            setGroupStudents([]);
        }
    }, [activeGroup, fetchStats, session]);

    // Update attendance when date changes
    useEffect(() => {
        if (session) {
            fetchDailyAttendance();
        }
    }, [fetchDailyAttendance, session]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/mobile');
    };

    const handleGoToSuivi = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                toast.error('Non connecté');
                return;
            }

            // Try to get the last selected group
            const userProfile = await userRepository.getProfile(user.id);
            const savedGroupId = userProfile?.last_selected_group_id;

            if (savedGroupId) {
                // Verify the group still exists
                const group = await groupRepository.getGroup(savedGroupId);

                if (group) {
                    navigate(`/mobile-suivi/${savedGroupId}`);
                    return;
                }
            }

            // Fallback: fetch first group available
            const groups = await groupRepository.getUserGroups(user.id);

            if (groups && groups.length > 0) {
                navigate(`/mobile-suivi/${groups[0].id}`);
            } else {
                toast.error('Aucun groupe disponible');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Erreur lors du chargement');
        }
    };

    const handleGoToVisionUrgente = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                toast.error('Non connecté');
                return;
            }

            // Try to get the last selected group
            const userProfile = await userRepository.getProfile(user.id);
            const savedGroupId = userProfile?.last_selected_group_id;

            if (savedGroupId) {
                // Verify the group still exists
                const group = await groupRepository.getGroup(savedGroupId);

                if (group) {
                    navigate(`/mobile-vision-urgente/${savedGroupId}`);
                    return;
                }
            }

            // Fallback: fetch first group available
            const groups = await groupRepository.getUserGroups(user.id);

            if (groups && groups.length > 0) {
                navigate(`/mobile-vision-urgente/${groups[0].id}`);
            } else {
                toast.error('Aucun groupe disponible');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            toast.error('Erreur lors du chargement');
        }
    };

    // Get current date
    const today = new Date();
    const dateString = today.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <User size={48} className="text-primary mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Non connecté</h1>
                <p className="text-grey-medium mb-6">Veuillez vous connecter pour accéder à l'application.</p>
                <Button
                    as={Link}
                    to="/login"
                    className="w-full"
                    size="lg"
                >
                    Se connecter
                </Button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background text-text-main font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-text-dark font-black text-lg shadow-lg shadow-primary/20 shrink-0">
                            {activeGroup?.nom?.[0] || 'G'}
                        </div>
                        <div>
                            <h1 className="text-base font-black text-white leading-tight">Bonjour{userName ? `, ${userName.split(' ')[0]}` : ''}</h1>
                            <p className="text-[10px] text-grey-medium font-medium capitalize">{dateString}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-10 h-10 p-0 hover:bg-white/5"
                        icon={LogOut}
                        title="Se déconnecter"
                    />
                </div>
            </header>

            <main className="flex-1 p-4 space-y-5 pb-4 flex flex-col h-[calc(100vh-80px)]">

                {/* Main Grid */}
                <section className="grid grid-cols-2 gap-3">
                    
                    {/* FULL WIDTH GROUP PICKER CARD */}
                    <div className="col-span-2 bg-surface/50 border border-primary/20 rounded-xl p-4 hover:bg-surface transition-all group relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1 rounded bg-primary/10 text-primary">
                                <User size={12} />
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                                Groupe Actuel
                            </span>
                        </div>
                        
                        <div className="relative flex items-center">
                            <select
                                value={activeGroup?.id || ''}
                                onChange={(e) => handleGroupChange(e.target.value)}
                                title="Changer de groupe"
                                className="appearance-none bg-transparent border-none p-0 pr-8 text-xl font-black text-white focus:outline-none focus:ring-0 cursor-pointer w-full truncate relative z-10"
                                style={{ WebkitAppearance: 'none' }}
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.id} className="bg-surface text-white">
                                        {g.nom}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={20} className="text-primary absolute right-0 pointer-events-none animate-bounce-subtle" />
                        </div>
                        
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none"></div>
                    </div>
                    <StatCard
                        icon={AlertCircle}
                        variant="warning"
                        title={`En attente ${activeGroup ? `(${activeGroup.nom})` : ''}`}
                        value={stats.helpPending}
                        subtitle="demandes d'aide • cliquez pour voir"
                        loading={loadingStats}
                        onClick={handleGoToSuivi}
                    />

                    <StatCard
                        icon={Check}
                        variant="success"
                        title="Aujourd'hui"
                        value={stats.validationsToday}
                        subtitle="validations • cliquez pour encoder"
                        loading={loadingStats}
                        href="/mobile-encodage"
                    />

                    <StatCard
                        icon={Clock}
                        variant="danger"
                        title="Retards"
                        value={stats.studentsToFollow?.length || "-"}
                        subtitle="cliquez pour voir"
                        loading={loadingStats}
                        onClick={handleGoToVisionUrgente}
                    />

                    <StatCard
                        icon={Zap}
                        variant="purple"
                        title="Main Innocente"
                        value={<span className="text-2xl">🎲</span>}
                        subtitle="Tirage au sort"
                        onClick={() => setIsRandomPickerOpen(true)}
                    />

                    <StatCard
                        icon={User}
                        variant="primary"
                        title={`Présences (${attendanceSummary.period === 'matin' ? 'Matin' : 'Apr-Midi'})`}
                        value={
                            !attendanceSummary.hasEncoding ? (
                                <span className="text-xl text-grey-light italic">-</span>
                            ) : (
                                attendanceSummary.present
                            )
                        }
                        subtitle={
                            !attendanceSummary.hasEncoding
                                ? "Pas d'encodage • cliquez pour voir"
                                : `${attendanceSummary.absent} ${attendanceSummary.absent > 1 ? 'absents' : 'absent'} • cliquez pour voir`
                        }
                        loading={loadingAttendance}
                        href="/mobile-presence"
                        linkState={{ period: attendanceSummary.period }}
                    />


                </section>

            </main>

            {/* Footer */}
            <footer className="p-3 border-t border-white/5 text-center">
                <p className="text-[9px] font-bold text-grey-dark uppercase tracking-widest">Gestion Classe • Mobile</p>
            </footer>

            {/* RANDOM PICKER MODAL */}
            <RandomPickerModal
                isOpen={isRandomPickerOpen}
                onClose={() => setIsRandomPickerOpen(false)}
                students={groupStudents}
                pool={pickerPool}
                setPool={setPickerPool}
            />
        </div>
    );
};

export default MobileDashboard;
