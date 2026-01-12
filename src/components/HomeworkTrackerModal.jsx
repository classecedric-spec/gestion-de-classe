
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, Calendar, Check, XCircle, Save, History, ChevronLeft, Loader2 } from 'lucide-react';
import { getInitials } from '../lib/utils';
import clsx from 'clsx';
import { toast } from 'sonner';

const HomeworkTrackerModal = ({ isOpen, onClose, students }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [statusMap, setStatusMap] = useState({}); // { studentId: 'fait' | 'non_fait' | 'rattrape' }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState('entry'); // 'entry' | 'history'

    useEffect(() => {
        if (isOpen && students.length > 0) {
            fetchDayStatus();
        }
    }, [isOpen, date]);

    const fetchDayStatus = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('Devoirs')
                .select('eleve_id, statut')
                .eq('date', date)
                .in('eleve_id', students.map(s => s.id));

            if (data) {
                const newMap = {};
                // Default everyone to 'fait' if no record, OR load existing
                // Actually, let's leave undefined if not set, or default to 'fait' visually but not in DB yet?
                // Better: if no record exists, UI shows "Non renseigné" or defaults to Checked?
                // Let's default to "Fait" (Checked) for UI simplicity, assuming most do it.

                students.forEach(s => {
                    const record = data.find(d => d.eleve_id === s.id);
                    newMap[s.id] = record ? record.statut : 'fait';
                });
                setStatusMap(newMap);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (studentId) => {
        setStatusMap(prev => {
            const current = prev[studentId];
            /* Cycle: fait -> non_fait -> rattrape -> fait */
            let next = 'fait';
            if (current === 'fait') next = 'non_fait';
            else if (current === 'non_fait') next = 'rattrape';
            else next = 'fait';

            return { ...prev, [studentId]: next };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const upsertData = students.map(s => ({
                eleve_id: s.id,
                date: date,
                statut: statusMap[s.id] || 'fait',
                user_id: user?.id
            }));

            // Use upsert
            const { error } = await supabase
                .from('Devoirs')
                .upsert(upsertData, { onConflict: 'eleve_id, date' });

            if (error) throw error;
            toast.success("Suivi des devoirs enregistré !");
            onClose();
        } catch (err) {
            toast.error("Erreur lors de la sauvegarde.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-background/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        <h2 className="text-xl font-black text-text-main uppercase tracking-tight">
                            Suivi des Devoirs
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-grey-medium hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-surface">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                        onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                        className="bg-background border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                    />
                    <div className="flex-1" />
                    {/* Future: Add History Toggle Button here */}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {students.map(student => {
                                const status = statusMap[student.id] || 'fait';
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => toggleStatus(student.id)}
                                        className={clsx(
                                            "flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all select-none",
                                            status === 'fait' ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" :
                                                status === 'non_fait' ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10" :
                                                    "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-background border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                                            {student.photo_base64 ? (
                                                <img src={student.photo_base64} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-black text-grey-medium">{getInitials(student)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-text-main">{student.prenom} {student.nom}</p>
                                        </div>
                                        <div className={clsx(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                            status === 'fait' ? "bg-emerald-500 text-white" :
                                                status === 'non_fait' ? "bg-rose-500 text-white" :
                                                    "bg-amber-500 text-white"
                                        )}>
                                            {status.replace('_', ' ')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-background/50 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Enregistrer
                    </button>
                </div>

            </div>
        </div>
    );
};

export default HomeworkTrackerModal;
