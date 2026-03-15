import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Register fonts if needed (optional, using standard fonts for now)
// Font.register({ family: 'Roboto', src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/Roboto-Regular.ttf' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
        padding: 20,
        alignContent: 'flex-start', // Top aligned
    },
    cutCellSingle: {
        width: '33.33%', // 3 columns for single QR
        padding: 5,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#cccccc',
    },
    cutCellBoth: {
        width: '50%', // 2 columns for dual QR
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
        gap: 20, // Increased gap between QRs
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
        width: 100, // Increased size
        height: 100, // Increased size
    },
    qrImageWrapper: {
        borderWidth: 2,
        borderColor: '#254154',
        borderRadius: 8,
        padding: 5,
        backgroundColor: '#ffffff',
    },
    header: {
        backgroundColor: '#254154', // Site Blue-Grey
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
        width: 130, // Adjusted for 3 columns
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

const GroupQRPDF: React.FC<GroupQRPDFProps> = ({ groupName, studentsWithQR, mode = 'encodage' }) => {

    return (
        <Document title={`Codes QR - ${groupName}`}>
            <Page size="A4" style={styles.page}>
                {studentsWithQR.map((student) => (
                    <View style={mode === 'both' ? styles.cutCellBoth : styles.cutCellSingle} key={student.id} wrap={false}>
                        <View style={styles.card}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={{ textAlign: 'center' }}>
                                    {student.prenom} {student.nom}
                                </Text>
                            </View>

                            {/* QR Codes */}
                            <View style={styles.qrContainer}>
                                {mode === 'both' ? (
                                    <View style={styles.qrRow}>
                                        <View style={styles.qrCol}>
                                            <Text style={styles.qrLabel}>Encodage</Text>
                                            <View style={styles.qrImageWrapper}>
                                                <Image src={student.qrData.encodage} style={styles.qrImageSmall} />
                                            </View>
                                        </View>
                                        <View style={styles.qrCol}>
                                            <Text style={styles.qrLabel}>Planification</Text>
                                            <View style={styles.qrImageWrapper}>
                                                <Image src={student.qrData.planification} style={styles.qrImageSmall} />
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.qrImageWrapper}>
                                        <Image 
                                            src={mode === 'encodage' ? student.qrData.encodage : student.qrData.planification} 
                                            style={styles.qrImage} 
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Footer */}
                            <Text style={styles.footer}>
                                {mode === 'both' ? 'Kiosques' : mode === 'planification' ? 'Kiosque Planification' : 'Kiosque Encodage'}
                            </Text>
                        </View>
                    </View>
                ))}
            </Page>
        </Document>
    );
};

export default GroupQRPDF;
