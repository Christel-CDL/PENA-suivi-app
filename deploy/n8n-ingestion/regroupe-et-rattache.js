// Nœud « Regroupe par fil et rattache » (Code, une fois pour tous les éléments).
// 1. Écarte les mails déjà connus (internetMessageId présent dans ENTRÉES ou JOURNAL).
// 2. Regroupe les mails restants par fil (conversationId) : une seule entrée par fil.
// 3. Si une entrée « À valider » existe déjà pour ce fil, elle sera complétée, pas dupliquée.
// 4. Suggère le sujet ouvert le plus probable (contact lié, puis mots-clés) — jamais une création.

const MOI = 'christel.lacome@cdl-expertises.com';
const MAX_FILS = 20; // garde-fou : au-delà, on s'arrête plutôt que d'inonder la file
const F = {
  tache: { nom: 'fld5zG7gky1Im4pSb', etape: 'fldQYFwKugQeg2Oql', pp: 'fldFwgUhvNl7OGCYm', presta: 'fldTxUuDSdlDvQtdH', resp: 'fldAhpJcotmZCboiD' },
  contactEmail: 'fldOjp5wilEF5M319',
  entree: { statut: 'fldXhYl1ENEzAxteW', idMsg: 'fldlr11SNY9cxjJtE', idConv: 'fld5psDjYOgzT93zC', resume: 'fldJw5tHYusRtj3fr', tache: 'fldRlvjCTO6uM9VxL' },
  journalIdMsg: 'fldrFc26YXzeQEoDs',
};

// Chaque nœud de lecture Airtable renvoie un élément par page de résultats.
const enregistrements = (nom) => $(nom).all().flatMap((i) => i.json.records || []);
const mails = $('Filtre les emails PENA').all().map((i) => i.json);
const taches = enregistrements('Lit les sujets ouverts');
const contacts = enregistrements('Lit les contacts');
const entrees = enregistrements('Lit les entrees existantes');
const journal = enregistrements('Lit les IDs du journal');

// --- 1. Dédoublonnage par message -------------------------------------------
const ids = (s) => (s || '').split(/\s+/).filter(Boolean);
const dejaVus = new Set([
  ...entrees.flatMap((r) => ids(r.fields[F.entree.idMsg])),
  ...journal.flatMap((r) => ids(r.fields[F.journalIdMsg])),
]);
const vusIci = new Set();
const nouveaux = mails.filter((m) => {
  const id = m.internetMessageId || m.id;
  if (dejaVus.has(id) || vusIci.has(id)) return false;
  vusIci.add(id);
  return true;
});

// --- 2. Regroupement par fil ------------------------------------------------
const fils = new Map();
for (const m of nouveaux) {
  const cle = m.conversationId || m.internetMessageId || m.id;
  if (!fils.has(cle)) fils.set(cle, []);
  fils.get(cle).push(m);
}
if (fils.size > MAX_FILS) {
  throw new Error(`Garde-fou : ${fils.size} fils à créer d'un coup (maximum ${MAX_FILS}). Rien n'a été écrit.`);
}

// --- 4. Rattachement au sujet existant --------------------------------------
const normaliser = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const VIDES = new Set(['pena', 'pour', 'avec', 'dans', 'sans', 'cette', 'votre', 'vous', 'nous', 'merci', 'bonjour',
  'cordialement', 'objet', 'christel', 'lacome', 'message', 'mise', 'jour', 'suite', 'faire', 'point', 'plus', 'bien',
  'sont', 'etre', 'avoir', 'tout', 'tous', 'entre', 'apres', 'avant', 'depuis', 'leur', 'leurs', 'elle', 'ils']);
