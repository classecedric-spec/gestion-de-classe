import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Black & White, Compact Styles
const styles = StyleSheet.create({
    page: {
        padding: 30, // Reduced padding for more space
        fontFamily: 'Helvetica',
        fontSize: 8, // Smaller base font
        color: '#000000',
        backgroundColor: '#FFFFFF'
    },
    // Header Section
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

    // Table
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
        minHeight: 18, // More compact rows
        alignItems: 'center'
    },
    headerRow: {
        backgroundColor: '#F0F0F0', // Light grey for header background
        borderBottomWidth: 1,
        borderBottomColor: '#000000'
    },
    // Columns
    nameCol: {
        width: 130, // Fixed width to keep content left-aligned
        paddingLeft: 4,
        paddingRight: 4,
        justifyContent: 'center',
        // Border replaced by absolute line for continuity
    },
    dateCol: {
        width: 15, // Narrower width (was 25)
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#AAAAAA', // Grey separator between periods
        height: '100%'
    },
    lastDateCol: {
        borderRightWidth: 0
    },

    // Text Styles
    headerText: {
        fontWeight: 'bold',
        fontSize: 7, // Compact header text
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

    // Visual Indicators
    weekendSep: {
        borderRightWidth: 2, // Thicker border for weeks
        borderRightColor: '#000000'
    },

    // Footer / Legend
    footer: {
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#000000'
    },
    legendContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10
    },
    legendLabel: {
        fontSize: 8,
        color: '#000000'
    }
});

