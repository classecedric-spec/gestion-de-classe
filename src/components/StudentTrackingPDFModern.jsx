import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Modern Styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
        backgroundColor: '#FFFFFF', // White background
    },
    headerWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#333',
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'extrabold',
        color: '#1a1a1a',
        textTransform: 'uppercase',
    },
    subTitle: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },

    // Module Card
    moduleContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 0,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    moduleHeader: {
        padding: 8,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    moduleTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
    },
    moduleDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
    },

    // Status Colors
    headerLate: { backgroundColor: '#D4AF37' }, // Gold
    headerUpcoming: { backgroundColor: '#00008B' }, // Navy Blue

    // Activity List
    activityList: {
        paddingVertical: 2,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    rowEven: {
        backgroundColor: '#F8F9FA', // Very subtle gray
    },

    // Checkboxes (Circles for modern look?) User wanted 4 squares. I'll keep squares but styled.
    checklistContainer: {
        flexDirection: 'row',
        marginRight: 12,
        gap: 3,
    },
    checkbox: {
        width: 10,
        height: 10,
        borderRadius: 2, // Slight rounded
        borderWidth: 1.5,
        borderColor: '#DDD',
    },

    // Info
    activityInfo: {
        flex: 1,
    },
    activityName: {
        fontSize: 10,
        fontWeight: 'medium',
        color: '#333',
    },
    activityMeta: {
        fontSize: 8,
        color: '#888',
        marginTop: 2,
    },

    // Week Grid
    weekGrid: {
        flexDirection: 'row',
        marginLeft: 8,
        gap: 2,
    },
    weekBox: {
        width: 14,
        height: 14,
        borderRadius: 3,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    weekText: {
        fontSize: 7,
        color: '#666',
        fontWeight: 'bold',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 15,
    },
    footerText: {
        fontSize: 8,
        color: '#999',
    },
    legend: {
        flexDirection: 'row',
        gap: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});

const StudentTrackingPDFModern = ({ data }) => {
    const { studentName, modules, printDate } = data;
    const today = new Date();

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Modern Header */}
                <View style={styles.headerWrapper}>
                    <View>
                        <Text style={styles.title}>{studentName}</Text>
                        <Text style={styles.subTitle}>Plan de Travail • {printDate}</Text>
                    </View>
                    {/* Could add a logo placeholder here */}
                </View>

                {/* Modules */}
                {modules.map((module, index) => {
                    const isLate = module.dueDate ? new Date(module.dueDate) < today : false;
                    const headerStyle = [
                        styles.moduleHeader,
                        isLate ? styles.headerLate : styles.headerUpcoming
                    ];

                    const formattedDate = module.dueDate
                        ? new Date(module.dueDate).toLocaleDateString('fr-FR')
                        : 'Date inconnue';

                    return (
                        <View key={index} wrap={false} style={styles.moduleContainer}>
                            {/* Card Header */}
                            <View style={headerStyle}>
                                <Text style={styles.moduleTitle}>{module.title}</Text>
                                <Text style={styles.moduleDate}>{formattedDate}</Text>
                            </View>

                            {/* Activities */}
                            <View style={styles.activityList}>
                                {module.activities.map((activity, actIndex) => (
                                    <View
                                        key={actIndex}
                                        style={[
                                            styles.activityRow,
                                            actIndex % 2 !== 0 ? styles.rowEven : {}
                                        ]}
                                    >
                                        {/* Checkboxes */}
                                        <View style={styles.checklistContainer}>
                                            {[1, 2, 3, 4].map(i => (
                                                <View key={i} style={styles.checkbox} />
                                            ))}
                                        </View>

                                        {/* Info */}
                                        <View style={styles.activityInfo}>
                                            <Text style={styles.activityName}>{activity.name}</Text>
                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                {activity.material && <Text style={styles.activityMeta}>[{activity.material}]</Text>}
                                                {activity.level && <Text style={styles.activityMeta}>({activity.level})</Text>}
                                            </View>
                                        </View>

                                        {/* Week Grid (Styled) */}
                                        <View style={styles.weekGrid}>
                                            {['L', 'M', 'M', 'J', 'V'].map((day, d) => (
                                                <View key={d} style={styles.weekBox}>
                                                    <Text style={styles.weekText}>{day}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Généré le {printDate}</Text>

                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={styles.footerText}>En classe</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#D4AF37' }]} />
                            <Text style={styles.footerText}>À la maison</Text>
                        </View>
                    </View>

                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
};

export default StudentTrackingPDFModern;
