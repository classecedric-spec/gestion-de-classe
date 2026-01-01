import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1a1a1a',
    },
    header: {
        marginBottom: 20,
        textAlign: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    moduleParams: {
        marginBottom: 8,
        padding: 5,
        backgroundColor: '#f0f0f0', // Default fallback
        borderRadius: 2,
    },
    moduleTitle: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Late styles
    moduleLate: {
        backgroundColor: '#D4AF37', // Doré
    },
    textLate: {
        color: '#00008B', // Bleu Foncé
    },
    // Upcoming styles
    moduleUpcoming: {
        backgroundColor: '#00008B', // Bleu Foncé
    },
    textUpcoming: {
        color: '#D4AF37', // Doré
    },

    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#ccc',
    },
    checklistContainer: {
        flexDirection: 'row',
        marginRight: 8,
    },
    smallCheckbox: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: '#000',
        marginRight: 2,
    },
    activityInfo: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    activityName: {
        marginRight: 4,
    },
    activityMeta: {
        fontSize: 8,
        color: '#555',
        marginRight: 4,
    },
    manualInput: {
        width: 100,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginHorizontal: 10,
    },
    weekGrid: {
        flexDirection: 'row',
        marginLeft: 'auto',
    },
    weekDay: {
        width: 12,
        height: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 1,
    },
    weekDayText: {
        fontSize: 6,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
    },
    footerLegend: {
        flexDirection: 'row',
        gap: 10,
        fontSize: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendBoxGreen: {
        width: 8,
        height: 8,
        backgroundColor: '#4CAF50',
    },
    legendBoxGold: {
        width: 8,
        height: 8,
        backgroundColor: '#D4AF37',
    },
    // New styles for Week Header
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 2,
        marginTop: 2,
    },
    spacer: {
        flex: 1,
    },
    weekHeaderCell: {
        width: 12,
        marginLeft: 1,
        textAlign: 'center',
    },
    weekHeaderText: {
        fontSize: 6,
        color: '#666',
        textAlign: 'center',
    },
    // Zebra Stripe Style
    rowGray: {
        backgroundColor: '#E0E0E0',
    },
});

const StudentTrackingPDF = ({ data }) => {
    const { studentName, modules, printDate } = data;
    const today = new Date();

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Plan de travail de {studentName}</Text>
                </View>

                {/* Modules List */}
                {modules.map((module, index) => {
                    const isLate = module.dueDate ? new Date(module.dueDate) < today : false;
                    const headerStyle = [
                        styles.moduleParams,
                        isLate ? styles.moduleLate : styles.moduleUpcoming
                    ];
                    const textStyle = [
                        styles.moduleTitle,
                        isLate ? styles.textLate : styles.textUpcoming
                    ];

                    // Safely handle date formatting
                    const formattedDate = module.dueDate
                        ? new Date(module.dueDate).toLocaleDateString('fr-FR')
                        : 'Date inconnue';

                    return (
                        <View key={index} wrap={false} style={{ marginBottom: 15 }}>
                            <View style={headerStyle}>
                                <Text style={textStyle}>
                                    {module.title} ({formattedDate})
                                </Text>
                            </View>

                            {/* Week Header Row REMOVED as per request */}

                            {/* Activities */}
                            {module.activities.map((activity, actIndex) => (
                                <View
                                    key={actIndex}
                                    style={[
                                        styles.activityRow,
                                        actIndex % 2 !== 0 ? styles.rowGray : null
                                    ]}
                                >
                                    {/* 4 Checkboxes */}
                                    <View style={styles.checklistContainer}>
                                        {[1, 2, 3, 4].map(i => (
                                            <View key={i} style={styles.smallCheckbox} />
                                        ))}
                                    </View>

                                    {/* Activity Info */}
                                    <View style={styles.activityInfo}>
                                        <Text style={styles.activityName}>{activity.name}</Text>
                                        {activity.material && (
                                            <Text style={styles.activityMeta}>[{activity.material}]</Text>
                                        )}
                                        {activity.level && (
                                            <Text style={styles.activityMeta}>({activity.level})</Text>
                                        )}
                                    </View>

                                    {/* Manual Inputs Placeholder - if needed in PDF, they are usually just spaces */}
                                    {/* Assuming user wants visual space for handwriting */}

                                    {/* Week Grid (With Letters inside) */}
                                    <View style={styles.weekGrid}>
                                        {['L', 'M', 'M', 'J', 'V'].map((day, dIndex) => (
                                            <View key={dIndex} style={styles.weekDay}>
                                                <Text style={styles.weekDayText}>{day}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View>
                        <Text>{studentName}</Text>
                    </View>

                    <View style={styles.footerLegend}>
                        <View style={styles.legendItem}>
                            <View style={styles.legendBoxGreen} />
                            <Text>Je le programme en classe</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={styles.legendBoxGold} />
                            <Text>Je vais le faire à la maison</Text>
                        </View>
                    </View>

                    <View>
                        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
                        <Text>{printDate}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default StudentTrackingPDF;