const mots = (s) => new Set(
  normaliser(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !VIDES.has(w)).map((w) => w.replace(/s$/, '')),
);
const motsDuSujet = new Map(taches.map((t) => [t.id, mots(`${t.fields[F.tache.nom] || ''} ${t.fields[F.tache.etape] || ''}`)]));
// Un mot présent dans beaucoup de sujets (ex. « plan ») compte moins qu'un mot rare (« voirie »).
const frequence = new Map();
for (const s of motsDuSujet.values()) for (const w of s) frequence.set(w, (frequence.get(w) || 0) + 1);
const contactParEmail = new Map(
  contacts.filter((c) => c.fields[F.contactEmail]).map((c) => [c.fields[F.contactEmail].toLowerCase(), c.id]),
);

function sujetSuggere(groupe) {
  const adresses = new Set(
    groupe.flatMap((m) => [m.from, ...(m.to || []), ...(m.cc || [])])
      .filter((a) => a && a !== MOI && !/no-?reply/.test(a)),
  );
  const contactsDuFil = new Set([...adresses].map((a) => contactParEmail.get(a)).filter(Boolean));
  const motsDuFil = mots(groupe.map((m) => `${m.subject} ${m.bodyText}`).join(' '));

  let meilleur = null;
  let meilleurScore = 0;
  for (const t of taches) {
    const lies = [...(t.fields[F.tache.pp] || []), ...(t.fields[F.tache.presta] || []), ...(t.fields[F.tache.resp] || [])];
    let score = lies.some((id) => contactsDuFil.has(id)) ? 1 : 0;
    for (const w of motsDuSujet.get(t.id)) if (motsDuFil.has(w)) score += 1 / frequence.get(w);
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleur = t.id;
    }
  }
  // Seuil : un contact lié, ou l'équivalent d'un mot propre à un seul sujet.
  return meilleurScore >= 1 ? meilleur : null;
}

// --- 3. Préparation des résumés ---------------------------------------------
const SYSTEME =
  "Tu resumes des e-mails professionnels pour un journal de suivi de dossier ICPE (reglementation environnementale " +
  "industrielle) en France. On te donne un ou plusieurs messages d'un meme fil de discussion : redige UN seul resume " +
  "factuel et concis (2 a 5 phrases), en francais, de l'ensemble du fil -- ce qui a ete communique, demande ou decide. " +
  "Ecris en texte simple, sans titre ni mise en forme Markdown. Ne recopie jamais le texte brut. N'invente rien et ne suppose aucune action a entreprendre. Si un resume precedent " +
  "est fourni, produis un resume mis a jour de tout le fil. Si le fil ne contient aucune information exploitable pour " +
  "un suivi de dossier, reponds exactement : 'Aucune information exploitable.'";

const sortie = [];
for (const [cle, groupe] of fils) {
  groupe.sort((a, b) => a.receivedDateTime.localeCompare(b.receivedDateTime));
  const existante = entrees.find(
    (r) => r.fields[F.entree.statut] === 'À valider' && r.fields[F.entree.idConv] && r.fields[F.entree.idConv] === cle,
  );
  const messages = groupe
    .map((m) => `--- Message du ${m.receivedDateTime}, de ${m.from || 'expediteur inconnu'}, objet : ${m.subject}\n${(m.bodyText || '').slice(0, 3000)}`)
    .join('\n\n')
    .slice(0, 12000);
  const resumePrecedent = existante ? `Resume precedent du debut du fil :\n${existante.fields[F.entree.resume] || ''}\n\nNouveaux messages :\n` : '';
  const expediteur = (groupe.find((m) => m.from && m.from !== MOI && !/no-?reply/.test(m.from)) || groupe[0]).from || '';

  sortie.push({
    json: {
      mode: existante ? 'complement' : 'creation',
      recordId: existante ? existante.id : null,
      idConversation: groupe[0].conversationId || '',
      idsMessages: [...ids(existante && existante.fields[F.entree.idMsg]), ...groupe.map((m) => m.internetMessageId || m.id)],
      dateEmail: groupe[0].receivedDateTime,
      expediteur,
      tacheSuggeree: existante && (existante.fields[F.entree.tache] || []).length ? null : sujetSuggere(groupe),
      nbMessages: groupe.length,
      system: SYSTEME,
      user: resumePrecedent + messages,
    },
  });
}
return sortie;
