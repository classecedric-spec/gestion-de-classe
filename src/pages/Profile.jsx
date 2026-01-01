import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { User, Mail, School, Camera, Save, Loader2 } from 'lucide-react';
import { resizeAndConvertToBase64 } from '../lib/imageUtils';
import clsx from 'clsx';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [profile, setProfile] = useState({
        email: '',
        nom: '',
        prenom: '',
        nom_ecole: '',
        avatar_url: '',
        photo_base64: ''
    });
    const [isDragging, setIsDragging] = useState(false);
    const { refreshProfile } = useOutletContext() || {}; // Optional chaining in case rendered outside Layout

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('CompteUtilisateur')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                setProfile({
                    email: user.email, // Email from auth
                    nom: data.nom || '',
                    prenom: data.prenom || '',
                    nom_ecole: data.nom_ecole || '',
                    avatar_url: data.avatar_url || '',
                    photo_base64: data.photo_base64 || ''
                });
            } else {
                // Pre-fill from auth meta if available
                setProfile({
                    email: user.email,
                    nom: '',
                    prenom: '',
                    nom_ecole: '',
                    avatar_url: '',
                    photo_base64: ''
                });
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const updates = {
                id: user.id,
                nom: profile.nom,
                prenom: profile.prenom,
                nom_ecole: profile.nom_ecole,
                // avatar_url: profile.avatar_url, // Removing legacy field causing schema error
                photo_base64: profile.photo_base64,
                // updated_at: new Date() // Removing field causing schema error if column missing
            };

            const { error } = await supabase.from('CompteUtilisateur').upsert(updates);

            if (error) throw error;
            // Force page reload to update layout/banner state as requested by user
            window.location.reload();
            // alert('Profil mis à jour !'); // Removed per user request
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = async (file) => {
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg')) {
            try {
                const base64 = await resizeAndConvertToBase64(file, 100, 100);
                setProfile(prev => ({ ...prev, photo_base64: base64 }));
            } catch (err) {
                console.error("Error processing image:", err);
                alert("Erreur lors du traitement de l'image");
            }
        } else {
            alert("Format non supporté. Veuillez utiliser JPG ou PNG.");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-text-main mb-2">Mon Profil</h1>
                <p className="text-grey-medium">Gérez vos informations personnelles de Titulaire.</p>
            </header>

            <form onSubmit={updateProfile} className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-xl space-y-8">

                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                    <div
                        className={clsx(
                            "w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center relative group overflow-hidden shadow-xl transition-all",
                            isDragging ? "border-primary bg-primary/20 scale-105" : "bg-white/5 border-white/20",
                            (profile.photo_base64 || profile.avatar_url) && "bg-[#D9B981]"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {profile.photo_base64 ? (
                            <img src={profile.photo_base64} alt="Avatar" className="w-[90%] h-[90%] object-contain" />
                        ) : profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-[90%] h-[90%] object-contain" />
                        ) : (
                            <User size={48} className={isDragging ? "text-primary animate-bounce" : "text-grey-medium"} />
                        )}
                        <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="text-white mb-2" size={32} />
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Modifier</span>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </label>
                    </div>
                    <p className="text-[10px] font-bold text-grey-medium uppercase tracking-wider">
                        {isDragging ? "Déposez l'image ici" : "Photo de profil (JPG/PNG)"}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Prénom</label>
                        <input
                            type="text"
                            value={profile.prenom}
                            onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                            className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            placeholder="Votre prénom"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-grey-light uppercase tracking-wide">Nom</label>
                        <input
                            type="text"
                            value={profile.nom}
                            onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                            className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            placeholder="Votre nom"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                        <Mail size={14} /> Email (Non modifiable)
                    </label>
                    <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-grey-medium cursor-not-allowed"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-grey-light uppercase tracking-wide flex items-center gap-2">
                        <School size={14} /> Nom de l'école (Optionnel)
                    </label>
                    <input
                        type="text"
                        value={profile.nom_ecole}
                        onChange={(e) => setProfile({ ...profile, nom_ecole: e.target.value })}
                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Ex: École Saint-Joseph"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={updating}
                        className="px-8 py-3 bg-primary text-text-dark font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {updating ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Enregistrer
                    </button>
                </div>

            </form>
        </div>
    );
};

export default Profile;
