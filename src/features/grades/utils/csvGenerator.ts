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
        
        // 1. Respecter le statut (Absent, Malade, etc.)
        if (res && res.statut !== 'present') return null;

        // 2. Priorité aux questions si elles existent
        if (questions && questions.length > 0) {
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
            return (weightedSum / maxWeightedSum) * 100;
          }
          return null; // Si critères présents mais non notés, on ne remonte pas la note globale
        }

        // 3. Fallback sur la note globale (seulement si pas de questions)
        const note = res?.note ?? null;
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