const AttendancePDF = ({
    groupName = 'Groupe',
    dates: initialDates = [],
    students = [],
    attendances = [],
    categories = []
}) => {

    // --- Helper Logic ---
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    };

    // Filter weekends
    const dates = initialDates.filter(dateStr => {
        const d = parseDate(dateStr);
        const day = d.getDay();
        return day !== 0 && day !== 6;
    });

    // Format helpers
    const getWeekDay = (d) => {
        const date = parseDate(d);
        const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        return days[date.getDay()];
    };

    // Data Resolution
    const getStatusSymbol = (studentId, date, period = null) => {
        const record = attendances.find(a => {
            // Loose equality for IDs to handle potential string/number mismatch
            const sameStudent = a.eleve_id == studentId;
            const sameDate = a.date === date;

            if (!sameStudent || !sameDate) return false;
            if (!period) return true;

            // Normalize period comparison: lowercase, remove accents, unify separators
            const normalize = (str) => (str || '')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[- ]/g, '_'); // Replace dash and space with underscore

            return normalize(a.periode) === normalize(period);
        });

        if (!record) return '-';

        // Handle specific absent status (old logic for compatibility)
        if (record.status === 'absent' && !record.categorie_id) {
            return 'O';
        }

        // Handle categorized presence using embedded category info from JOIN
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

    // Sort Students
    const sortedStudents = [...students].sort((a, b) => {
        const niveauA = a.Niveau?.ordre || 0;
        const niveauB = b.Niveau?.ordre || 0;
        if (niveauA !== niveauB) return niveauA - niveauB;
        return (a.nom || '').localeCompare(b.nom || '');
    });

    // Calculate Dynamic Name Column Width
    // Estimate width: approx 4.5pt per char (Helvetica 8) + 15pt padding (approx 0.5cm)
    // 1cm = 28.35pt, so 0.5cm ~ 14.17pt.
    const maxNameLength = Math.max(0, ...sortedStudents.map(s => {
        const nameStr = `${s.prenom} ${s.nom ? s.nom.charAt(0).toUpperCase() + '.' : ''}`;
        return nameStr.length;
    }));

    const nameColWidth = Math.max(80, (maxNameLength * 4.5) + 15);

    // Monthly export optimization
    const isMonthly = dates.length > 12;
    const adjustedNameColWidth = isMonthly ? 60 : nameColWidth;
    const dateColWidth = isMonthly ? 10 : 15;
    const totalColWidth = 60; // 30pt each for Présent and Absent
    const fontSize = isMonthly ? 7 : 8; // Increased from 6 to 7 for monthly
    const headerFontSize = isMonthly ? 6 : 7; // Increased from 5 to 6 for monthly
    const rowHeight = isMonthly ? 14 : 18;

    // Check if all students are absent for a given date/period (indicates no school day)
    const isNoSchoolDay = (date, period) => {
        // If there are no students, it's not a no-school day
        if (sortedStudents.length === 0) return false;

        // Check if ALL students have 'O' (absent) for this period
        const allAbsent = sortedStudents.every(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            return symbol === 'O';
        });

        return allAbsent;
    };

    // Calculate totals for each student (count of 'I')
    const calculateStudentTotal = (studentId) => {
        let count = 0;
        dates.forEach(date => {
            ['matin', 'apres_midi'].forEach(period => {
                // Skip no-school days (all students absent)
                if (isNoSchoolDay(date, period)) return;

                const symbol = getStatusSymbol(studentId, date, period);
                if (symbol === 'I') count++;
            });
        });
        return count;
    };

    // Calculate absent for each student (count of 'O')
    const calculateStudentAbsent = (studentId) => {
        let count = 0;
        dates.forEach(date => {
            ['matin', 'apres_midi'].forEach(period => {
                // Skip no-school days (all students absent)
                if (isNoSchoolDay(date, period)) return;

                const symbol = getStatusSymbol(studentId, date, period);
                if (symbol === 'O') count++;
            });
        });
        return count;
    };

    // Calculate totals for each day/period (count of 'I')
    const calculateDayTotal = (date, period) => {
        // Don't count no-school days
        if (isNoSchoolDay(date, period)) return null;

        let count = 0;
        sortedStudents.forEach(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            if (symbol === 'I') count++;
        });
        return count;
    };

    // Calculate absent for each day/period (count of 'O')
    const calculateDayAbsent = (date, period) => {
        // Don't count no-school days
        if (isNoSchoolDay(date, period)) return null;

        let count = 0;
        sortedStudents.forEach(student => {
            const symbol = getStatusSymbol(student.id, date, period);
            if (symbol === 'O') count++;
        });
        return count;
    };

    // Calculate grand total
    const grandTotal = sortedStudents.reduce((total, student) => {
        return total + calculateStudentTotal(student.id);
    }, 0);

    // Calculate grand total absent
    const grandTotalAbsent = sortedStudents.reduce((total, student) => {
        return total + calculateStudentAbsent(student.id);
    }, 0);

    return (
        <Document>
            <Page size="A4" orientation={dates.length > 12 ? 'landscape' : 'portrait'} style={styles.page}>

                {/* Header */}
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

                {/* Main Table */}
                <View style={styles.tableContainer}>
                    {/* Header Row */}
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

                            {/* Présent and Absent Column Headers */}
                            <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', height: '100%', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                                <Text style={[styles.headerText, { fontSize: headerFontSize }]}>Prés.</Text>
                            </View>
                            <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Text style={[styles.headerText, { fontSize: headerFontSize }]}>Abs.</Text>
                            </View>

                            {/* Spacer */}
                            <View style={{ flex: 1 }} />
                        </View>
                    </View>

                    {/* Student Rows - Sorted by Niveau then Name */}

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
                                    isNewLevel && { borderTopWidth: 2, borderTopColor: '#000000' }
                                ]}
                            >
                                <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                                    <Text style={[styles.nameText, { fontSize }]}>{student.prenom} {student.nom ? student.nom.charAt(0).toUpperCase() + '.' : ''}</Text>
                                </View>

                                {/* Date Columns: Unified Day/Week Rendering */}
                                {dates.map((date) => (
                                    <React.Fragment key={date}>
                                        {['matin', 'apres_midi'].map((period, pIdx) => {
                                            const symbol = getStatusSymbol(student.id, date, period);
                                            const noSchool = isNoSchoolDay(date, period);

                                            // Remove border right for PM column as it will be covered by Day Separator Line (Absolute)
                                            return (
                                                <View
                                                    key={period}
                                                    style={[
                                                        styles.dateCol,
                                                        { width: dateColWidth, backgroundColor: noSchool ? 'rgba(255, 165, 0, 0.2)' : 'transparent' },
                                                        pIdx === 1 && { borderRightWidth: 0 }
                                                    ]}
                                                >
                                                    <Text style={[styles.cellText, { fontSize, color: symbol === 'O' ? '#000000' : '#000000' }]}>
                                                        {noSchool ? '' : (symbol !== '-' ? symbol : '')}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}

                                {/* Présent and Absent Columns */}
                                <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                                    <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{studentTotal}</Text>
                                </View>
                                <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{studentAbsent}</Text>
                                </View>

                                {/* Spacer */}
                                <View style={{ flex: 1 }} />
                            </View>
                        );
                    })}

                    {/* Totals Row */}
                    <View style={[styles.row, { backgroundColor: '#E8E8E8', minHeight: rowHeight, borderTopWidth: 2, borderTopColor: '#000000' }]}>
                        <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                            <Text style={[styles.nameText, { fontSize, fontWeight: 'bold' }]}>Prés.</Text>
                        </View>

                        {dates.map((date) => (
                            <React.Fragment key={date}>
                                {['matin', 'apres_midi'].map((period, pIdx) => {
                                    const dayTotal = calculateDayTotal(date, period);
                                    const dayAbsent = calculateDayAbsent(date, period);

                                    return (
                                        <View key={period} style={[styles.dateCol, { width: dateColWidth }, pIdx === 1 && { borderRightWidth: 0 }]}>
                                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{dayTotal !== null ? dayTotal : ''}</Text>
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Grand Totals - Présent */}
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{grandTotal}</Text>
                        </View>
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>-</Text>
                        </View>

                        <View style={{ flex: 1 }} />
                    </View>

                    {/* Totals Row - Absents */}
                    <View style={[styles.row, { backgroundColor: '#E8E8E8', minHeight: rowHeight }]}>
                        <View style={[styles.nameCol, { width: adjustedNameColWidth }]}>
                            <Text style={[styles.nameText, { fontSize, fontWeight: 'bold' }]}>Abs.</Text>
                        </View>

                        {dates.map((date) => (
                            <React.Fragment key={date}>
                                {['matin', 'apres_midi'].map((period, pIdx) => {
                                    const dayAbsent = calculateDayAbsent(date, period);

                                    return (
                                        <View key={period} style={[styles.dateCol, { width: dateColWidth }, pIdx === 1 && { borderRightWidth: 0 }]}>
                                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{dayAbsent !== null ? dayAbsent : ''}</Text>
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        {/* Grand Totals - Absent */}
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000000' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>-</Text>
                        </View>
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={[styles.cellText, { fontSize, fontWeight: 'bold' }]}>{grandTotalAbsent}</Text>
                        </View>

                        <View style={{ flex: 1 }} />
                    </View>

                    {/* Vertical Lines */}
                    {/* Name Separator */}
                    <View style={{ position: 'absolute', left: adjustedNameColWidth, top: 0, bottom: 0, width: 1, backgroundColor: '#000000' }} />

                    {/* Day Separators (Continuous Lines between days) */}
                    {dates.map((date, i) => {
                        // Check if this day is Friday (5) to make the line after it red
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

                    {/* Total Column Separator */}
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
