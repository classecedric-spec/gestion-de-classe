/**
 * Nom du module/fichier : StudentDetailsTodo.tsx
 * 
 * Données en entrée : L'élève sélectionné et les fonctions pour afficher les QR Codes ou générer des PDF.
 * 
 * Données en sortie : Un panneau d'actions permettant d'exporter différents documents pour l'élève.
 * 
 * Objectif principal : Centraliser tous les outils "papier" et "liens" pour un élève. C'est l'onglet où l'enseignant va pour imprimer une fiche QR Code (pour que l'élève se connecte sur tablette), copier un lien direct, ou générer une "To-do list" (liste de tâches) imprimable des activités à réaliser.
 * 
 * Ce que ça affiche : Une grille de boutons d'action stylisés (cartes cliquables) avec des icônes explicatives.
 */

import React from 'react';
import { FileText, QrCode, Link } from 'lucide-react';
import { ActionItem } from '../../../../core';
import { getAppBaseUrl } from '../../../../utils/urlUtils';
import { copyToClipboard } from '../../../../utils/clipboardUtils';
import { toast } from 'sonner';

interface StudentDetailsTodoProps {
    student: any;
    onShowQR: (tab: 'encodage' | 'planification' | 'both') => void;
    onGenerateTodoPDF: () => void;
}

export const StudentDetailsTodo: React.FC<StudentDetailsTodoProps> = ({ student, onShowQR, onGenerateTodoPDF }) => {
    const baseUrl = getAppBaseUrl();
    const token = student?.access_token || '';
    const encodageUrl = `${baseUrl}/kiosk/${student?.id}?token=${token}`;
    const planificationUrl = `${baseUrl}/kiosk/planning/${student?.id}?token=${token}`;

    // Le bouton de partage : il copie l'adresse internet secrète de l'élève dans le presse-papier pour l'envoyer par mail ou l'enregistrer ailleurs.
    const handleCopy = async (url: string, type: string) => {
        const success = await copyToClipboard(url);
        if (success) {
            toast.success(`Lien ${type} copié !`);
        } else {
            toast.error("Échec de la copie");
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Buttons Section */}
            <div className="p-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-grey-medium mb-6">
                    Impression & Exportation
                </h3>
                {/* Grille d'outils : organise les différentes options de manière visuelle et aérée. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Encodage"
                        subtitle="Accès direct au Kiosque"
                        // Accès direct : ouvre la fenêtre de QR Code réglée uniquement pour la validation des exercices.
                        onClick={() => onShowQR('encodage')}
                    />
                    <ActionItem
                        icon={Link}
                        label="Copier Lien Encodage"
                        subtitle="Lien direct vers le kiosque"
                        onClick={() => handleCopy(encodageUrl, 'encodage')}
                    />
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Planification"
                        subtitle="Fiche pour le planning"
                        onClick={() => onShowQR('planification')}
                    />
                    <ActionItem
                        icon={Link}
                        label="Copier Lien Planning"
                        subtitle="Lien direct vers le planning"
                        onClick={() => handleCopy(planificationUrl, 'planification')}
                    />
                    <ActionItem
                        icon={QrCode}
                        label="Exporter PDF Les deux"
                        subtitle="Format mixte (recommandé)"
                        onClick={() => onShowQR('both')}
                    />
                    <ActionItem
                        icon={FileText}
                        label="Exporter To-do List"
                        subtitle="Version textuelle des activités"
                        // Bilan textuel : génère un document PDF listant toutes les activités que l'élève doit encore réaliser.
                        onClick={onGenerateTodoPDF}
                    />
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/5">
                    <p className="text-xs text-grey-medium italic text-center opacity-40">
                        Les documents PDF sont générés instantanément et s'ouvrent dans un nouvel onglet.
                    </p>
                </div>
            </div>
        </div>
    );
};

/**
 * 1. Le professeur clique sur l'onglet "PDF" du panneau latéral.
 * 2. Le composant `StudentDetailsTodo` affiche 6 actions possibles.
 * 3. Si le professeur veut donner l'accès tablette à l'enfant :
 *    a. Il choisit "Exporter PDF Encodage".
 *    b. Une fenêtre s'ouvre avec le QR Code prêt à imprimer.
 * 4. Si le professeur veut envoyer le lien aux parents :
 *    a. Il clique sur "Copier Lien Encodage".
 *    b. Une petite notification ("Toast") confirme que le lien est copié.
 * 5. Si le professeur veut faire un point sur le travail restant :
 *    a. Il clique sur "Exporter To-do List".
 *    b. Un PDF textuel est généré et se télécharge sur l'ordinateur.
 */
