import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import QRCode from 'qrcode';

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
    cutCell: {
        width: '33.33%', // 3 columns
        padding: 10, // Inner spacing
        height: 260, // Reduced height to fit 3 rows (9 items) per page
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
        width: 120,
        height: 120,
    },
    footer: {
        marginBottom: 15,
        fontSize: 10,
        color: '#666666',
        textAlign: 'center',
    },
});

interface GroupQRPDFProps {
    groupName: string;
    students: any[];
    baseUrl: string;
}

interface StudentWithQR {
    id: string;
    prenom: string;
    nom: string;
    qrDataUrl: string;
}

const GroupQRPDF: React.FC<GroupQRPDFProps> = ({ groupName, students, baseUrl }) => {
    const [studentsWithQR, setStudentsWithQR] = useState<StudentWithQR[]>([]);
    const [isGenerating, setIsGenerating] = useState(true);

    useEffect(() => {
        const generateQRs = async () => {
            try {
                const promises = students.map(async (student) => {
                    const kioskUrl = `${baseUrl}/kiosk/${student.id}?token=${student.access_token || ''}`;
                    // Generate QR as Data URL (PNG)
                    const qrDataUrl = await QRCode.toDataURL(kioskUrl, {
                        width: 300,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#ffffff',
                        },
                    });
                    return {
                        id: student.id,
                        prenom: student.prenom,
                        nom: student.nom,
                        qrDataUrl,
                    };
                });

                const results = await Promise.all(promises);
                setStudentsWithQR(results);
            } catch (error) {
                console.error('Error generating PDF QR codes:', error);
            } finally {
                setIsGenerating(false);
            }
        };

        generateQRs();
    }, [students, baseUrl]);

    if (isGenerating) {
        return (
            <Document>
                <Page style={styles.page}>
                    <Text>Génération des codes QR...</Text>
                </Page>
            </Document>
        );
    }

    return (
        <Document title={`Codes QR - ${groupName}`}>
            <Page size="A4" style={styles.page}>
                {studentsWithQR.map((student) => (
                    <View style={styles.cutCell} key={student.id} wrap={false}>
                        <View style={styles.card}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={{ textAlign: 'center' }}>
                                    {student.prenom} {student.nom}
                                </Text>
                            </View>

                            {/* QR Code */}
                            <View style={styles.qrContainer}>
                                <Image src={student.qrDataUrl} style={styles.qrImage} />
                            </View>

                            {/* Footer */}
                            <Text style={styles.footer}>Connexion à Gestion de Classe</Text>
                        </View>
                    </View>
                ))}
            </Page>
        </Document>
    );
};

export default GroupQRPDF;
