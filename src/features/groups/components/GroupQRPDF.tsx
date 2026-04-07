/**
 * Nom du module/fichier : GroupQRPDF.tsx
 * 
 * Données en entrée : 
 *   - `groupName` : Le nom du groupe (ex: "Groupe Lecture") pour identifier le document.
 *   - `studentsWithQR` : La liste des élèves, chacun avec ses images de QR Codes déjà "photographiées" (Data URLs).
 *   - `mode` : Le type de badge souhaité ('encodage', 'planification' ou 'both').
 * 
 * Données en sortie : 
 *   - Un document virtuel (PDF) au format A4, structuré et prêt pour l'impression réelle.
 * 
 * Objectif principal : Agir comme un "Maquettiste" ou un "Imprimeur virtuel". Ce fichier ne contient aucune logique de calcul ; son seul rôle est la mise en page esthétique et pratique. Il définit précisément où placer le nom de l'élève, quelle taille doit faire le QR Code, et surtout où tracer les lignes pointillées pour que l'enseignant puisse découper les badges proprement avec des ciseaux.
 * 
 * Ce que ça affiche : Le squelette visuel d'une page A4 remplie d'étiquettes à découper (3 par ligne en mode simple, 2 par ligne en mode mixte).
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

/**
 * STYLE ET MISE EN PAGE : 
 * On définit ici la "planche de découpe". On utilise des unités de mesure précises 
 * pour que le résultat soit parfait sur une feuille de papier standard.
 */
const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
        padding: 20,
        alignContent: 'flex-start',
    },
    // Case de découpe pour un seul QR Code (3 badges par largeur de page)
    cutCellSingle: {
        width: '33.33%',
        padding: 5,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed', // Ligne pointillée pour les ciseaux
        borderWidth: 1,
        borderColor: '#cccccc',
    },
    // Case de découpe pour deux QR Codes (2 badges par largeur de page)
    cutCellBoth: {
        width: '50%',
        padding: 10,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#cccccc',
    },
    card: {
        borderWidth: 2,
        borderColor: '#000000',
        borderRadius: 15,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    qrRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: 20,
        paddingHorizontal: 10,
    },
    qrCol: {
        alignItems: 'center',
        gap: 5,
    },
    qrLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#254154',
        textTransform: 'uppercase',
    },
    qrImageSmall: {
        width: 100,
        height: 100,
    },
    qrImageWrapper: {
        borderWidth: 2,
        borderColor: '#254154',
        borderRadius: 8,
        padding: 5,
        backgroundColor: '#ffffff',
    },
    header: {
        backgroundColor: '#254154', // Bleu-Gris sombre (identitaire de l'app)
        color: 'white',
        width: '100%',
        padding: 10,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    qrContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: 10,
    },
    qrImage: {
        width: 130,
        height: 130,
    },
    footer: {
        marginBottom: 15,
        fontSize: 10,
        color: '#666666',
        textAlign: 'center',
    },
});

export interface QRData {
    encodage: string;
    planification: string;
}

export interface StudentWithQR {
    id: string;
    prenom: string;
    nom: string;
    qrData: QRData;
}

interface GroupQRPDFProps {
    groupName: string;
    studentsWithQR: StudentWithQR[];
    mode?: 'encodage' | 'planification' | 'both';
}

/**
 * Composant responsable de générer le document PDF final.
 */
const GroupQRPDF: React.FC<GroupQRPDFProps> = ({ groupName, studentsWithQR, mode = 'encodage' }) => {

    return (
        <Document title={`Badges QR - ${groupName}`}>
            <Page size="A4" style={styles.page}>
                {/* On parcourt chaque élève pour construire son étiquette */}
                {studentsWithQR.map((student) => (
                    <View 
                        style={mode === 'both' ? styles.cutCellBoth : styles.cutCellSingle} 
                        key={student.id} 
                        wrap={false} // Empêche de couper une étiquette sur deux pages
                    >
                        <View style={styles.card}>
                            {/* EN-TÊTE DU BADGE : Nom de l'enfant */}
                            <View style={styles.header}>
                                <Text style={{ textAlign: 'center' }}>
                                    {student.prenom} {student.nom}
                                </Text>
                            </View>

                            {/* CONTENU CENTRAL : Le ou les QR Codes */}
                            <View style={styles.qrContainer}>
                                {mode === 'both' ? (
                                    /* Mode deux codes (Mixte) */
                                    <View style={styles.qrRow}>
                                        <View style={styles.qrCol}>
                                            <Text style={styles.qrLabel}>Validation</Text>
                                            <View style={styles.qrImageWrapper}>
                                                <Image src={student.qrData.encodage} style={styles.qrImageSmall} />
                                            </View>
                                        </View>
                                        <View style={styles.qrCol}>
                                            <Text style={styles.qrLabel}>Planning</Text>
                                            <View style={styles.qrImageWrapper}>
                                                <Image src={student.qrData.planification} style={styles.qrImageSmall} />
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    /* Mode un seul code (Normal) */
                                    <View style={styles.qrImageWrapper}>
                                        <Image 
                                            src={mode === 'encodage' ? student.qrData.encodage : student.qrData.planification} 
                                            style={styles.qrImage} 
                                        />
                                    </View>
                                )}
                            </View>

                            {/* PIED DU BADGE : Rappel du but du QR Code */}
                            <Text style={styles.footer}>
                                {mode === 'both' ? 'Badges de connexion' : mode === 'planification' ? 'Mode Planification' : 'Mode Encodage'}
                            </Text>
                        </View>
                    </View>
                ))}
            </Page>
        </Document>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le composant `GroupQRModal.tsx` appelle cet "Imprimeur virtuel" en lui donnant les photos des codes.
 * 2. L'Imprimeur sort une feuille de papier A4 virtuelle blanche.
 * 3. Pour chaque enfant de la liste (ex: Julie) :
 *    - Il réserve une petite zone de la page (environ 1/9ème de la feuille).
 *    - Il trace des bordures pointillées grises tout autour (pour aider l'enseignant à découper droit).
 *    - Il dessine un bandeau bleu foncé avec le nom "JULIE DUPONT" en blanc.
 *    - Il insère l'image du QR Code au milieu, bien centrée.
 *    - Il ajoute une petite légende en bas (ex: "Mode Planification").
 * 4. Si la première feuille A4 est pleine, il en crée automatiquement une deuxième.
 * 5. Une fois terminé, le document est transformé en fichier PDF et proposé au téléchargement ou à l'ouverture immédiate.
 */
export default GroupQRPDF;
