/**
 * Nom du module/fichier : AttendancePDF.tsx
 * 
 * Données en entrée : 
 *   - groupName : Le nom du groupe (ex: 'Grande Section').
 *   - dates : Liste des dates à inclure dans le tableau.
 *   - students : Informations sur les élèves (noms, niveaux).
 *   - attendances : Données de présence croisées avec leur catégorie (nom du statut).
 * 
 * Données en sortie : Un document PDF formatté prêt pour l'impression ou l'archivage.
 * 
 * Objectif principal : Créer le "document officiel" des présences. Il génère un tableau noir et blanc compact qui ressemble aux registres d'appel papier traditionnels. Le composant gère intelligemment la mise en page (paysage pour les mois, portrait pour les semaines) et calcule automatiquement les totaux par élève et par jour.
 */

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Student, Attendance, CategoriePresence } from '../services/attendanceService';

// Styles CSS spécifiques à la génération de PDF (plus limités que le web)
// On privilégie la lisibilité à l'impression : noir & blanc, lignes fines.
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#000000',
        backgroundColor: '#FFFFFF'
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        paddingBottom: 10
    },
    headerLeft: { flexDirection: 'column' },
    headerRight: { alignItems: 'flex-end' },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    subTitle: {
        fontSize: 12,
        color: '#000000',
        fontWeight: 'normal',
        marginBottom: 2
    },
    metaText: {
        fontSize: 8,
        color: '#000000',
        lineHeight: 1.4
    },
    tableContainer: {
        width: '100%',
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#000000'
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        minHeight: 18,
        alignItems: 'center'
    },
    headerRow: {
        backgroundColor: '#F0F0F0',
        borderBottomWidth: 1,
        borderBottomColor: '#000000'
    },
    nameCol: {
        width: 130,
        paddingLeft: 4,
        paddingRight: 4,
        justifyContent: 'center',
    },
    dateCol: {
        width: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#AAAAAA',
        height: '100%'
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 7,
        color: '#000000',
        textTransform: 'uppercase',
        textAlign: 'center'
    },
    nameText: {
        fontWeight: 'bold',
        fontSize: 8,
        color: '#000000'
    },
    cellText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000000',
        textAlign: 'center'
    },
});

interface AttendancePDFProps {
    groupName?: string;
    dates: string[];
    students?: Student[];
    attendances?: (Attendance & { CategoriePresence: { nom: string } | null })[];
    categories?: CategoriePresence[];
}

/**
 * Composant de structure du fichier PDF.
 */
