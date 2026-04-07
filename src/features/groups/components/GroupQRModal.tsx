/**
 * Nom du module/fichier : GroupQRModal.tsx
 * 
 * Données en entrée : 
 *   - `groupName` : Le nom du groupe d'élèves concerné (ex: "Groupe Lecture").
 *   - `students` : La liste des élèves, contenant leurs identifiants et leurs codes d'accès secrets (`access_token`).
 *   - `isOpen` : Un interrupteur (vrai/faux) pour afficher ou masquer cette fenêtre.
 *   - `initialTab` : L'onglet (Encodage / Planification) à afficher par défaut à l'ouverture.
 * 
 * Données en sortie : 
 *   - Un aperçu visuel des codes QR à l'écran pour vérification immédiate.
 *   - Un document PDF structuré, généré à la volée, prêt à être imprimé et découpé en badges.
 * 
 * Objectif principal : Créer des "Clés numériques" (QR Codes) pour simplifier la vie des élèves. Au lieu de taper des identifiants compliqués sur les tablettes de la classe, les enfants présentent leur badge devant la caméra pour se connecter instantanément. Cette fenêtre centralise la création de ces badges pour tout un groupe, avec deux modes : le "Kiosque d'Encodage" (pour valider les exercices finis) et le "Kiosque de Planification" (pour organiser sa journée de travail).
 * 
 * Ce que ça affiche : Une fenêtre surgissante élégante avec des onglets de sélection, une grille d'aperçu des badges et un bouton d'exportation PDF.
 */

import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { X, Printer, QrCode, Keyboard, CalendarDays } from 'lucide-react';
import { getAppBaseUrl } from '../../../utils/urlUtils';
import { pdf } from '@react-pdf/renderer';
import GroupQRPDF, { StudentWithQR, QRData } from './GroupQRPDF';
import QRCodeGenerator from 'qrcode';
import clsx from 'clsx';

interface GroupQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    students: any[];
    initialTab?: QRTab;
}

type QRTab = 'encodage' | 'planification' | 'both';

/**
 * Assistant de création et d'impression des badges de connexion rapide (QR Codes).
 */
