import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Tables } from '../../../types/supabase';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  studentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'uppercase',
  },
  evaluationTitle: {
    fontSize: 10,
    color: '#666666',
  },
  infoSection: {
    marginBottom: 15,
    flexDirection: 'row',
    gap: 20,
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 6,
    color: '#999999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  table: {
    width: 'auto',
    marginTop: 10,
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    minHeight: 20,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#fafafa',
    fontWeight: 'bold',
    color: '#666666',
  },
  colCritere: {
    width: '40%',
    paddingLeft: 5,
    paddingRight: 5,
  },
  colPalier: {
    flex: 1,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
    height: '100%',
    justifyContent: 'center',
  },
  critereText: {
    fontSize: 7,
  },
  markerX: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  footer: {
    marginTop: 30,
    fontSize: 6,
    color: '#cccccc',
    textAlign: 'center',
  },
  summaryRow: {
    marginTop: 10,
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    minHeight: 25,
    alignItems: 'center',
  },
  summaryLabel: {
    width: '40%',
    paddingLeft: 10,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});

interface EvaluationPDFProps {
  evaluation: any;
  students: any[];
  questions: any[];
  results: any[];
  questionResults: any[];
  typeNote: Tables<'TypeNote'>;
}

const EvaluationPDFComponent: React.FC<EvaluationPDFProps> = ({ 
  evaluation, 
  students, 
  questions, 
  results, 
  questionResults,
  typeNote 
}) => {
  const paliers = (typeNote.config as any)?.paliers || [];
  const isNumeric = typeNote.systeme === 'numerique';

  // Helper to find result for a specific student and question
  const getQuestionResult = (studentId: string, questionId: string) => {
    const res = questionResults.find(r => r.eleve_id === studentId && r.question_id === questionId);
    if (!res || res.note === null) return null;
    return res.note;
  };

  // Helper to find global result for a student
  const getGlobalResult = (studentId: string) => {
    const res = results.find(r => r.eleve_id === studentId);
    if (!res || res.note === null) return null;
    return res.note;
  };

  // Helper to determine which palier a note falls into
  const getPalierIndex = (note: number, maxNote: number) => {
    if (note === null) return -1;
    const percent = maxNote > 0 ? (note / maxNote) * 100 : 0;
    
    return paliers.findIndex((p: any) => percent >= p.minPercent && percent <= p.maxPercent);
  };

  return (
    <Document title={`Évaluation - ${evaluation.titre}`}>
      {students.map((student) => {
        const globalNote = getGlobalResult(student.id);
        const globalPalierIdx = isNumeric ? -1 : getPalierIndex(globalNote || 0, evaluation.note_max);

        return (
          <Page key={student.id} size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.studentName}>{student.prenom} {student.nom}</Text>
              <Text style={styles.evaluationTitle}>{evaluation.titre}</Text>
            </View>

            {/* Meta Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Matière</Text>
                <Text style={styles.infoValue}>{evaluation._brancheName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{new Date(evaluation.date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Période</Text>
                <Text style={styles.infoValue}>{evaluation.periode}</Text>
              </View>
            </View>

            {/* Table of Criteria */}
            <View style={styles.table}>
              {/* Header Row */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.colCritere}>
                  <Text style={{ fontWeight: 'bold' }}>Critère d'évaluation</Text>
                </View>
                {!isNumeric ? (
                  paliers.map((p: any, idx: number) => (
                    <View key={idx} style={styles.colPalier}>
                      <Text style={{ fontWeight: 'bold' }}>{p.letter}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.colPalier}>
                    <Text style={{ fontWeight: 'bold' }}>Résultat (%)</Text>
                  </View>
                )}
              </View>

              {/* Data Rows */}
              {questions.map((q) => {
                const note = getQuestionResult(student.id, q.id);
                const palierIdx = isNumeric ? -1 : getPalierIndex(note || 0, q.note_max);
                const percent = q.note_max > 0 ? ((note || 0) / q.note_max) * 100 : 0;

                return (
                  <View key={q.id} style={styles.tableRow}>
                    <View style={styles.colCritere}>
                      <Text style={styles.critereText}>{q.titre}</Text>
                    </View>
                    {!isNumeric ? (
                      paliers.map((p: any, idx: number) => (
                        <View key={idx} style={styles.colPalier}>
                          {palierIdx === idx && <Text style={styles.markerX}>X</Text>}
                        </View>
                      ))
                    ) : (
                      <View style={styles.colPalier}>
                        <Text>{note !== null ? `${Math.round(percent)}%` : '-'}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Summary Row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabel}>
                  <Text>Résultat Global</Text>
                </View>
                {!isNumeric ? (
                  paliers.map((p: any, idx: number) => (
                    <View key={idx} style={styles.colPalier}>
                      {globalPalierIdx === idx && <Text style={styles.markerX}>X</Text>}
                    </View>
                  ))
                ) : (
                  <View style={styles.colPalier}>
                    <Text style={{ fontWeight: 'bold', fontSize: 9 }}>
                      {globalNote !== null ? `${Math.round((globalNote / evaluation.note_max) * 100)}%` : '-'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer} fixed>
              <Text>Généré le {new Date().toLocaleDateString()} - Gestion de Classe</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default EvaluationPDFComponent;
