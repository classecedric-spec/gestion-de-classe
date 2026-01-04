import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Status colors matching the app
const STATUS_COLORS = {
    termine: '#22c55e', // success green
    besoin_d_aide: '#A0A8AD', // grey
    en_cours: '#D9B981', // primary yellow
    a_domicile: '#ef4444', // red/danger
};

const STATUS_LABELS = {
    termine: 'Terminé',
    besoin_d_aide: 'Besoin d\'aide',
    en_cours: 'En cours',
    a_domicile: 'À domicile',
};

const styles = StyleSheet.create({
    page: {
        padding: 20,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 15,
        borderBottom: '2px solid #D9B981',
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        color: '#666666',
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 20,
    },
    tableRow: {
        display: 'flex',
        flexDirection: 'row',
        borderBottom: '1px solid #e5e5e5',
    },
    tableHeaderRow: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #cccccc',
    },
    tableCell: {
        padding: 4,
        fontSize: 7,
        textAlign: 'center',
        borderRight: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    studentCell: {
        width: 100,
        padding: 6,
        fontSize: 8,
        textAlign: 'left',
        fontWeight: 'bold',
        borderRight: '1px solid #cccccc',
        backgroundColor: '#fafafa',
    },
    headerCell: {
        padding: 4,
        fontSize: 6,
        textAlign: 'center',
        fontWeight: 'bold',
        borderRight: '1px solid #cccccc',
        backgroundColor: '#f0f0f0',
    },
    activityHeader: {
        width: 50,
        minHeight: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityNumber: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#D9B981',
        marginBottom: 2,
    },
    activityTitle: {
        fontSize: 5,
        color: '#666666',
        textAlign: 'center',
    },
    statusCell: {
        width: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legend: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        borderTop: '1px solid #e5e5e5',
        paddingTop: 10,
    },
    legendItem: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 8,
        color: '#666666',
    },
    footer: {
        position: 'absolute',
        bottom: 8,
        left: 20,
        right: 20,
        fontSize: 7,
        color: '#999999',
        textAlign: 'center',
    },
    emptyDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        border: '1px solid #cccccc',
        backgroundColor: '#fafafa',
    }
});

const AvancementPDF = ({ students, activities, progressions, groupName, moduleName, branchName, date, dateOperator }) => {
    const printDate = new Date().toLocaleDateString('fr-FR');

    const getDateLabel = () => {
        if (!date) return '';
        const d = new Date(date).toLocaleDateString('fr-FR');
        switch (dateOperator) {
            case 'lt': return ` avant le ${d}`;
            case 'lte': return ` au ou avant le ${d}`;
            case 'gt': return ` après le ${d}`;
            case 'eq': return ` le ${d}`;
            default: return ` le ${d}`;
        }
    };

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Avancement des Ateliers</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        <Text style={styles.subtitle}>Groupe: {groupName || 'Tous'}</Text>
                        {branchName && <Text style={styles.subtitle}>| Branche: {branchName}</Text>}
                        {moduleName && <Text style={styles.subtitle}>| Module: {moduleName}</Text>}
                        {date && <Text style={styles.subtitle}>| Date: {getDateLabel()}</Text>}
                        <Text style={styles.subtitle}>| Généré le {printDate}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                        <View style={[styles.headerCell, styles.studentCell]}>
                            <Text>Élève</Text>
                        </View>
                        {activities.map((act, idx) => (
                            <View key={act.id} style={[styles.headerCell, styles.activityHeader]}>
                                <Text style={styles.activityNumber}>{idx + 1}</Text>
                                <Text style={styles.activityTitle} numberOfLines={2}>
                                    {act.titre}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Student Rows */}
                    {students.map((student) => (
                        <View key={student.id} style={styles.tableRow}>
                            <View style={styles.studentCell}>
                                <Text>{student.prenom} {student.nom}</Text>
                            </View>
                            {activities.map((act) => {
                                const status = progressions[`${student.id}-${act.id}`];
                                const color = STATUS_COLORS[status] || null;

                                return (
                                    <View key={act.id} style={[styles.tableCell, styles.statusCell]}>
                                        {color && (
                                            <View style={[styles.statusDot, { backgroundColor: color }]} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <View key={key} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[key] }]} />
                            <Text style={styles.legendText}>{label}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Gestion de Classe - {printDate}
                </Text>
            </Page>
        </Document>
    );
};

export default AvancementPDF;
