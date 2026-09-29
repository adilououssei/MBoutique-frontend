/**
 * Extraction locale d'un produit depuis une phrase dictée, ex :
 * « Coca-Cola 50cl en détail à 600 et en gros à 550 ».
 *
 * Le backend ne propose pas encore d'endpoint vocal (seul le contrat
 * VoiceProductParser existe, voir backend/docs/catalog.md). Le résultat n'est
 * jamais enregistré directement : il pré-remplit le formulaire manuel, que
 * l'utilisateur vérifie puis valide — mêmes règles que la saisie manuelle.
 */
export type VoiceDraft = { nom: string; prix_detail?: string; prix_gros?: string };

const NUMBER = '(\\d[\\d\\s.,]*)';
const LINK = '\\s*(?:à|a|:|=|pour|au prix de|prix|de)?\\s*';

function toAmount(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // « 1 500 », « 1.500 » ou « 1,500 » => 1500 ; « 12,5 » => 12.5
  const compact = raw.trim().replace(/\s+/g, '');
  const normalized = /^\d{1,3}([.,]\d{3})+$/.test(compact) ? compact.replace(/[.,]/g, '') : compact.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? String(n) : undefined;
}

export function parseVoiceProduct(input: string): VoiceDraft {
  const text = input.replace(/francs?|fcfa|cfa/gi, ' ').replace(/\s+/g, ' ').trim();

  const detail = text.match(new RegExp(`d[ée]tail${LINK}${NUMBER}`, 'i'))?.[1];
  const gros = text.match(new RegExp(`gros${LINK}${NUMBER}`, 'i'))?.[1];
  // « Riz 25kg à 18000 » : un prix seul vaut prix détail.
  const alone = !detail && !gros ? text.match(new RegExp(`(?:à|a|prix)\\s+${NUMBER}\\s*$`, 'i'))?.[1] : undefined;

  const cut = text.search(/\s(?:en|au|à|a)\s+(?:d[ée]tail|gros)\b|\s(?:d[ée]tail|gros)\s|\s(?:à|a|prix)\s+\d|,/i);
  let nom = (cut > 0 ? text.slice(0, cut) : text)
    .replace(/^(?:cr[ée]{1,2}r?|ajoute[rz]?|nouveau|enregistre[rz]?)\s+/i, '')
    .replace(/^(?:le|la|les|un|une)?\s*produit\s+/i, '')
    .trim();
  nom = nom.charAt(0).toUpperCase() + nom.slice(1);

  return { nom, prix_detail: toAmount(detail ?? alone), prix_gros: toAmount(gros) };
}
