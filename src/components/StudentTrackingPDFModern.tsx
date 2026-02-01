import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { PdfData } from '../lib/pdf';
import { PDF_THEME } from '../core/pdf/theme';
// Modern Styles - Condensed & Optimized
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: PDF_THEME.fonts.main,
        fontSize: PDF_THEME.sizes.text.base,
        color: '#333',
        backgroundColor: PDF_THEME.colors.background.white,
    },
    headerWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 4,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    title: {
        fontSize: PDF_THEME.sizes.text.xl,
        fontWeight: 'bold', // 'extrabold' not standard in Helvetica
        color: PDF_THEME.colors.text.main,
        textTransform: 'uppercase',
    },
    subTitle: {
        fontSize: PDF_THEME.sizes.text.base,
        fontWeight: 'bold',
        color: PDF_THEME.colors.text.secondary,
    },
    headerRight: {
        fontSize: PDF_THEME.sizes.text.base,
        color: PDF_THEME.colors.text.light,
        marginBottom: 2,
    },

    // Module Card
    moduleContainer: {
        backgroundColor: PDF_THEME.colors.background.white,
        borderRadius: 6,
        padding: 0,
        marginBottom: 5,
        borderWidth: 0.5,
        borderColor: PDF_THEME.colors.border,
    },
    moduleHeader: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    moduleTitle: {
        fontSize: PDF_THEME.sizes.text.lg,
        fontWeight: 'bold',
    },
    moduleDate: {
        fontSize: PDF_THEME.sizes.text.base,
    },

    // Status Colors
    headerLate: { backgroundColor: PDF_THEME.colors.accent },
    headerUpcoming: { backgroundColor: PDF_THEME.colors.status.info },

    // Activity List
    activityList: {
        paddingVertical: 2,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    rowEven: {
        backgroundColor: '#E0E0E0',
    },

    // Checkboxes 
    checklistContainer: {
        flexDirection: 'row',
        marginRight: 10,
    },
    checkbox: {
        width: 12,
        height: 12,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#555',
        marginRight: 4,
    },

    // Info
    activityInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8,
    },
    activityName: {
        fontSize: PDF_THEME.sizes.text.lg,
        fontWeight: 'normal',
        color: '#000',
    },
    activityMeta: {
        fontSize: PDF_THEME.sizes.text.base,
        color: PDF_THEME.colors.text.light,
        marginLeft: 6,
    },

    // Week Grid
    weekGrid: {
        flexDirection: 'row',
        marginLeft: 4,
    },
    weekBox: {
        width: 16,
        height: 16,
        borderRadius: 3,
        backgroundColor: PDF_THEME.colors.background.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000000',
        marginLeft: 2,
    },
    weekText: {
        fontSize: 8,
        color: PDF_THEME.colors.text.secondary,
        fontWeight: 'bold',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: PDF_THEME.colors.border,
        paddingTop: 8,
    },
    footerSectionLeft: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerSectionCenter: {
        width: '10%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerSectionRight: {
        width: '45%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    legendText: {
        fontSize: 7,
        color: '#555',
    },
    footerPageText: {
        fontSize: 8,
        color: PDF_THEME.colors.text.secondary,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginRight: 3,
    },
    legendBox: {
        width: 6,
        height: 6,
        borderWidth: 0.5,
        borderColor: '#555',
        borderRadius: 1,
        marginRight: 2,
    },
    legendGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    }
});

interface StudentTrackingPDFModernProps {
    data?: PdfData;
    bulkData?: PdfData[];
}

const StudentTrackingPDFModern: React.FC<StudentTrackingPDFModernProps> = ({ data, bulkData }) => {
    const items = bulkData || (data ? [data] : []);
    const today = new Date();

    return (
        <Document>
            {items.map((item, pageIndex) => {
                // Return null if item is invalid/undefined to prevent crash
                if (!item) return null;

                const { studentName, modules, printDate } = item;

                return (
                    <Page key={pageIndex} size="A4" style={styles.page}>

                        {/* Modern Header */}
                        <View style={styles.headerWrapper} fixed>
                            <View style={styles.headerLeft}>
                                <Text style={styles.title}>{studentName}</Text>
                                <Text style={styles.subTitle}>Ma liste de travail</Text>
                            </View>
                            <Text style={styles.headerRight}>Édition du {printDate}</Text>
                        </View>

                        {/* Modules */}
                        {modules && modules.map((module, index) => {
                            const isLate = module.dueDate ? new Date(module.dueDate) < today : false;
                            const headerStyle = [
                                styles.moduleHeader,
                                isLate ? styles.headerLate : styles.headerUpcoming
                            ];

                            const textColor = isLate ? '#00131E' : '#F2F2F2';
                            const dateColor = isLate ? '#00131E' : '#F2F2F2';

                            const formattedDate = module.dueDate
                                ? new Date(module.dueDate).toLocaleDateString('fr-FR')
                                : 'Date inconnue';

                            return (
                                <View key={index} wrap={false} style={styles.moduleContainer}>
                                    {/* Card Header */}
                                    <View style={headerStyle}>
                                        <Text style={[styles.moduleTitle, { color: textColor }]}>{module.title}</Text>
                                        <Text style={[styles.moduleDate, { color: dateColor }]}>{formattedDate}</Text>
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
                                                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                                        <Text style={styles.activityName}>{activity.name}</Text>
                                                        {activity.material && <Text style={styles.activityMeta}>[{activity.material}]</Text>}
                                                        {activity.level && <Text style={styles.activityMeta}>({activity.level})</Text>}
                                                    </View>
                                                </View>

                                                {/* Week Grid */}
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
                            {/* Left: Checkbox Legend */}
                            <View style={styles.footerSectionLeft}>
                                <View style={styles.legendGroup}>
                                    <View style={styles.legendBox} />
                                    <Text style={styles.legendText}>Démarré</Text>
                                </View>
                                <View style={styles.legendGroup}>
                                    <View style={styles.legendBox} />
                                    <Text style={styles.legendText}>Fini</Text>
                                </View>
                                <View style={styles.legendGroup}>
                                    <View style={styles.legendBox} />
                                    <Text style={styles.legendText}>Corrigé</Text>
                                </View>
                                <View style={styles.legendGroup}>
                                    <View style={styles.legendBox} />
                                    <Text style={styles.legendText}>Validé et encodé</Text>
                                </View>
                            </View>

                            {/* Center: Page Number */}
                            <View style={styles.footerSectionCenter}>
                                <Text
                                    style={styles.footerPageText}
                                    render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
                                />
                            </View>

                            {/* Right: Color Legend */}
                            <View style={styles.footerSectionRight}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                                    <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                                    <Text style={styles.legendText}>En classe</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.dot, { backgroundColor: '#FF6600' }]} />
                                    <Text style={styles.legendText}>À la maison</Text>
                                </View>
                            </View>
                        </View>
                    </Page>
                );
            })}
        </Document>
    );
};

export default StudentTrackingPDFModern;
