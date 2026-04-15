/**
 * Générateur de CSV pour le publipostage (Mail Merge).
 * 
 * Structure : Prénom, Nom, [Titre1], NA, A, M, [Titre2], NA, A, M, ...
 */

export function generateMailMergeCSV(students: any[], orderedEvals: any[], evaluationsData: any[]): string {
  if (!students.length || !orderedEvals.length) return '';

  const DELIMITER = ',';
  const MARK = 'X';

  // Helper pour échapper les cellules CSV
  const escape = (text: string) => {
    if (text === null || text === undefined) return '';
    const s = String(text);
    if (s.includes(DELIMITER) || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // 1. Construction de l'en-tête
  const headerParts = ['Prénom', 'Nom'];
  for (const evSummary of orderedEvals) {
    const data = evaluationsData.find((d: any) => d.evaluation.id === evSummary.id);
    const title = data?.evaluation?.titre || evSummary.titre || 'Sans titre';
    
    headerParts.push(escape(title));
    headerParts.push('NA');
    headerParts.push('A');
    headerParts.push('M');
  }
  
  const rows = [headerParts.join(DELIMITER)];

  // 2. Construction des lignes élèves
  for (const student of students) {
    const studentId = student.id;
    const rowParts = [escape(student.prenom), escape(student.nom)];

    for (const evSummary of orderedEvals) {
      const data = evaluationsData.find((d: any) => d.evaluation.id === evSummary.id);
      
      if (!data) {
        rowParts.push('', '', '', '');
        continue;
      }

      const { evaluation, questions, results, questionResults } = data;

      // Calcul de la note globale (similaire à la logique du markdown/service)
      const getGlobalPercent = (): number | null => {
        const res = results.find((r: any) => r.eleve_id === studentId);
        
        // Si l'élève est marqué absent/malade/etc., on ne met rien
        if (res && res.statut !== 'present') return null;

        let note = res?.note ?? null;

        // Si pas de note globale mais des questions, on calcule la somme pondérée
        if (note === null && questions && questions.length > 0) {
          let weightedSum = 0;
          let maxWeightedSum = 0;
          let noteFound = false;

          questions.forEach((q: any) => {
            const ratio = q.ratio != null ? parseFloat(q.ratio.toString()) : 1;
            const qMax = parseFloat(q.note_max.toString());
            maxWeightedSum += qMax * ratio;

            const qr = questionResults.find((r: any) => r.question_id === q.id && r.eleve_id === studentId);
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

        if (note === null) return null;
        return evaluation.note_max > 0 ? (note / evaluation.note_max) * 100 : 0;
      };

      const percent = getGlobalPercent();
      
      // On ajoute d'abord la colonne Titre (vide sur les lignes élèves selon spécification)
      rowParts.push('');

      if (percent === null) {
        // Pas de résultat -> 3 colonnes vides
        rowParts.push('', '', '');
      } else {
        // Placement du X selon les seuils : <50 (NA), 50-75 (A), >75 (M)
        if (percent < 50) {
          rowParts.push(MARK, '', '');
        } else if (percent <= 75) {
          rowParts.push('', MARK, '');
        } else {
          rowParts.push('', '', MARK);
        }
      }
    }

    rows.push(rowParts.join(DELIMITER));
  }

  return rows.join('\n');
}