const AttendancePDF: React.FC<AttendancePDFProps> = ({
    groupName = 'Groupe',
    dates: initialDates = [],
    students = [],
    attendances = [],
    // categories = [] 
}) => {

    /** Analyse une chaîne de date "2024-03-25" pour en faire un objet Date JS. */
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    };

    /** On ne garde que les jours de semaine (Lundi-Vendredi) pour le rapport scolaire. */
    const dates = initialDates.filter(dateStr => {
        const d = parseDate(dateStr);
        const day = d.getDay();
        return day !== 0 && day !== 6;
    });

    /** Traduit le jour en initiale (L, M, M, J, V). */
    const getWeekDay = (d: string) => {
        const date = parseDate(d);
        const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        return days[date.getDay()];
    };

    /** 
     * Détermine le symbole (I pour présent, O pour absent) à afficher dans la case. 
     * Cette logique est cruciale pour la conformité administrative.
     */
    const getStatusSymbol = (studentId: string, date: string, period: string | null = null) => {
        const record = attendances.find(a => {
            const sameStudent = a.eleve_id === studentId;
            const sameDate = a.date === date;

            if (!sameStudent || !sameDate) return false;
            if (!period) return true;

            const normalize = (str: string | null | undefined) => (str || '')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[- ]/g, '_');

            return normalize(a.periode) === normalize(period);
        });

        if (!record) return '-'; // Pas de donnée

        if (record.status === 'absent' && !record.categorie_id) {
            return 'O'; // Absent standard
        }

        if (record.categorie_id && record.CategoriePresence) {
            const categoryName = record.CategoriePresence.nom || '';
            const isAbsent = categoryName.toLowerCase().includes('absent');
            return isAbsent ? 'O' : 'I'; // On déduit si c'est une absence ou une présence
        }

        return '?';
    };

    /** Légende de la période sélectionnée. */
    const dateRangeLabel = dates.length > 0
        ? `${parseDate(dates[0]).toLocaleDateString('fr-FR')} au ${parseDate(dates[dates.length - 1]).toLocaleDateString('fr-FR')}`
        : 'Aucune période';

    /** On trie les élèves par niveau d'abord, puis par nom (ordre scolaire classique). */
    const sortedStudents = [...students].sort((a, b) => {
        const niveauA = a.Niveau?.ordre || 0;
        const niveauB = b.Niveau?.ordre || 0;
        if (niveauA !== niveauB) return niveauA - niveauB;
        return (a.nom || '').localeCompare(b.nom || '');
    });

    // --- CALCULS DE DIMENSIONS POUR LE TABLEAU ---
    const maxNameLength = Math.max(0, ...sortedStudents.map(s => {
        const nameStr = `${s.prenom} ${s.nom ? s.nom.charAt(0).toUpperCase() + '.' : ''}`;
        return nameStr.length;
    }));

    const nameColWidth = Math.max(80, (maxNameLength * 4.5) + 15);
    const isMonthly = dates.length > 12; // Si c'est un mois, on passe souvent en paysage
    const adjustedNameColWidth = isMonthly ? 60 : nameColWidth;
    const dateColWidth = isMonthly ? 10 : 15;

    const fontSize = isMonthly ? 7 : 8;
    const headerFontSize = isMonthly ? 6 : 7;
    const rowHeight = isMonthly ? 14 : 18;

    /** Utilitaires pour détecter les jours fériés ou sans cours (où tout le monde est absent). */
    const isNoSchoolDay = (date: string, period: string) => {
        if (sortedStudents.length === 0) return false;
        const allAbsent = sortedStudents.every(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            return symbol === 'O';
        });
        return allAbsent;
    };

    const isEmptyDay = (date: string, period: string) => {
        if (sortedStudents.length === 0) return false;
        return sortedStudents.every(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            return symbol === '-';
        });
    };

    // --- CALCULS DES STATISTIQUES FINALES ---
    const calculateStudentTotal = (studentId: string) => {
        let count = 0;
        dates.forEach(date => {
            ['matin', 'apres_midi'].forEach(period => {
                if (isNoSchoolDay(date, period) || isEmptyDay(date, period)) return;
                const symbol = getStatusSymbol(studentId, date, period);
                if (symbol === 'I') count++;
            });
        });
        return count;
    };

    const calculateStudentAbsent = (studentId: string) => {
        let count = 0;
        dates.forEach(date => {
            ['matin', 'apres_midi'].forEach(period => {
                if (isNoSchoolDay(date, period) || isEmptyDay(date, period)) return;
                const symbol = getStatusSymbol(studentId, date, period);
                if (symbol === 'O') count++;
            });
        });
        return count;
    };

    const calculateDayTotal = (date: string, period: string) => {
        if (isNoSchoolDay(date, period) || isEmptyDay(date, period)) return null;
        let count = 0;
        sortedStudents.forEach(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            if (symbol === 'I') count++;
        });
        return count;
    };

    const calculateDayAbsent = (date: string, period: string) => {
        if (isNoSchoolDay(date, period) || isEmptyDay(date, period)) return null;
        let count = 0;
        sortedStudents.forEach(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            if (symbol === 'O') count++;
        });
        return count;
    };

    const grandTotal = sortedStudents.reduce((total, student) => {
        return total + calculateStudentTotal(student.id);
    }, 0);

    const grandTotalAbsent = sortedStudents.reduce((total, student) => {
        return total + calculateStudentAbsent(student.id);
    }, 0);

    return (
        <Document>
            {/* Définition du format de la page */}
            <Page size="A4" orientation={dates.length > 12 ? 'landscape' : 'portrait'} style={styles.page}>
                
                {/* --- EN-TÊTE DU DOCUMENT --- */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Relevé de Présences</Text>
                        <Text style={styles.subTitle}>{groupName}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={[styles.metaText, { fontWeight: 'bold' }]}>Période du</Text>
                        <Text style={styles.metaText}>{dateRangeLabel}</Text>
                        <Text style={[styles.metaText, { marginTop: 4 }]}>Généré le {new Date().toLocaleDateString('fr-FR')}</Text>
                    </View>
                </View>

                {/* --- TABLEAU DES DONNÉES --- */}
                <View style={styles.tableContainer}>
                    {/* Ligne d'en-tête (Dates) */}
                    <View style={styles.headerRow}>
                        <View style={[styles.row, { borderBottomWidth: 0, minHeight: rowHeight }]}>
                            <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                                <Text style={[styles.headerText, { fontSize: headerFontSize }]}>Élève</Text>
                            </View>

                            {dates.map((date, i) => (
                                <View key={i} style={{ width: dateColWidth * 2, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <Text style={[styles.headerText, { fontSize: headerFontSize }]}>
                                        {dates.length === 1 ? parseDate(date).getDate() : `${getWeekDay(date)} ${parseDate(date).getDate()}`}
                                    </Text>
                                </View>
                            ))}

                            <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', height: '100%', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                                <Text style={[styles.headerText, { fontSize: headerFontSize }]}>Prés.</Text>
                            </View>
                            <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Text style={[styles.headerText, { fontSize: headerFontSize }]}>Abs.</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                        </View>
                    </View>

                    {/* Lignes Élèves (une par enfant) */}
                    {sortedStudents.map((student, idx) => {
                        // On trace un trait plus épais si on change de niveau scolaire (ex: on finit les MS, on commence les GS)
                        const isNewLevel = idx > 0 && (student.Niveau?.ordre !== sortedStudents[idx - 1].Niveau?.ordre);
                        const studentTotal = calculateStudentTotal(student.id);
                        const studentAbsent = calculateStudentAbsent(student.id);

                        return (
                            <View
                                key={student.id}
                                style={[
                                    styles.row,
                                    { backgroundColor: idx % 2 === 1 ? '#F9F9F9' : '#FFFFFF', minHeight: rowHeight },
                                    isNewLevel ? { borderTopWidth: 2, borderTopColor: '#000000' } : {}
                                ]}
                            >
                                <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                                    <Text style={[styles.nameText, { fontSize }]}>{student.prenom} {student.nom ? student.nom.charAt(0).toUpperCase() + '.' : ''}</Text>
                                </View>

                                {dates.map((date) => (
                                    <React.Fragment key={date}>
                                        {['matin', 'apres_midi'].map((period, pIdx) => {
                                            const symbol = getStatusSymbol(student.id, date, period);
                                            const noSchool = isNoSchoolDay(date, period);
                                            const emptyDay = isEmptyDay(date, period);

                                            // On grise ou jaunit les cases sans données
                                            let bgColor = 'transparent';
                                            if (noSchool) bgColor = '#FFF9C4'; // Jaune pour "Tout le monde absent"
                                            else if (emptyDay) bgColor = 'rgba(255, 165, 0, 0.2)'; // Orange clair pour "Pas de saisie"

                                            return (
                                                <View
                                                    key={period}
                                                    style={[
                                                        styles.dateCol,
                                                        { width: dateColWidth, backgroundColor: bgColor },
                                                        pIdx === 1 ? { borderRightWidth: 0 } : {}
                                                    ]}
                                                >
                                                    <Text style={[styles.cellText, { fontSize }]}>
                                                        {(noSchool || emptyDay) ? '' : (symbol !== '-' ? symbol : '')}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}

                                {/* Totaux par ligne (à droite) */}
                                <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                                    <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{studentTotal}</Text>
                                </View>
                                <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{studentAbsent}</Text>
                                </View>
                                <View style={{ flex: 1 }} />
                            </View>
                        );
                    })}

                    {/* --- LIGNES DE RÉSUMÉ (BAS DU TABLEAU) --- */}
                    {/* Ligne des totaux Présents par jour */}
                    <View style={[styles.row, { backgroundColor: '#E8E8E8', minHeight: rowHeight, borderTopWidth: 2, borderTopColor: '#000000' }]}>
                        <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                            <Text style={[styles.nameText, { fontSize, fontWeight: 'bold' }]}>Prés.</Text>
                        </View>

                        {dates.map((date) => (
                            <React.Fragment key={date}>
                                {['matin', 'apres_midi'].map((period, pIdx) => {
                                    const dayTotal = calculateDayTotal(date, period);
                                    return (
                                        <View key={period} style={[styles.dateCol, { width: dateColWidth }, pIdx === 1 ? { borderRightWidth: 0 } : {}]}>
                                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{dayTotal !== null ? dayTotal : ''}</Text>
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{grandTotal}</Text>
                        </View>
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>-</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>

                    {/* Ligne des totaux Absents par jour */}
                    <View style={[styles.row, { backgroundColor: '#E8E8E8', minHeight: rowHeight }]}>
                        <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                            <Text style={[styles.nameText, { fontSize, fontWeight: 'bold' }]}>Abs.</Text>
                        </View>

                        {dates.map((date) => (
                            <React.Fragment key={date}>
                                {['matin', 'apres_midi'].map((period, pIdx) => {
                                    const dayAbsent = calculateDayAbsent(date, period);
                                    return (
                                        <View key={period} style={[styles.dateCol, { width: dateColWidth }, pIdx === 1 ? { borderRightWidth: 0 } : {}]}>
                                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{dayAbsent !== null ? dayAbsent : ''}</Text>
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>-</Text>
                        </View>
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{grandTotalAbsent}</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                    </View>

                    {/* --- TRACEURS VISUELS (Lignes rouges pour les week-ends) --- */}
                    <View style={{ position: 'absolute', left: adjustedNameColWidth, top: 0, bottom: 0, width: 1, backgroundColor: '#000000' }} />

                    {dates.map((date, i) => {
                        const currentDate = parseDate(date);
                        const dayOfWeek = currentDate.getDay();
                        const isFriday = dayOfWeek === 5; // On met une ligne rouge après chaque vendredi pour séparer les semaines

                        return (
                            <View
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: adjustedNameColWidth + ((i + 1) * dateColWidth * 2),
                                    top: 0,
                                    bottom: 0,
                                    width: 1,
                                    backgroundColor: isFriday ? '#FF0000' : '#000000'
                                }}
                            />
                        );
                    })}
                </View>
            </Page>
        </Document>
    );
};

export default React.memo(AttendancePDF);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. DONNÉES : Le composant reçoit la liste des élèves, les dates et l'ensemble des présences.
 * 2. NETTOYAGE : Il élimine les samedis et dimanches pour ne garder que la semaine scolaire.
 * 3. ANALYSE : Pour chaque case (Élève + Date + Période), il cherche le statut :
 *    - S'il trouve 'Absent' -> il met 'O'.
 *    - S'il trouve un autre statut -> il met 'I'.
 *    - S'il ne trouve rien -> il laisse un tiret.
 * 4. MISE EN PAGE :
 *    - Il calcule la largeur des colonnes selon le nombre de jours.
 *    - Il trace des lignes de séparation (Noires pour les jours, Rouges pour les week-ends).
 * 5. CALCULS FINAUX : Il additionne les présences et absences en bout de ligne et en bas de colonne.
 * 6. GÉNÉRATION : Il produit l'objet binaire PDF que l'enseignant pourra ouvrir ou imprimer.
 */
