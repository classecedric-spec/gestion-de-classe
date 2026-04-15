import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30, // Réduit de 40
    backgroundColor: '#ffffff',
    fontSize: 14,
    fontFamily: 'Helvetica',
    color: '#000000',
  },
  studentSection: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  evaluationBlock: {
    marginBottom: 20, // Réduit de 30
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 20,
    alignItems: 'stretch',
  },
  headerColLabel: {
    flex: 1,
    paddingLeft: 5,
    justifyContent: 'center',
  },
  headerColGrade: {
    width: 40,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
    justifyContent: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 20,
    alignItems: 'stretch',
  },
  subjectText: {
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
  },
  questionRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 25,
    alignItems: 'stretch',
  },
  questionText: {
    flex: 1,
    padding: 5,
    fontSize: 10,
    justifyContent: 'center',
  },
  gradeCell: {
    width: 40,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerX: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 9,
    color: '#666666',
    borderTopWidth: 0.5,
    borderTopColor: '#EEEEEE',
    paddingTop: 10,
  }
});

interface EvaluationData {
  evaluation: any;
  questions: any[];
  results: any[];
  questionResults: any[];
  typeNote: any;
}

interface EvaluationPDFProps {
  student: any;
  // Legacy single mode
  evaluation?: any;
  questions?: any[];
  results?: any[];
  questionResults?: any[];
  typeNote?: any;
  // New bulk mode
  bulkMode?: boolean;
  evaluationsData?: EvaluationData[];
}

// Sub-component for a single evaluation table
const EvaluationTable: React.FC<{
  data: EvaluationData;
  studentId: string;
}> = ({ data, studentId }) => {
  const { evaluation, questions, results, questionResults, typeNote } = data;
  const paliers = (typeNote?.config as any)?.paliers || [];

  const getQuestionPalierIdx = (qId: string, maxNote: number) => {
    const res = questionResults.find(r => r.eleve_id === studentId && r.question_id === qId);
    if (!res || res.note === null) return -1;
    const percent = maxNote > 0 ? (res.note / maxNote) * 100 : 0;
    return paliers.findIndex((p: any) => percent >= p.minPercent && percent <= p.maxPercent);
  };

  const getGlobalPalierIdx = () => {
    const res = results.find(r => r.eleve_id === studentId);
    let note = res?.note ?? null;

    // Si la note globale est manquante mais qu'on a des critères, on recalcule le total
    if (note === null && questions.length > 0) {
      let weightedSum = 0;
      let maxWeightedSum = 0;
      let noteFound = false;

      questions.forEach(q => {
        const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
        const qMax = parseFloat(q.note_max.toString());
        maxWeightedSum += qMax * ratio;

        const qr = questionResults.find(r => r.question_id === q.id && r.eleve_id === studentId);
        if (qr && qr.note !== null) {
          weightedSum += parseFloat(qr.note.toString()) * ratio;
          noteFound = true;
        }
      });

      if (noteFound && maxWeightedSum > 0) {
        const evalMax = parseFloat(evaluation.note_max?.toString() || '20');
        note = (weightedSum / maxWeightedSum) * evalMax;
      }
    }

    if (note === null) return -1;
    
    const percent = evaluation.note_max > 0 ? (note / evaluation.note_max) * 100 : 0;
    
    // Logique harmonisée avec gradeService (min inclusive, max exclusive sauf pour 100%)
    return paliers.findIndex((p: any) => {
        const min = p.minPercent ?? 0;
        const max = p.maxPercent ?? 0;
        if (percent >= 100 && max >= 100) return percent >= min;
        return percent >= min && percent < max;
    });
  };

  const globalPalierIdx = getGlobalPalierIdx();
  const hasGlobalResult = results.some(r => r.eleve_id === studentId && r.note !== null);
  const hasDetailedResult = questionResults.some(qr => qr.eleve_id === studentId && qr.note !== null);
  
  if (!hasGlobalResult && !hasDetailedResult && globalPalierIdx === -1) return null;

  return (
    <View style={styles.evaluationBlock} wrap={false}>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <View style={[styles.headerColLabel, { backgroundColor: '#E5E5E5', padding: 5 }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold', textDecoration: 'underline' }}>
              {evaluation.titre || "Évaluation"}
            </Text>
          </View>
          {paliers.map((p: any, idx: number) => (
            <View key={idx} style={styles.headerColGrade}>
              <Text style={{fontFamily: 'Helvetica-Bold'}}>{p.letter}</Text>
            </View>
          ))}
        </View>

        {questions.map((q) => {
          const palierIdx = getQuestionPalierIdx(q.id, q.note_max);
          return (
            <View key={q.id} style={styles.questionRow}>
              <View style={styles.questionText}>
                <Text>{q.titre}</Text>
              </View>
              {paliers.map((p: any, idx: number) => (
                <View key={idx} style={styles.gradeCell}>
                  {palierIdx === idx && <Text style={styles.markerX}>X</Text>}
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.questionRow}>
          <View style={styles.questionText}>
            <Text style={{ fontFamily: 'Helvetica-Bold', textAlign: 'right', paddingRight: 5 }}>Résultat Global</Text>
          </View>
          {paliers.map((p: any, idx: number) => {
            const isSelected = globalPalierIdx === idx;
            return (
              <View key={idx} style={[styles.gradeCell, isSelected && { backgroundColor: '#E5E5E5' }]}>
                {isSelected && <Text style={styles.markerX}>X</Text>}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const EvaluationPDFComponent: React.FC<EvaluationPDFProps> = (props) => {
  const { student, bulkMode, evaluationsData } = props;

  // Normalize data
  let finalEvaluationsData: EvaluationData[] = [];
  if (bulkMode && evaluationsData) {
    finalEvaluationsData = evaluationsData;
  } else if (props.evaluation) {
    finalEvaluationsData = [{
      evaluation: props.evaluation,
      questions: props.questions || [],
      results: props.results || [],
      questionResults: props.questionResults || [],
      typeNote: props.typeNote
    }];
  }

  const documentTitle = `Évaluation - ${student.prenom} ${student.nom}`;

  return (
    <Document title={documentTitle}>
      <Page size="A4" style={styles.page}>
        <View style={styles.studentSection}>
          <Text style={styles.studentName}>{student.prenom} {student.nom}</Text>
        </View>

        {finalEvaluationsData.map((data, idx) => (
          <EvaluationTable key={idx} data={data} studentId={student.id} />
        ))}

        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => (
            `${student.prenom} ${student.nom} - Page ${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default EvaluationPDFComponent;
