// Nœud « Filtre les emails PENA » : ne garde que les mails liés au dossier PENA
// (domaine @groupepena.fr en De/À/Cc, ou mot « pena » dans l'objet ou le corps),
// hors expéditeurs exclus ci-dessous.
const items = $input.first().json.value || [];
const results = [];
// Expéditeurs qui citent « PENA » sans rien apporter au dossier ICPE :
// - logiciel de facturation CDL ;
// - notifications Welyb du cabinet comptable Paquier (listent les factures « PENA METAUX »,
//   faux positif constaté le 05/11/2026).
const EXCLUDE_SENDERS = new Set([
  'cdlexpertises@isanetfact.facturation.io',
  'noreply@paquier.welyb.fr',
]);

function addr(a) { return ((a && a.emailAddress && a.emailAddress.address) || '').toLowerCase(); }

for (const msg of items) {
  const fromAddr = addr(msg.from) || addr(msg.sender);
  if (EXCLUDE_SENDERS.has(fromAddr)) continue;

  const toAddrs = (msg.toRecipients || []).map(addr);
  const ccAddrs = (msg.ccRecipients || []).map(addr);
  const allAddrs = [fromAddr, ...toAddrs, ...ccAddrs];
  const hasPenaDomain = allAddrs.some((a) => a.endsWith('@groupepena.fr'));

  const subject = msg.subject || '';
  const bodyText = (msg.body && msg.body.content) || msg.bodyPreview || '';
  const haystack = (subject + ' ' + bodyText).toLowerCase();
  const hasPenaKeyword = haystack.includes('pena');

  if (!hasPenaDomain && !hasPenaKeyword) continue;

  results.push({
    json: {
      id: msg.id,
      // Identifiant stable d'un message (le même dans Boîte de réception et Éléments envoyés) : sert au dédoublonnage.
      internetMessageId: msg.internetMessageId || '',
      // Fil de discussion : les messages d'un même fil donnent une seule entrée.
      conversationId: msg.conversationId || '',
      subject,
      from: fromAddr,
      fromMissing: !fromAddr,
      to: toAddrs,
      cc: ccAddrs,
      receivedDateTime: msg.receivedDateTime,
      bodyText: bodyText.slice(0, 6000),
    },
  });
}

return results;