const GroupQRModal: React.FC<GroupQRModalProps> = ({ isOpen, onClose, groupName, students, initialTab = 'encodage' }) => {
    // ÉTAT : On mémorise quel type de badge le professeur veut fabriquer actuellement.
    const [activeTab, setActiveTab] = useState<QRTab>(initialTab);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    const baseUrl = getAppBaseUrl();

    /** 
     * CALCUL DE L'ADRESSE : 
     * Pour chaque élève, on fabrique le lien "secret" qui sera caché derrière le QR Code.
     */
    const getStudentUrl = (student: any) => {
        const token = student.access_token || '';
        if (activeTab === 'encodage') {
            return `${baseUrl}/kiosk/${student.id}?token=${token}`;
        }
        return `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;
    };

    /** 
     * GÉNÉRATION DU PDF : 
     * C'est l'étape la plus complexe : transformer les dessins mathématiques de l'écran 
     * en véritables "photos" (Data URLs) pour qu'elles soient acceptées par l'imprimante virtuelle PDF.
     */
    const handlePrint = async () => {
        try {
            const promises = students.map(async (student) => {
                const token = student.access_token || '';
                const encodageUrl = `${baseUrl}/kiosk/${student.id}?token=${token}`;
                const planificationUrl = `${baseUrl}/kiosk/planning/${student.id}?token=${token}`;

                // Fonction de "prise de photo" du QR Code
                const generateQR = async (url: string) => {
                    return await QRCodeGenerator.toDataURL(url, {
                        width: 300,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' },
                    });
                };

                const qrData: QRData = { encodage: '', planification: '' };

                if (activeTab === 'encodage' || activeTab === 'both') {
                    qrData.encodage = await generateQR(encodageUrl);
                }
                if (activeTab === 'planification' || activeTab === 'both') {
                    qrData.planification = await generateQR(planificationUrl);
                }

                return {
                    id: student.id,
                    prenom: student.prenom,
                    nom: student.nom,
                    qrData,
                } as StudentWithQR;
            });

            // On attend que toutes les "photos" soient prises
            const studentsWithQR = await Promise.all(promises);

            // On envoie ces photos au responsable de la mise en page (GroupQRPDF)
            const blob = await pdf(
                <GroupQRPDF
                    groupName={groupName}
                    studentsWithQR={studentsWithQR}
                    mode={activeTab}
                />
            ).toBlob();
            
            // On ouvre le résultat final dans un nouvel onglet pour l'impression.
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Erreur lors de la production du PDF QR:', error);
            alert("Une erreur technique empêche la création du document d'impression.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">
                
                {/* EN-TÊTE : Titre et bouton de fermeture */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <QrCode size={20} className="text-primary" />
                        Badges de connexion : {groupName}
                    </h3>
                    <button onClick={onClose} aria-label="Fermer" className="p-1 hover:bg-white/10 rounded-lg text-grey-medium hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* ONGLETS : Choix de la destination du scan (Encodage ou Planification) */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('encodage')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'encodage' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Keyboard size={16} /> Encodage (Validation)
                    </button>
                    <button
                        onClick={() => setActiveTab('planification')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'planification' ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400' : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <CalendarDays size={16} /> Planification (Agenda)
                    </button>
                    <button
                        onClick={() => setActiveTab('both')}
                        className={clsx(
                            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all',
                            activeTab === 'both' ? 'bg-orange-500/10 text-orange-400 border-b-2 border-orange-400' : 'text-grey-medium hover:text-white hover:bg-white/5'
                        )}
                    >
                        <QrCode size={16} /> Badges mixtes
                    </button>
                </div>

                {/* ZONE DE PRÉVISUALISATION : Grille des badges à l'écran */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {students.map(student => {
                            return (
                                <div key={student.id} className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3">
                                    <h4 className="font-bold text-black text-center truncate w-full">{student.prenom} {student.nom}</h4>
                                    <div className="bg-white p-2">
                                        {activeTab === 'both' ? (
                                            /* Affichage de deux petits codes (mixte) */
                                            <div className="flex gap-4 items-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[7px] text-gray-500 font-bold">ENCODAGE</span>
                                                    <QRCode value={`${baseUrl}/kiosk/${student.id}?token=${student.access_token || ''}`} size={70} />
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[7px] text-gray-500 font-bold">PLANNING</span>
                                                    <QRCode value={`${baseUrl}/kiosk/planning/${student.id}?token=${student.access_token || ''}`} size={70} />
                                                </div>
                                            </div>
                                        ) : (
                                            /* Affichage d'un seul grand code */
                                            <div className="border-2 border-primary/20 p-3 rounded-xl bg-white shadow-sm">
                                                <QRCode value={getStudentUrl(student)} size={120} />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Badge {activeTab}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* PIED DE PAGE : Actions de fermeture ou d'impression */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-surface">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-white hover:bg-white/5 transition-colors">
                        Annuler
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-xl font-bold bg-primary text-black hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg"
                    >
                        <Printer size={18} />
                        Générer et Imprimer (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le professeur a fini de créer son groupe d'ateliers et veut distribuer les badges de connexion aux élèves.
 * 2. Il ouvre `GroupQRModal`. Le composant dessine immédiatement les QR Codes à l'écran.
 * 3. Choix du mode : 
 *    - Si le prof choisit "Badges Mixtes", chaque badge contiendra deux codes (un pour le travail, un pour le planning).
 * 4. Prévisualisation : Le professeur vérifie à l'écran que chaque enfant a bien son nom associé à un code unique.
 * 5. Production : Le professeur clique sur "Générer et Imprimer".
 * 6. Le logiciel "photographie" chaque dessin mathématique (QR Code) pour le transformer en fichier image.
 * 7. Ces images sont envoyées au moteur PDF qui les range sur une feuille A4 virtuelle.
 * 8. Le document PDF final s'ouvre : le professeur n'a plus qu'à l'imprimer, découper les badges et les distribuer aux enfants.
 */
export default GroupQRModal;
