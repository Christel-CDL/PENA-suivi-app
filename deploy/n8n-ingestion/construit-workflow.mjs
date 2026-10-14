// Construit le workflow « PENA - Ingestion e-mails » corrigé (v2, 14/10/2026) à partir de
// la version ACTIVE lue dans n8n (GET /api/v1/workflows/{id} → activeVersion), sans toucher
// aux credentials (repris tels quels, sinon un PUT les efface).
//
//   node construit-workflow.mjs <workflow-actif.json> <sortie-prod.json> [<sortie-test.json>]
//
// La variante « test » lit une plage de dates fixe, se déclenche chaque minute et s'arrête
// AVANT toute écriture dans Airtable (essai à blanc).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const [, , entree, sortieProd, sortieTest] = process.argv;
const actif = JSON.parse(fs.readFileSync(entree, "utf8"));
const base = actif.activeVersion ?? actif;
const noeud = (nom) => structuredClone(base.nodes.find((n) => n.name === nom));
const code = (fichier) => fs.readFileSync(path.join(ici, fichier), "utf8");

const AIRTABLE = "https://api.airtable.com/v0/app6sehe4hMHO1NXe";
const credAirtable = noeud("Ecrit dans Entrees a valider").credentials;

/** Lecture Airtable paginée, exécutée une seule fois quel que soit le nombre de mails en entrée. */
function lectureAirtable(nom, table, formule, position) {
  return {
    parameters: {
      url: `${AIRTABLE}/${table}`,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendQuery: true,
      // Chaque nom de paramètre n'apparaît qu'une fois (piège n8n : deux « fields[] » s'écrasent).
      queryParameters: {
        parameters: [
          { name: "returnFieldsByFieldId", value: "true" },
          ...(formule ? [{ name: "filterByFormula", value: formule }] : []),
        ],
      },
      options: {
        pagination: {
          pagination: {
            paginationMode: "updateAParameterInEachRequest",
            parameters: { parameters: [{ type: "qs", name: "offset", value: "={{ $response.body.offset }}" }] },
            paginationCompleteWhen: "other",
            completeExpression: "={{ !$response.body.offset }}",
            limitPagesFetched: true,
            maxRequests: 50,
          },
        },
      },
    },
    name: nom,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    executeOnce: true,
    credentials: credAirtable,
  };
}

