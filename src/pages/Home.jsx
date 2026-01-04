import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Users, GraduationCap, LayoutList, FileText, CheckSquare, ChevronDown, Clock, Search, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import StudentTrackingPDFModern from '../components/StudentTrackingPDFModern';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const abortRef = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleEsc = (e) => {
            if (isGenerating && e.key === 'Escape') {
                handleCancelGeneration();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isGenerating]);

    const handleCancelGeneration = () => {
        if (isGenerating) {
            abortRef.current = true;
            setProgressText('Annulation en cours...');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    // Fetch Students with Levels
                    const { data: studentsData, error: studentsError } = await supabase
                        .from('Eleve')
                        .select('*, Niveau(nom, ordre), Classe(nom)')
                        .eq('titulaire_id', user.id);

                    if (!studentsError) setStudents(studentsData || []);

                    // Fetch Groups
                    const { data: groupsData, error: groupsError } = await supabase
                        .from('Groupe')
                        .select('*')
                        .order('nom');

                    if (!groupsError) {
                        setGroups(groupsData || []);
                        if (groupsData?.length > 0) setSelectedGroup(groupsData[0]);
                    }
                }
            } catch (err) {
                console.error('Exception fetching home data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleGenerateGroupTodoList = async () => {
        if (!selectedGroup) return;

        const ecoMode = true; // Always Eco Mode for Home Quick Access
        const filename = `Listes_Travail_${selectedGroup.nom.replace(/\s+/g, '_')}_ECO.pdf`;
        let fileHandle = null;

        // 1. Try to open Save Dialog immediately
        if (window.showSaveFilePicker) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn('File picker failed, falling back to download', err);
            }
        }

        setIsGenerating(true);
        abortRef.current = false;
        setProgress(5);
        setProgressText('Récupération des données...');

        try {
            if (abortRef.current) throw new Error('ABORTED');

            // 2. Fetch data needed for PDF generation
            // Fetch students in group
            const { data: links } = await supabase
                .from('EleveGroupe')
                .select('eleve_id')
                .eq('groupe_id', selectedGroup.id);

            const studentIds = links?.map(l => l.eleve_id) || [];
            if (studentIds.length === 0) {
                alert("Aucun élève dans ce groupe.");
                setIsGenerating(false);
                return;
            }

            const { data: studentsInGroup } = await supabase
                .from('Eleve')
                .select('*, Classe(nom)')
                .in('id', studentIds)
                .order('nom');

            // Fetch modules
            const { data: modulesData } = await supabase
                .from('Module')
                .select(`
                    id, nom, date_fin,
                    Activite ( id, titre )
                `)
                .order('date_fin', { ascending: true });

            // Fetch progressions
            const { data: progressions } = await supabase
                .from('Progression')
                .select('*')
                .in('eleve_id', studentIds);

            // 3. Build bulk data
            const bulkData = studentsInGroup.map(student => {
                const studentProgress = progressions?.filter(p => p.eleve_id === student.id) || [];

                const activeModules = modulesData?.map(module => {
                    if (!module.date_fin) return null;
                    const relevantActivities = (module.Activite || []).filter(act => {
                        const prog = studentProgress.find(p => p.activite_id === act.id);
                        return prog && prog.statut !== 'valide';
                    });

                    if (relevantActivities.length === 0) return null;

                    return {
                        title: module.nom,
                        dueDate: module.date_fin,
                        activities: relevantActivities.map(a => ({ name: a.titre }))
                    };
                }).filter(Boolean) || [];

                if (activeModules.length === 0) return null;

                return {
                    studentName: `${student.prenom} ${student.nom}`,
                    modules: activeModules,
                    printDate: new Date().toLocaleDateString('fr-FR')
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                alert("Aucun travail à faire trouvé pour ce groupe.");
                setIsGenerating(false);
                return;
            }

            setProgress(10);
            setProgressText('Préparation de la fusion...');
            const mergedPdf = await PDFDocument.create();

            let processed = 0;
            for (const studentData of bulkData) {
                if (abortRef.current) throw new Error('ABORTED');
                processed++;
                const percentage = 10 + Math.round((processed / bulkData.length) * 70);
                setProgress(percentage);
                setProgressText(`Génération : ${studentData.studentName}...`);

                const blob = await pdf(<StudentTrackingPDFModern data={studentData} />).toBlob();
                const arrayBuffer = await blob.arrayBuffer();
                const studentDoc = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(studentDoc, studentDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            // Eco Mode Assembly
            setProgress(82);
            setProgressText('Mise en page LIVRET A5...');
            const bookletPdf = await PDFDocument.create();
            const mergedPdfBytes = await mergedPdf.save();
            const srcDoc = await PDFDocument.load(mergedPdfBytes);
            const embeddedPages = await bookletPdf.embedPdf(srcDoc, srcDoc.getPageIndices());
            const pageCount = embeddedPages.length;

            for (let i = 0; i < pageCount; i += 2) {
                if (abortRef.current) throw new Error('ABORTED');
                const assemblyPercentage = 82 + Math.round((i / pageCount) * 13);
                setProgress(assemblyPercentage);
                setProgressText(`Assemblage page ${Math.floor(i / 2) + 1}...`);

                const page = bookletPdf.addPage([841.89, 595.28]); // A4 Landscape
                const leftPage = embeddedPages[i];
                page.drawPage(leftPage, { x: 0, y: 0, width: 420.945, height: 595.28 });

                if (i + 1 < pageCount) {
                    const rightPage = embeddedPages[i + 1];
                    page.drawPage(rightPage, { x: 420.945, y: 0, width: 420.945, height: 595.28 });
                }
                page.drawLine({
                    start: { x: 420.945, y: 0 },
                    end: { x: 420.945, y: 595.28 },
                    thickness: 1,
                    color: rgb(0, 0, 0),
                });
            }

            const finalPdfBlob = new Blob([await bookletPdf.save()], { type: 'application/pdf' });

            setProgress(95);
            setProgressText('Sauvegarde...');

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(finalPdfBlob);
                await writable.close();
            } else {
                saveAs(finalPdfBlob, filename);
            }

            setProgress(100);
            setProgressText('Terminé !');
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
                setProgressText('');
            }, 2000);

        } catch (error) {
            if (error.message !== 'ABORTED') {
                console.error("Error generating PDF:", error);
                alert("Erreur lors de la génération du PDF.");
            }
        } finally {
            if (!abortRef.current) setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Group students by level
    const studentsByLevel = students.reduce((acc, student) => {
        const levelName = student.Niveau?.nom || 'Sans Niveau';
        const levelOrder = student.Niveau?.ordre || 999;

        if (!acc[levelName]) {
            acc[levelName] = {
                order: levelOrder,
                students: []
            };
        }
        acc[levelName].students.push(student);
        return acc;
    }, {});

    // Sort levels and students
    const sortedLevels = Object.entries(studentsByLevel)
        .sort(([, a], [, b]) => a.order - b.order);

    sortedLevels.forEach(([, data]) => {
        data.students.sort((a, b) => a.prenom.localeCompare(b.prenom));
    });

    const handleStudentClick = (student) => {
        // Navigate to Student Admin page -> Details -> Suivi Tab
        navigate('/dashboard/user/students', {
            state: {
                selectedStudentId: student.id,
                initialTab: 'suivi'
            }
        });
    };

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-primary mb-2">Tableau de bord</h1>
                <p className="text-grey-medium">
                    {user ? `Bienvenue, ${user.email}` : 'Bienvenue dans votre espace de gestion.'}
                </p>
            </header>

            {/* Quick Access Section */}
            <section className="bg-surface p-6 rounded-2xl shadow-lg border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-text-main">Accès Rapide</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-grey-medium uppercase tracking-wider ml-1">
                            Groupe
                        </label>
                        <div className="relative">
                            <select
                                value={selectedGroup?.id || ''}
                                onChange={(e) => {
                                    const grp = groups.find(g => g.id === e.target.value);
                                    setSelectedGroup(grp);
                                }}
                                className="w-full h-12 bg-background/50 border border-white/10 rounded-xl px-4 item-start text-text-main font-medium focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer hover:bg-background/80 transition-colors"
                            >
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.nom}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-medium pointer-events-none" />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateGroupTodoList}
                        disabled={!selectedGroup || isGenerating}
                        className={clsx(
                            "w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:scale-[1.02]",
                            isGenerating
                                ? "bg-primary text-text-dark shadow-xl shadow-primary/20"
                                : "bg-surface border border-white/10 hover:bg-white/5 text-text-main"
                        )}
                    >
                        {isGenerating ? (
                            <div className="w-full px-4 flex flex-col gap-1 justify-center">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-text-dark w-full">
                                    <span className="truncate pr-2">{progressText}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-1 bg-text-dark/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-text-dark transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <FileText size={16} strokeWidth={2.5} />
                                Générer les listes de travail
                            </>
                        )}
                    </button>
                </div>
            </section>

            {/* Students Grid Section */}
            <div className="space-y-8">
                {sortedLevels.map(([levelName, { students }]) => (
                    <section key={levelName} className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-xs font-bold text-text-secondary border border-white/5">
                                {levelName}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => handleStudentClick(student)}
                                    className="group relative bg-surface hover:bg-white/5 border border-white/5 rounded-xl p-2 flex flex-row items-center gap-3 transition-all hover:translate-x-1 hover:shadow-lg cursor-pointer"
                                >
                                    <div className="relative shrink-0 w-[35%] aspect-square max-w-[80px] min-w-[50px]">
                                        <div className="w-full h-full rounded-full bg-background border-2 border-white/5 p-0.5 overflow-hidden group-hover:border-primary/50 transition-colors">
                                            {student.photo_base64 ? (
                                                <img
                                                    src={student.photo_base64}
                                                    alt={student.prenom}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5 text-primary">
                                                    <User className="w-1/2 h-1/2" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <h3 className="font-bold text-lg md:text-xl text-text-main truncate leading-tight">
                                            {student.prenom}
                                        </h3>
                                        {/* Hidden status indicator if we want to show it later */}
                                        <div className="h-1 w-1 rounded-full bg-success mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>

                                    <ChevronDown className="-rotate-90 w-4 h-4 text-grey-dark group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {sortedLevels.length === 0 && (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-grey-dark rounded-2xl text-grey-medium bg-surface/30">
                        <Users className="w-12 h-12 mb-2 opacity-20" />
                        <p>Aucun élève trouvé.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
