import type { IconName } from '@/components/ui/elements';

import type { OrderStatus, OrderType } from './types';

export const ORDER_TYPES: Record<OrderType, { label: string; icon: IconName }> = {
  sur_place: { label: 'Sur place', icon: 'restaurant' },
  a_emporter: { label: 'À emporter', icon: 'bag-handle' },
  livraison: { label: 'Livraison', icon: 'bicycle' },
  depot: { label: 'Dépôt', icon: 'shirt' },
};

type Tone = 'primary' | 'success' | 'neutral' | 'danger' | 'warning';

/** Libellé d'un statut — « servie » se dit différemment selon le type de commande. */
export function statusLabel(status: OrderStatus, type: OrderType): { label: string; tone: Tone } {
  switch (status) {
    case 'en_attente':
      return { label: 'En attente', tone: 'warning' };
    case 'en_preparation':
      return { label: type === 'depot' ? 'En cours' : 'En préparation', tone: 'primary' };
    case 'prete':
      return { label: type === 'depot' ? 'Prête à retirer' : 'Prête', tone: 'success' };
    case 'servie':
      return { label: type === 'sur_place' ? 'Servie' : type === 'livraison' ? 'Livrée' : 'Remise', tone: 'neutral' };
    case 'payee':
      return { label: 'Encaissée', tone: 'success' };
    case 'annulee':
      return { label: 'Annulée', tone: 'danger' };
  }
}

/** Étape suivante proposée dans le suivi (null : plus que l'encaissement). */
export function nextStep(status: OrderStatus, type: OrderType): { status: OrderStatus; label: string } | null {
  if (status === 'en_attente') return { status: 'en_preparation', label: type === 'depot' ? 'Commencer le travail' : 'Lancer la préparation' };
  if (status === 'en_preparation') return { status: 'prete', label: type === 'depot' ? 'Marquer prête à retirer' : 'Marquer prête' };
  if (status === 'prete') return { status: 'servie', label: type === 'sur_place' ? 'Marquer servie' : type === 'livraison' ? 'Marquer livrée' : 'Remise au client' };
  return null;
}

export const isOpen = (status: OrderStatus) => status !== 'payee' && status !== 'annulee';
