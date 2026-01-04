import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica'
    },
    header: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937'
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280'
    },
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#E5E7EB'
    },
    tableRow: {
        flexDirection: 'row'
    },
    tableColHeader: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
        backgroundColor: '#F3F4F6',
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center'
    },
    tableColName: {
        width: '30%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        padding: 5,
        justifyContent: 'center'
    },
    tableColCell: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center'
    },
    textHeader: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000000',
        textAlign: 'center'
    },
    textName: {
        fontSize: 10,
        color: '#000000',
        fontWeight: 'bold'
    },
    textCell: {
        fontSize: 8,
        color: '#000000',
        textAlign: 'center'
    },
    legend: {
        marginTop: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 2
    },
    legendText: {
        fontSize: 8,
        color: '#000000'
    }
});

const PresencePDF = ({
    groupName = 'Groupe',
    dates: initialDates = [], // Array of date strings YYYY-MM-DD
    students = [],
    attendances = [],
    categories = []
}) => {
    // Helper to parse "YYYY-MM-DD" safely as local date (noon to avoid shifts)
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
    };

    // Filter out weekends (Saturday = 6, Sunday = 0)
    const dates = initialDates.filter(dateStr => {
        const d = parseDate(dateStr);
        const day = d.getDay();
        return day !== 0 && day !== 6;
    });

    // Column width calculation in points (pixels)
    const contentWidth = 535; // A4 (595) - 2 * padding (30)
    const nameColWidth = 100;
    const dateColWidth = 18;

    // Helper to resolve category
    const getCategory = (id) => categories.find(c => c.id === id) || { nom: '?', couleur: '#ccc', short: '?' };

    // Format Title Date Range
    const dateRangeTitle = dates.length === 0
        ? 'Aucune date'
        : (dates.length === 1
            ? parseDate(dates[0]).toLocaleDateString('fr-FR')
            : `${parseDate(dates[0]).toLocaleDateString('fr-FR')} - ${parseDate(dates[dates.length - 1]).toLocaleDateString('fr-FR')}`);

    // Pre-calculate dates that have at least one record
    const activeDates = new Set(attendances.map(a => a.date));

    return (
        <Document>
            <Page size="A4" orientation={dates.length > 24 ? 'landscape' : 'portrait'} style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Rapport de Présence</Text>
                        <Text style={styles.subtitle}>{groupName}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Période: {dateRangeTitle}</Text>
                </View>

                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={styles.tableRow}>
                        <View style={[styles.tableColName, { width: 100 }]}>
                            <Text style={styles.textHeader}>Élève</Text>
                        </View>
                        {dates.map((date, i) => {
                            const isFriday = parseDate(date).getDay() === 5;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.tableColHeader,
                                        { width: dateColWidth },
                                        isFriday && { borderRightWidth: 2, borderRightColor: '#9CA3AF' }
                                    ]}
                                >
                                    <Text style={styles.textHeader}>
                                        {parseDate(date).getDate()}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Data Rows */}
                    {students.map((student, i) => (
                        <View key={i} style={styles.tableRow}>
                            <View style={[styles.tableColName, { width: 100 }]}>
                                <Text style={[styles.textName, { fontSize: 10 }]}>
                                    {student.prenom} {student.nom ? `${student.nom.charAt(0)}.` : ''}
                                </Text>
                            </View>
                            {dates.map((date, j) => {
                                const record = attendances.find(a => a.eleve_id === student.id && a.date === date);
                                const isFriday = parseDate(date).getDay() === 5;

                                let display = '-';
                                let textColor = '#000000';

                                if (record) {
                                    if (record.status === 'absent' && !record.categorie_id) {
                                        display = '0';
                                        textColor = '#000000';
                                    } else if (record.categorie_id) {
                                        const cat = getCategory(record.categorie_id);
                                        if (cat.nom.toLowerCase() === 'absent') {
                                            display = '0';
                                            textColor = '#000000';
                                        } else {
                                            display = 'I';
                                            textColor = '#000000';
                                        }
                                    }
                                }

                                return (
                                    <View
                                        key={j}
                                        style={[
                                            styles.tableColCell,
                                            { width: dateColWidth },
                                            isFriday && { borderRightWidth: 2, borderRightColor: '#9CA3AF' }
                                        ]}
                                    >
                                        <Text style={[styles.textCell, { color: textColor, fontWeight: 'bold', fontSize: 8 }]}>
                                            {display}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 5, width: '100%' }}>Légende:</Text>
                    <View style={styles.legendItem}>
                        <Text style={[styles.legendText, { color: '#000000', fontWeight: 'bold' }]}>I</Text>
                        <Text style={styles.legendText}>: Présent</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Text style={[styles.legendText, { color: '#000000', fontWeight: 'bold' }]}>0</Text>
                        <Text style={styles.legendText}>: Absent</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <Text style={[styles.legendText, { color: '#000000', fontWeight: 'bold' }]}>-</Text>
                        <Text style={styles.legendText}>: Non noté / Non encodé</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default PresencePDF;
