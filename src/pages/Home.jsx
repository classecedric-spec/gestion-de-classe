import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Users, GraduationCap } from 'lucide-react';

const Home = () => {
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    const { data, error } = await supabase
                        .from('Eleve')
                        .select('*, Classe(nom)')
                        .eq('titulaire_id', user.id);

                    if (error) {
                        // Fallback for case sensitivity
                        if (error.code === '42P01') {
                            const { data: fallbackData, error: fallbackError } = await supabase
                                .from('eleve')
                                .select('*, classe(nom)')
                                .eq('titulaire_id', user.id);

                            if (!fallbackError) {
                                setStudents(fallbackData || []);
                            }
                        } else {
                            console.error('Error fetching students:', error);
                        }
                    } else {
                        setStudents(data || []);
                    }
                }
            } catch (err) {
                console.error('Exception fetching user or students:', err);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-full text-white">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">Tableau de bord</h1>
                    <p className="text-grey-medium">
                        {user ? `Bienvenue, ${user.email}` : 'Bienvenue dans votre espace de gestion.'}
                    </p>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-xl shadow-md border border-white/5">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Mes Élèves</h3>
                    <div className="text-4xl font-bold text-primary">{students.length}</div>
                    <p className="text-sm text-grey-medium mt-1">Élèves sous votre responsabilité</p>
                </div>

                <div className="bg-surface p-6 rounded-xl shadow-md border border-white/5">
                    <h3 className="text-lg font-semibold text-text-main mb-4">Statut</h3>
                    <div className="text-lg font-medium text-success">Connecté</div>
                    <p className="text-sm text-grey-medium mt-1">En tant que Titulaire</p>
                </div>
            </section>

            <section className="bg-surface p-8 rounded-xl shadow-md border border-white/5 mt-8">
                <h2 className="text-xl font-bold text-primary mb-4">Liste de mes élèves</h2>
                {students.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-3 px-4 text-grey-medium font-medium">Nom</th>
                                    <th className="py-3 px-4 text-grey-medium font-medium">Prénom</th>
                                    <th className="py-3 px-4 text-grey-medium font-medium">Classe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-4 text-text-main">{student.nom}</td>
                                        <td className="py-4 px-4 text-text-main">{student.prenom}</td>
                                        <td className="py-4 px-4 text-text-main">
                                            {student.Classe?.nom || student.classe?.nom || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-grey-dark rounded-lg text-grey-medium">
                        <Users className="w-12 h-12 mb-2 opacity-20" />
                        <p>Aucun élève ne vous est encore attribué.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
