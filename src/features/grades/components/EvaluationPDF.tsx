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
    marginBottom: 15, // Réduit de 20
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 10,
    alignItems: 'center',
  },
  studentName: {
    fontSize: 20,
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
    height: 30,
    alignItems: 'center',
  },
  headerColLabel: {
    flex: 1,
    paddingLeft: 5,
  },
  headerColGrade: {
    width: 40,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
    height: '100%',
    justifyContent: 'center',
  },
  subjectRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    height: 30,
    alignItems: 'center',
  },
  subjectText: {
    paddingLeft: 5,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
  },
  questionRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 35,
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    padding: 5,
    fontSize: 12,
  },
  gradeCell: {
    width: 40,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#000000',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerX: {
    fontSize: 16,
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
    if (!res || res.note === null) return -1;
    const percent = evaluation.note_max > 0 ? (res.note / evaluation.note_max) * 100 : 0;
    return paliers.findIndex((p: any) => percent >= p.minPercent && percent <= p.maxPercent);
  };

  const globalPalierIdx = getGlobalPalierIdx();
  const hasGlobalResult = results.some(r => r.eleve_id === studentId && r.note !== null);
  const hasDetailedResult = questionResults.some(qr => qr.eleve_id === studentId && qr.note !== null);
  
  if (!hasGlobalResult && !hasDetailedResult) return null;

  return (
    <View style={styles.evaluationBlock} wrap={false}>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <View style={styles.headerColLabel} />
          {paliers.map((p: any, idx: number) => (
            <View key={idx} style={styles.headerColGrade}>
              <Text style={{fontFamily: 'Helvetica-Bold'}}>{p.letter}</Text>
            </View>
          ))}
        </View>

        <View style={styles.subjectRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectText}>{evaluation.titre || "Évaluation"}</Text>
          </View>
          {paliers.map((_: any, idx: number) => (
            <View key={idx} style={styles.gradeCell} />
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

        <View style={[styles.questionRow, { backgroundColor: '#F9F9F9' }]}>
          <View style={styles.questionText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Résultat Global</Text>
          </View>
          {paliers.map((p: any, idx: number) => (
            <View key={idx} style={styles.gradeCell}>
              {globalPalierIdx === idx && <Text style={styles.markerX}>X</Text>}
            </View>
          ))}
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
