// Formes des ressources renvoyées par l'API (voir backend/app/Modules/*/Http/Resources).
// Les montants et quantités décimaux arrivent en chaînes ("600.00").

export type Decimal = string | number;

export type User = {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  statut: string;
  cree_le: string;
};

export type Business = {
  id: number;
  nom: string;
  raison_sociale: string | null;
  pays: string | null;
  devise: string | null;
  statut: string;
};

export type StoreRoleName = 'proprietaire' | 'administrateur' | 'gerant' | 'caissier' | 'employe';

export type Store = {
  id: number;
  entreprise_id: number;
  domaine_activite?: { slug: string; nom: string };
  nom: string;
  slug: string;
  adresse: string | null;
  telephone: string | null;
  devise: string | null;
  statut: string;
  mon_role?: StoreRoleName | null;
};

export type BusinessDomain = { id: number; slug: string; nom: string; description: string | null };

export type Category = {
  id: number;
  nom: string;
  slug: string;
  description: string | null;
  actif: boolean;
};

export type ProductUnit = 'piece' | 'kg' | 'g' | 'litre' | 'ml' | 'boite' | 'paquet';

export type Product = {
  id: number;
  categorie: Category | null;
  nom: string;
  slug: string;
  description: string | null;
  /** Photo optionnelle (null si aucune). */
  image_url: string | null;
  sku: string | null;
  code_barres: string | null;
  unite: ProductUnit;
  prix_achat: Decimal | null;
  vente_detail_active: boolean;
  prix_detail: Decimal | null;
  vente_gros_active: boolean;
  prix_gros: Decimal | null;
  actif: boolean;
};

export type Service = {
  id: number;
  categorie: Category | null;
  nom: string;
  description: string | null;
  prix: Decimal;
  duree_minutes: number | null;
  actif: boolean;
};

export type Stock = {
  produit: Product;
  quantite: Decimal;
  quantite_minimum: Decimal | null;
  stock_faible: boolean;
  cree_le: string | null;
};

export type StockMovementType =
  | 'initial'
  | 'achat'
  | 'vente'
  | 'retour'
  | 'ajustement_entree'
  | 'ajustement_sortie'
  | 'inventaire'
  | 'perte';

export type StockMovement = {
  id: number;
  type: StockMovementType;
  quantite: Decimal;
  quantite_avant: Decimal;
  quantite_apres: Decimal;
  motif: string | null;
  cree_par?: { id: number; nom: string } | null;
  cree_le: string;
};

export type Customer = {
  id: number;
  nom: string;
  telephone: string | null;
  email: string | null;
  nom_entreprise: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
};

export type CashRegister = {
  id: number;
  nom: string;
  code: string | null;
  actif: boolean;
  est_ouverte: boolean;
};

export type CashSession = {
  id: number;
  statut: 'ouverte' | 'fermee';
  montant_ouverture: Decimal;
  solde_courant: Decimal | null;
  montant_fermeture_attendu: Decimal | null;
  montant_fermeture_reel: Decimal | null;
  ecart: Decimal | null;
  note_fermeture: string | null;
  ouverte_par?: { id: number; nom: string } | null;
  fermee_par?: { id: number; nom: string } | null;
  ouverte_le: string;
  fermee_le: string | null;
};

export type CashMovementType = 'ouverture' | 'entree' | 'sortie' | 'ajustement' | 'vente' | 'remboursement';

export type CashMovement = {
  id: number;
  type: CashMovementType;
  montant: Decimal;
  solde_avant: Decimal;
  solde_apres: Decimal;
  motif: string | null;
  cree_par?: { id: number; nom: string } | null;
  cree_le: string;
};

export type PricingMode = 'detail' | 'gros';

export type SaleLine = {
  produit_id: number;
  nom_produit: string;
  mode_prix: PricingMode;
  quantite: Decimal;
  prix_unitaire: Decimal;
  total: Decimal;
};

export type Sale = {
  id: number;
  reference: string;
  client?: Customer | null;
  vendeur?: { id: number; nom: string } | null;
  lignes?: SaleLine[];
  sous_total: Decimal;
  remise: Decimal;
  total: Decimal;
  mode_paiement: string;
  statut: 'terminee' | 'annulee';
  vendue_le: string;
};

export type StoreMember = {
  id: number;
  statut: string;
  utilisateur: User;
  roles: string[];
  rejoint_le: string | null;
};

export type ImportReport = {
  total_lignes: number;
  importes: number;
  rejetes: number;
  erreurs: { ligne: number; erreurs: Record<string, string[]> }[];
};
