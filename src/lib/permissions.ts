import type { StoreRoleName } from './types';

/**
 * Miroir côté client de StoreRole::templates() (backend). L'API reste la seule
 * source de vérité (403 sinon) : ceci sert uniquement à masquer les actions
 * qu'un rôle ne peut de toute façon pas effectuer.
 */
const catalogFull = ['categories', 'produits', 'services'].flatMap((m) => [`${m}.voir`, `${m}.creer`, `${m}.modifier`, `${m}.supprimer`]);
const catalogRead = ['categories.voir', 'produits.voir', 'services.voir'];
const customersFull = ['clients.voir', 'clients.creer', 'clients.modifier', 'clients.supprimer'];
const stockFull = ['stock.voir', 'stock.ajuster', 'stock.inventorier'];
const cashFull = ['caisse.voir', 'caisse.gerer', 'caisse.ouvrir', 'caisse.fermer', 'caisse.ajuster'];
const cashCashier = ['caisse.voir', 'caisse.ouvrir', 'caisse.fermer', 'caisse.ajuster'];
const salesFull = ['ventes.voir', 'ventes.creer'];

// rapports.voir : propriétaire, administrateur et gérant seulement (le bénéfice estimé révèle les prix d'achat).
const manager = [...catalogFull, 'produits.importer', ...customersFull, ...stockFull, ...cashFull, ...salesFull, 'rapports.voir', 'membres.voir'];

const ROLES: Record<StoreRoleName, string[]> = {
  proprietaire: [...manager, 'membres.gerer'],
  administrateur: [...manager, 'membres.gerer'],
  gerant: manager,
  caissier: ['membres.voir', ...catalogRead, 'clients.voir', 'stock.voir', ...cashCashier, ...salesFull],
  employe: ['membres.voir', ...catalogRead, 'clients.voir', 'stock.voir', 'caisse.voir', 'ventes.voir'],
};

export function roleCan(role: StoreRoleName | null | undefined, permission: string): boolean {
  if (!role) return false;
  return ROLES[role]?.includes(permission) ?? false;
}

export const ROLE_LABELS: Record<StoreRoleName, string> = {
  proprietaire: 'Propriétaire',
  administrateur: 'Administrateur',
  gerant: 'Gérant',
  caissier: 'Caissier',
  employe: 'Employé',
};
