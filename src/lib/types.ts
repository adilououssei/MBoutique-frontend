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
  type: 'produit' | 'service';
  produit_id: number | null;
  service_id: number | null;
  /** Libellé figé au moment de la vente (produit ou service). */
  nom_produit: string;
  mode_prix: PricingMode | null;
  quantite: Decimal;
  prix_unitaire: Decimal;
  /** Remise sur la ligne (montant). */
  remise: Decimal;
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
  annulation: { le: string; motif: string; par?: { id: number; nom: string } | null } | null;
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

// --- Rapports (GET /boutiques/{id}/rapports/tableau-de-bord) ---

export type ReportPeriod = 'aujourdhui' | '7_jours' | '30_jours' | 'ce_mois';

export type ReportPoint = { cle: string; libelle: string; chiffre_affaires: Decimal; nombre_ventes: number };

export type DashboardReport = {
  periode: { code: ReportPeriod; libelle: string; du: string; au: string; fuseau_horaire: string };
  resume: {
    chiffre_affaires: Decimal;
    nombre_ventes: number;
    panier_moyen: Decimal;
    articles_vendus: Decimal;
    remises: Decimal;
    /** null si aucun produit vendu n'a de prix d'achat. */
    benefice_estime: Decimal | null;
    produits_sans_prix_achat: number;
  };
  periode_precedente: { du: string; au: string; chiffre_affaires: Decimal; nombre_ventes: number; articles_vendus: Decimal };
  /** Variation en % par rapport à la période précédente ; null si elle valait 0. */
  evolution: { chiffre_affaires: number | null; nombre_ventes: number | null; articles_vendus: number | null; panier_moyen: number | null };
  courbe: { granularite: 'heure' | 'jour'; points: ReportPoint[] };
  meilleurs_produits: { produit_id: number; nom: string; quantite: Decimal; chiffre_affaires: Decimal }[];
  modes_paiement: { mode: string; montant: Decimal; nombre_ventes: number }[];
};

export type Supplier = {
  id: number;
  nom: string;
  nom_contact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  actif: boolean;
  total_achats?: Decimal;
  /** Reste dû au fournisseur (somme des achats − somme réglée). */
  solde_du?: Decimal;
};

export type PurchasePaymentStatus = 'paye' | 'partiel' | 'non_paye';

export type Purchase = {
  id: number;
  reference: string;
  fournisseur?: { id: number; nom: string } | null;
  montant_total: Decimal;
  montant_paye: Decimal;
  reste_a_payer: Decimal;
  statut_paiement: PurchasePaymentStatus;
  note: string | null;
  achete_le: string;
  cree_par?: { id: number; nom: string } | null;
  lignes?: { produit_id: number; nom_produit: string; quantite: Decimal; cout_unitaire: Decimal; total: Decimal }[];
  paiements?: { id: number; montant: Decimal; mode: 'caisse' | 'externe'; note: string | null; paye_le: string; cree_par: { id: number; nom: string } | null }[];
};
