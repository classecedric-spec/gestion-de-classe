import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Student, Attendance, CategoriePresence } from '../services/attendanceService';

// Black & White, Compact Styles
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

const AttendancePDF: React.FC<AttendancePDFProps> = ({
    groupName = 'Groupe',
    dates: initialDates = [],
    students = [],
    attendances = [],
    // categories = [] // unused in original code except as prop
}) => {

    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    };

    const dates = initialDates.filter(dateStr => {
        const d = parseDate(dateStr);
        const day = d.getDay();
        return day !== 0 && day !== 6;
    });

    const getWeekDay = (d: string) => {
        const date = parseDate(d);
        const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        return days[date.getDay()];
    };

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

        if (!record) return '-';

        if (record.status === 'absent' && !record.categorie_id) {
            return 'O';
        }

        if (record.categorie_id && record.CategoriePresence) {
            const categoryName = record.CategoriePresence.nom || '';
            const isAbsent = categoryName.toLowerCase().includes('absent');
            return isAbsent ? 'O' : 'I';
        }

        return '?';
    };

    const dateRangeLabel = dates.length > 0
        ? `${parseDate(dates[0]).toLocaleDateString('fr-FR')} au ${parseDate(dates[dates.length - 1]).toLocaleDateString('fr-FR')}`
        : 'Aucune période';

    const sortedStudents = [...students].sort((a, b) => {
        const niveauA = a.Niveau?.ordre || 0;
        const niveauB = b.Niveau?.ordre || 0;
        if (niveauA !== niveauB) return niveauA - niveauB;
        return (a.nom || '').localeCompare(b.nom || '');
    });

    const maxNameLength = Math.max(0, ...sortedStudents.map(s => {
        const nameStr = `${s.prenom} ${s.nom ? s.nom.charAt(0).toUpperCase() + '.' : ''}`;
        return nameStr.length;
    }));

    const nameColWidth = Math.max(80, (maxNameLength * 4.5) + 15);

    const isMonthly = dates.length > 12;
    const adjustedNameColWidth = isMonthly ? 60 : nameColWidth;
    const dateColWidth = isMonthly ? 10 : 15;
    const totalColWidth = 60;
    const fontSize = isMonthly ? 7 : 8;
    const headerFontSize = isMonthly ? 6 : 7;
    const rowHeight = isMonthly ? 14 : 18;

    const isNoSchoolDay = (date: string, period: string) => {
        if (sortedStudents.length === 0) return false;

        const allAbsent = sortedStudents.every(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            return symbol === 'O';
        });

        return allAbsent;
    };

    const calculateStudentTotal = (studentId: string) => {
        let count = 0;
        dates.forEach(date => {
            ['matin', 'apres_midi'].forEach(period => {
                if (isNoSchoolDay(date, period)) return;
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
                if (isNoSchoolDay(date, period)) return;
                const symbol = getStatusSymbol(studentId, date, period);
                if (symbol === 'O') count++;
            });
        });
        return count;
    };

    const calculateDayTotal = (date: string, period: string) => {
        if (isNoSchoolDay(date, period)) return null;
        let count = 0;
        sortedStudents.forEach(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            if (symbol === 'I') count++;
        });
        return count;
    };

    const calculateDayAbsent = (date: string, period: string) => {
        if (isNoSchoolDay(date, period)) return null;
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
            <Page size="A4" orientation={dates.length > 12 ? 'landscape' : 'portrait'} style={styles.page}>
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

                <View style={styles.tableContainer}>
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

                    {sortedStudents.map((student, idx) => {
                        const isNewLevel = idx > 0 && (student.Niveau?.id !== sortedStudents[idx - 1].Niveau?.id);
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

                                            return (
                                                <View
                                                    key={period}
                                                    style={[
                                                        styles.dateCol,
                                                        { width: dateColWidth, backgroundColor: noSchool ? 'rgba(255, 165, 0, 0.2)' : 'transparent' },
                                                        pIdx === 1 ? { borderRightWidth: 0 } : {}
                                                    ]}
                                                >
                                                    <Text style={[styles.cellText, { fontSize }]}>
                                                        {noSchool ? '' : (symbol !== '-' ? symbol : '')}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}

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

                    <View style={{ position: 'absolute', left: adjustedNameColWidth, top: 0, bottom: 0, width: 1, backgroundColor: '#000000' }} />

                    {dates.map((date, i) => {
                        const currentDate = parseDate(date);
                        const dayOfWeek = currentDate.getDay();
                        const isFriday = dayOfWeek === 5;

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

                    <View style={{
                        position: 'absolute',
                        left: adjustedNameColWidth + (dates.length * dateColWidth * 2) + totalColWidth,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        backgroundColor: '#000000'
                    }} />
                </View>
            </Page>
        </Document>
    );
};

export default React.memo(AttendancePDF);