function construit({ test }) {
  const declencheur = noeud("Toutes les 15 min, jours ouvres 8h-20h");
  if (test) {
    declencheur.name = "Test - chaque minute";
    declencheur.parameters = { rule: { interval: [{ field: "minutes", minutesInterval: 1 }] } };
  }

  const depart = noeud("Calcule la date de depart");
  depart.parameters.jsCode = test
    ? "// TEST : plage fixe (UTC) couvrant les mails Taillet du 07/10 au soir et du 08/10 au matin.\n" +
      "return [{ json: { since: '2026-10-07T16:00:00Z', until: '2026-10-08T06:30:00Z' } }];"
    : [
        "const staticData = $getWorkflowStaticData('global');",
        "// Chevauchement de 5 min avec le passage précédent : un mail indexé en retard n'est jamais",
        "// manqué ; s'il a déjà été traité, il est écarté plus loin grâce à son internetMessageId.",
        "const MARGE_MS = 5 * 60 * 1000;",
        "const dernier = staticData.lastCheck || new Date(Date.now() - 24 * 3600 * 1000).toISOString();",
        "const since = new Date(new Date(dernier).getTime() - MARGE_MS).toISOString();",
        "staticData.lastCheck = new Date().toISOString();",
        "return [{ json: { since } }];",
      ].join("\n");

  const outlook = noeud("Lit les emails Outlook");
  outlook.parameters.queryParameters = {
    parameters: [
      {
        name: "$filter",
        value: test
          ? "={{ 'receivedDateTime ge ' + $json.since + ' and receivedDateTime le ' + $json.until }}"
          : "={{ 'receivedDateTime ge ' + $json.since }}",
      },
      {
        name: "$select",
        value: "subject,from,sender,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,id,internetMessageId,conversationId",
      },
      { name: "$top", value: "50" },
      { name: "$orderby", value: "receivedDateTime asc" },
    ],
  };

  const filtre = noeud("Filtre les emails PENA");
  filtre.parameters.jsCode = code("filtre.js");

  const regroupe = {
    parameters: { jsCode: code("regroupe-et-rattache.js") },
    name: "Regroupe par fil et rattache",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1792, 0],
  };

  const resume = noeud("Resume avec Claude");
  resume.position = [2016, 0];
  resume.parameters.jsonBody =
    '={{ { model: "claude-haiku-4-5", max_tokens: 400, system: $json.system, messages: [ { role: "user", content: $json.user } ] } }}';

  const prepare = noeud("Prepare l'enregistrement Airtable");
  prepare.position = [2240, 0];
  prepare.parameters = { jsCode: code("prepare-enregistrement.js") };

  const lectures = [
    lectureAirtable("Lit les sujets ouverts", "tbl08JtLokfU4MA9U", "AND({Statut}!='Terminé',{Statut}!='Annulée')", [896, 0]),
    lectureAirtable("Lit les contacts", "tbllfX0VF60aiCDFV", "", [1120, 0]),
    lectureAirtable("Lit les entrees existantes", "tblHiNsXnONUGUUVK", "OR({ID message source}!='',{Statut}='À valider')", [1344, 0]),
    lectureAirtable("Lit les IDs du journal", "tbleeo7rGuwrh01J3", "{ID message source}!=''", [1568, 0]),
  ];

  const garde = (nom, mode, position) => ({
    parameters: { jsCode: `return $input.all().filter((i) => i.json.mode === '${mode}');` },
    name: nom,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  });
  const ecriture = (nom, methode, position) => ({
    parameters: {
      method: methode,
      url: `${AIRTABLE}/tblHiNsXnONUGUUVK?returnFieldsByFieldId=true`,
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ { records: [ $json.record ], typecast: true } }}",
      options: {},
    },
    name: nom,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: credAirtable,
  });

  const nodes = [declencheur, depart, outlook, filtre, ...lectures, regroupe, resume, prepare];
  const chaine = nodes.map((n) => n.name);
  const connections = {};
  for (let i = 0; i < chaine.length - 1; i++) {
    connections[chaine[i]] = { main: [[{ node: chaine[i + 1], type: "main", index: 0 }]] };
  }

  if (!test) {
    nodes.push(
      garde("Garde les nouvelles entrees", "creation", [2464, -112]),
      ecriture("Ecrit dans Entrees a valider", "POST", [2688, -112]),
      garde("Garde les entrees a completer", "complement", [2464, 112]),
      ecriture("Complete l'entree du meme fil", "PATCH", [2688, 112]),
    );
    connections["Prepare l'enregistrement Airtable"] = {
      main: [[
        { node: "Garde les nouvelles entrees", type: "main", index: 0 },
        { node: "Garde les entrees a completer", type: "main", index: 0 },
      ]],
    };
    connections["Garde les nouvelles entrees"] = { main: [[{ node: "Ecrit dans Entrees a valider", type: "main", index: 0 }]] };
    connections["Garde les entrees a completer"] = { main: [[{ node: "Complete l'entree du meme fil", type: "main", index: 0 }]] };
  }

  return {
    name: test ? "ZZ TEST - Ingestion e-mails (a blanc, a supprimer)" : base.name ?? actif.name,
    nodes,
    connections,
    settings: actif.settings ?? { executionOrder: "v1" },
  };
}

fs.writeFileSync(sortieProd, JSON.stringify(construit({ test: false }), null, 2) + "\n");
if (sortieTest) fs.writeFileSync(sortieTest, JSON.stringify(construit({ test: true }), null, 2) + "\n");
console.log("ok");
