// Nœud « Prepare l'enregistrement Airtable » (Code, une fois pour tous les éléments).
// Le nœud de résumé renvoie un élément par fil, dans le même ordre que « Regroupe par fil et rattache ».
const fils = $('Regroupe par fil et rattache').all();

return $input.all().map((reponse, i) => {
  const fil = fils[i].json;
  const resume = ((reponse.json.content && reponse.json.content[0] && reponse.json.content[0].text) || '').trim();
  const champs = {
    fldJw5tHYusRtj3fr: resume, // Résumé proposé
    fldlr11SNY9cxjJtE: fil.idsMessages.join(' '), // ID message source (tous les messages du fil)
  };
  // Pas de sujet suggéré pour un mail sans contenu utile (newsletter…) : la suggestion serait du hasard.
  const exploitable = !/^aucune information exploitable/i.test(resume);
  if (fil.tacheSuggeree && exploitable) champs.fldRlvjCTO6uM9VxL = [fil.tacheSuggeree]; // Tâche suggérée

  if (fil.mode === 'complement') {
    return { json: { mode: 'complement', record: { id: fil.recordId, fields: champs } } };
  }
  return {
    json: {
      mode: 'creation',
      record: {
        fields: {
          ...champs,
          fldqeMY0gbHHQlSUN: fil.dateEmail, // Date de l'e-mail source (premier message du fil)
          fldklS9cEhGVgWw4l: fil.expediteur, // Expéditeur
          fldXhYl1ENEzAxteW: 'À valider', // Statut
          fldmoc83Alt9qrjEn: 'Email', // Origine
          fld5psDjYOgzT93zC: fil.idConversation, // ID conversation
        },
      },
    },
  };
});
