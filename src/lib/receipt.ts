import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import { formatDateTime, formatMoney, formatQty, toNumber } from './format';
import type { Sale, Store } from './types';

function lineDetail(l: NonNullable<Sale['lignes']>[number]): string {
  const mode = l.type === 'service' ? 'Service' : l.mode_prix === 'gros' ? 'Gros' : 'Détail';
  return `${formatQty(l.quantite)} x ${formatMoney(l.prix_unitaire)} (${mode})`;
}

/** Ticket en texte brut, pour WhatsApp / SMS / e-mail. */
export function receiptText(sale: Sale, store: Store | null): string {
  const out: string[] = [];
  out.push(`*${store?.nom ?? 'M Boutique'}*`);
  if (store?.adresse) out.push(store.adresse);
  if (store?.telephone) out.push(`Tél : ${store.telephone}`);
  out.push('', `Ticket ${sale.reference}`, formatDateTime(sale.vendue_le));
  if (sale.statut === 'annulee') out.push('*VENTE ANNULÉE*');
  out.push('--------------------------------');
  for (const l of sale.lignes ?? []) {
    out.push(l.nom_produit, `  ${lineDetail(l)} = ${formatMoney(toNumber(l.total) + toNumber(l.remise))}`);
    if (toNumber(l.remise) > 0) out.push(`  Remise : -${formatMoney(l.remise)}`);
  }
  out.push('--------------------------------');
  out.push(`Sous-total : ${formatMoney(sale.sous_total)}`);
  if (toNumber(sale.remise) > 0) out.push(`Remise : -${formatMoney(sale.remise)}`);
  out.push(`*TOTAL : ${formatMoney(sale.total)}*`, `Paiement : ${paymentLabel(sale)}`);
  if (sale.montant_credit != null) out.push(`Acompte versé : ${formatMoney(sale.acompte)}`, `*Reste dû : ${formatMoney(sale.montant_credit)}*`);
  if (sale.client) out.push(`Client : ${sale.client.nom}`);
  if (sale.vendeur) out.push(`Vendeur : ${sale.vendeur.nom}`);
  out.push('', 'Merci pour votre achat !');
  return out.join('\n');
}

const esc = (v: string | null | undefined) => (v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Ticket au format caisse (80 mm), base du PDF. */
export function receiptHtml(sale: Sale, store: Store | null): string {
  const lines = (sale.lignes ?? [])
    .map(
      (l) => `
      <tr><td colspan="2" class="name">${esc(l.nom_produit)}</td></tr>
      <tr><td class="muted">${esc(lineDetail(l))}</td><td class="r">${esc(formatMoney(toNumber(l.total) + toNumber(l.remise)))}</td></tr>
      ${toNumber(l.remise) > 0 ? `<tr><td class="muted">Remise</td><td class="r">-${esc(formatMoney(l.remise))}</td></tr>` : ''}`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
  <style>
    @page { margin: 6mm; }
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #13202F; font-size: 12px; max-width: 300px; margin: 0 auto; }
    h1 { font-size: 16px; margin: 0; text-align: center; }
    .c { text-align: center; } .r { text-align: right; white-space: nowrap; } .muted { color: #6B7684; }
    .ref { color: #FE5F17; font-weight: 700; }
    .sep { border-top: 1px dashed #9AA3AF; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; } td { padding: 1px 0; vertical-align: top; }
    .name { font-weight: 600; padding-top: 4px; }
    .total td { font-size: 15px; font-weight: 800; padding-top: 4px; }
    .cancel { border: 2px solid #E53935; color: #E53935; font-weight: 800; text-align: center; padding: 4px; margin: 6px 0; }
  </style></head><body>
    <h1>${esc(store?.nom ?? 'M Boutique')}</h1>
    ${store?.adresse ? `<div class="c muted">${esc(store.adresse)}</div>` : ''}
    ${store?.telephone ? `<div class="c muted">Tél : ${esc(store.telephone)}</div>` : ''}
    <div class="sep"></div>
    <div class="c ref">${esc(sale.reference)}</div>
    <div class="c muted">${esc(formatDateTime(sale.vendue_le))}</div>
    ${sale.statut === 'annulee' ? `<div class="cancel">VENTE ANNULÉE</div>` : ''}
    <div class="sep"></div>
    <table>${lines}</table>
    <div class="sep"></div>
    <table>
      <tr><td class="muted">Sous-total</td><td class="r">${esc(formatMoney(sale.sous_total))}</td></tr>
      ${toNumber(sale.remise) > 0 ? `<tr><td class="muted">Remise</td><td class="r">-${esc(formatMoney(sale.remise))}</td></tr>` : ''}
      <tr class="total"><td>TOTAL</td><td class="r">${esc(formatMoney(sale.total))}</td></tr>
      <tr><td class="muted">Paiement</td><td class="r">${esc(paymentLabel(sale))}</td></tr>
      ${sale.montant_credit != null ? `<tr><td class="muted">Acompte versé</td><td class="r">${esc(formatMoney(sale.acompte))}</td></tr><tr class="total"><td>Reste dû</td><td class="r">${esc(formatMoney(sale.montant_credit))}</td></tr>` : ''}
      ${sale.client ? `<tr><td class="muted">Client</td><td class="r">${esc(sale.client.nom)}</td></tr>` : ''}
      ${sale.vendeur ? `<tr><td class="muted">Vendeur</td><td class="r">${esc(sale.vendeur.nom)}</td></tr>` : ''}
    </table>
    <div class="sep"></div>
    <div class="c muted">Merci pour votre achat !</div>
  </body></html>`;
}

/** Partage du ticket en texte (feuille de partage du téléphone : WhatsApp, SMS…). */
export async function shareReceiptText(sale: Sale, store: Store | null) {
  await Share.share({ message: receiptText(sale, store), title: `Ticket ${sale.reference}` });
}

/** Génère le PDF du ticket et ouvre le partage (ou l'impression sur le web). */
export async function shareReceiptPdf(sale: Sale, store: Store | null) {
  const html = receiptHtml(sale, store);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, width: 302 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Ticket ${sale.reference}` });
  } else {
    await Print.printAsync({ uri });
  }
}

/** « Espèces » ou « À crédit » — libellé du mode de paiement d'une vente. */
export function paymentLabel(sale: Pick<Sale, 'mode_paiement'>): string {
  return sale.mode_paiement === 'credit' ? 'À crédit' : sale.mode_paiement === 'especes' ? 'Espèces' : sale.mode_paiement;
}
