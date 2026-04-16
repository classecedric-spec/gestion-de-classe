export function generateEvaluationsMarkdown(students: any[], evaluationsData: any[], orderedEvals: any[]): string {
  let markdown = '';

  for (const student of students) {
    const studentId = student.id;
    let studentContent = '';
    const branchesMap = new Map<string, any[]>();

    for (const evSummary of orderedEvals) {
      const data = evaluationsData.find((d: any) => d.evaluation.id === evSummary.id);
      if (!data) continue;

      const { evaluation, questions, results, questionResults, typeNote } = data;
      const paliers = (typeNote?.config as any)?.paliers || [];

      // Logic to calculate global note/percentage
      const getGlobalPercent = () => {
        const res = results.find((r: any) => r.eleve_id === studentId);
        
        // 1. Respecter le statut (Absent, Malade, etc.)
        if (res && res.statut !== 'present') return null;

        // 2. Priorité aux questions si elles existent
        if (questions.length > 0) {
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

      const globalPercent = getGlobalPercent();
      const hasGlobalResult = results.some((r: any) => r.eleve_id === studentId && r.note !== null);
      const hasDetailedResult = questionResults.some((qr: any) => qr.eleve_id === studentId && qr.note !== null);

      // Removed the skip condition to allow evaluations with no results to appear with a '-'
      
      const branchName = evaluation.Branche?.nom || evaluation._brancheName || 'Sans matière';
      if (!branchesMap.has(branchName)) {
        branchesMap.set(branchName, []);
      }

      branchesMap.get(branchName)!.push({
        evaluation,
        questions,
        questionResults,
        globalPercent
      });
    }

    if (branchesMap.size > 0) {
      studentContent += `# ${student.nom}, ${student.prenom}\n\n`;

      for (const [branchName, evals] of branchesMap.entries()) {
        studentContent += `## ${branchName}\n\n`;

        for (const item of evals) {
          const { evaluation, questions, questionResults, globalPercent } = item;
          const percentStr = globalPercent !== null ? `${Math.round(globalPercent)} %` : '-';
          studentContent += `### ${evaluation.titre} : ${percentStr}\n`;

          for (const q of questions) {
            const qr = questionResults.find((r: any) => r.question_id === q.id && r.eleve_id === studentId);
            const score = qr && qr.note !== null ? qr.note : '-';
            studentContent += `- ${q.titre} : ${score} / ${q.note_max}\n`;
          }
          studentContent += '\n';
        }
      }
    }

    markdown += studentContent;
  }

  return markdown;
}
