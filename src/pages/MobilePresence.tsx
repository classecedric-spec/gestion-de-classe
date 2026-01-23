import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, getCurrentUser } from '../lib/database';
import { getInitials } from '../lib/helpers';
import {
    ArrowLeft,
    Loader2,
    Sun,
    Sunset,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { attendanceService, SetupPresence } from '../features/attendance/services/attendanceService';

const MobilePresence: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Helper for default period
    const getDefaultPeriod = () => {
        if (location.state?.period) return location.state.period;
        const now = new Date();
        return (now.getHours() * 60 + now.getMinutes()) < 720 ? 'matin' : 'apres_midi';
    };

    // Attendance State
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [setups, setSetups] = useState<SetupPresence[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedPeriod, setSelectedPeriod] = useState(getDefaultPeriod()); // 'matin' | 'apres_midi'
    const [selectedStatus, setSelectedStatus] = useState('absent'); // 'present' | 'absent'
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                navigate('/mobile');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Fetch Setups
    useEffect(() => {
        const loadSetups = async () => {
            try {
                const data = await attendanceService.fetchSetups();
                setSetups(data);
            } catch (error) {
                console.error("Error fetching setups", error);
                toast.error("Erreur chargement configurations");
            }
        };
        if (session) {
            loadSetups();
        }
    }, [session]);

    const fetchDailyAttendance = useCallback(async () => {
        setLoadingAttendance(true);
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const data = await attendanceService.getMobileAttendance(user.id, selectedDate);
            setAttendanceData(data);

        } catch (error) {
            console.error('Error fetching attendance:', error);
            toast.error("Erreur chargement présences");
        } finally {
            setLoadingAttendance(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        if (session) {
            fetchDailyAttendance();
        }
    }, [fetchDailyAttendance, session]);

    // Toggle Status Function
    const toggleStatus = async (studentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';

        // Optimistic Update
        setAttendanceData(prev => prev.map(s => {
            if (s.id === studentId) {
                return {
                    ...s,
                    [selectedPeriod]: newStatus
                };
            }
            return s;
        }));

        try {
            // Determine setup ID (use first available or default behavior)
            // Ideally user should select setup, but for mobile quick-entry, using the first one is reasonable for now.
            // If specific setup selection is needed, UI should be added.
            const setupId = setups.length > 0 ? setups[0].id : null;

            if (!setupId) {
                throw new Error("Aucune configuration de présence trouvée.");
            }

            await attendanceService.upsertAttendance({
                eleve_id: studentId,
                date: selectedDate,
                periode: selectedPeriod,
                status: newStatus,
                setup_id: setupId
            });

        } catch (err) {
            console.error("Error updating attendance", err);
            toast.error("Erreur sauvegarde: Config manquante ?");
            // Revert
            fetchDailyAttendance();
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-main font-sans flex flex-col">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-black text-white">Présences</h1>
                </div>
            </div>

            <main className="flex-1 p-4 flex flex-col min-h-0 container max-w-lg mx-auto">
                <div className="bg-surface/50 border border-border rounded-xl p-4 flex-1 flex flex-col">

                    {/* Date Selector */}
                    <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-grey-medium mb-2 block">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                            className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-3 text-white text-base font-bold focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    {/* Period Selector */}
                    <div className="flex bg-surface-light rounded-lg p-1 mb-4">
                        <button
                            onClick={() => setSelectedPeriod('matin')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${selectedPeriod === 'matin' ? 'bg-white text-black shadow-sm' : 'text-grey-medium hover:text-white'}`}
                        >
                            <Sun size={14} /> Matin
                        </button>
                        <button
                            onClick={() => setSelectedPeriod('apres_midi')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${selectedPeriod === 'apres_midi' ? 'bg-white text-black shadow-sm' : 'text-grey-medium hover:text-white'}`}
                        >
                            <Sunset size={14} /> Après-midi
                        </button>
                    </div>

                    {/* Status Tabs (To filter list) */}
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setSelectedStatus('present')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all ${selectedStatus === 'present' ? 'bg-success/10 border-success text-success' : 'bg-surface border-white/5 text-grey-medium hover:border-white/10'}`}
                        >
                            <CheckCircle2 size={16} /> Présents
                        </button>
                        <button
                            onClick={() => setSelectedStatus('absent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-bold transition-all ${selectedStatus === 'absent' ? 'bg-danger/10 border-danger text-danger' : 'bg-surface border-white/5 text-grey-medium hover:border-white/10'}`}
                        >
                            <XCircle size={16} /> Absents
                        </button>
                    </div>

                    {/* Student List Grid */}
                    {loadingAttendance ? (
                        <div className="flex justify-center py-10">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3 overflow-y-auto pb-safe">
                            {attendanceData
                                .filter(s => {
                                    const status = selectedPeriod === 'matin' ? s.matin : s.apres_midi;
                                    // Show all or filter? Original behavior was filtering by status tab.
                                    // But typically for presence check you want to see everyone or just toggle.
                                    // Replicating original filter behavior:
                                    return status === selectedStatus;
                                })
                                .length === 0 ? (
                                <p className="col-span-full text-center text-sm text-grey-dark py-10 italic">Aucun élève {selectedStatus}</p>
                            ) : (
                                attendanceData
                                    .filter(s => {
                                        const status = selectedPeriod === 'matin' ? s.matin : s.apres_midi;
                                        return status === selectedStatus;
                                    })
                                    .sort((a, b) => a.nom.localeCompare(b.nom))
                                    .map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleStatus(student.id, selectedStatus)}
                                            className="flex flex-col items-center gap-2 bg-surface p-3 rounded-xl border border-white/5 active:scale-95 transition-transform cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-surface-light shrink-0 relative">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-primary">
                                                        {getInitials(student)}
                                                    </div>
                                                )}
                                                {/* Selection Checkmark Overlay */}
                                                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${selectedStatus === 'present' ? 'opacity-0' : 'opacity-100'}`}>
                                                    {/* Visual Cue Logic: If I am in "Absent" tab, showing "Absent" students. Clicking usually makes them Present. */}
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-white truncate w-full text-center leading-tight">
                                                {student.prenom}
                                            </span>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MobilePresence;
