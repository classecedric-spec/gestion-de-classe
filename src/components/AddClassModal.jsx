import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Edit, BookOpen } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import ImageUpload from './ui/ImageUpload';

const AddClassModal = ({ isOpen, onClose, onAdded, classToEdit }) => {
    const [name, setName] = useState('');
    const [acronym, setAcronym] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [photoBase64, setPhotoBase64] = useState('');
    const [selectedAdults, setSelectedAdults] = useState([]); // Array of { adulte_id, role }
    const [adults, setAdults] = useState([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAdults();
    }, []);

    const fetchAdults = async () => {
        const { data } = await supabase.from('Adulte').select('id, nom, prenom').order('nom');
        setAdults(data || []);
    };

    useEffect(() => {
        if (isOpen) {
            if (classToEdit) {
                setName(classToEdit.nom);
                setAcronym(classToEdit.acronyme || '');
                setLogoUrl(classToEdit.logo_url || '');
                setPhotoBase64(classToEdit.photo_base64 || '');
                fetchClassAdults(classToEdit.id);
            } else {
                setName('');
                setAcronym('');
                setLogoUrl('');
                setPhotoBase64('');
                setSelectedAdults([]);
            }
        }
    }, [isOpen, classToEdit]);

    const fetchClassAdults = async (classId) => {
        const { data } = await supabase
            .from('ClasseAdulte')
            .select('adulte_id, role')
            .eq('classe_id', classId);
        setSelectedAdults(data || []);
    };

    const handleAddAdultRow = () => {
        setSelectedAdults(prev => [...prev, { adulte_id: '', role: 'principal' }]);
    };

    const handleRemoveAdultRow = (index) => {
        setSelectedAdults(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateAdult = (index, field, value) => {
        setSelectedAdults(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Vous devez être connecté pour créer une classe.");

            let classId = classToEdit?.id;

            if (classToEdit) {
                const { error } = await supabase
                    .from('Classe')
                    .update({
                        nom: name,
                        acronyme: acronym,
                        logo_url: logoUrl,
                        photo_base64: photoBase64,
                        // titulaire_id is deprecated but keeping for legacy compatibility if column exists
                        // titulaire_id: selectedAdults.find(a => a.role === 'principal')?.adulte_id || null
                    })
                    .eq('id', classId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('Classe').insert([{
                    nom: name,
                    acronyme: acronym,
                    logo_url: logoUrl,
                    photo_base64: photoBase64,
                    user_id: user.id
                }]).select().single();

                if (error) throw error;
                classId = data.id;
            }

            // Sync ClasseAdulte
            // Simplistic sync: delete all and re-insert (fine for small sets)
            await supabase.from('ClasseAdulte').delete().eq('classe_id', classId);

            const validAdults = selectedAdults.filter(a => a.adulte_id);
            if (validAdults.length > 0) {
                const toInsert = validAdults.map(a => ({
                    classe_id: classId,
                    adulte_id: a.adulte_id,
                    role: a.role,
                    user_id: user.id
                }));
                const { error: linkError } = await supabase.from('ClasseAdulte').insert(toInsert);
                if (linkError) throw linkError;
            }

            onAdded({ id: classId, nom: name });
            onClose();
        } catch (error) {
            alert('Erreur: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={classToEdit ? "Modifier la Classe" : "Nouvelle Classe"}
            icon={classToEdit ? <Edit size={24} /> : <Plus size={24} />}
            footer={
                <>
                    <Button onClick={onClose} variant="secondary" className="flex-1">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleCreateClass}
                        loading={loading}
                        className="flex-1"
                        icon={classToEdit ? null : Plus}
                    >
                        {classToEdit ? "Enregistrer" : "Créer la classe"}
                    </Button>
                </>
            }
        >
            <form onSubmit={(e) => { e.preventDefault(); handleCreateClass(e); }} className="space-y-4">
                <ImageUpload
                    value={photoBase64}
                    onChange={setPhotoBase64}
                    label="Photo de la classe"
                    placeholderIcon={BookOpen}
                />

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Nom de la classe</label>
                    <input
                        type="text"
                        placeholder="Ex: 5ème Scientifique"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-grey-light uppercase">Acronyme</label>
                    <input
                        type="text"
                        placeholder="Ex: 5SC"
                        value={acronym}
                        onChange={e => setAcronym(e.target.value)}
                        className="w-full bg-input border border-border/10 rounded-xl p-3 text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-grey-light uppercase">Personnel Enseignant</label>
                        <button
                            type="button"
                            onClick={handleAddAdultRow}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider flex items-center gap-1"
                        >
                            <Plus size={12} /> Ajouter
                        </button>
                    </div>

                    <div className="space-y-2">
                        {selectedAdults.map((row, index) => (
                            <div key={index} className="flex gap-2 items-start animate-in slide-in-from-top-1">
                                <select
                                    value={row.adulte_id}
                                    onChange={e => handleUpdateAdult(index, 'adulte_id', e.target.value)}
                                    className="flex-1 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="">Sélectionner...</option>
                                    {adults.map(a => (
                                        <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                                    ))}
                                </select>
                                <select
                                    value={row.role}
                                    onChange={e => handleUpdateAdult(index, 'role', e.target.value)}
                                    className="w-32 bg-input border border-border/10 rounded-xl p-2.5 text-sm text-text-main focus:border-primary outline-none"
                                >
                                    <option value="principal">Principal</option>
                                    <option value="coenseignant">Co-Ens.</option>
                                    <option value="support">Support</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAdultRow(index)}
                                    className="p-2.5 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                                >
                                    <Plus size={18} className="rotate-45" />
                                </button>
                            </div>
                        ))}

                        {selectedAdults.length === 0 && (
                            <p className="text-center py-2 text-xs text-grey-dark italic">Aucun personnel assigné</p>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default AddClassModal;
