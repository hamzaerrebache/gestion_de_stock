# Cahier des charges — Application de gestion de parapharmacie

## 1) Objectif
Concevoir une application web (évolutive vers mobile) pour piloter l’activité d’une parapharmacie :
- gestion des produits et du stock,
- encaissement des ventes (POS),
- facturation,
- suivi fournisseurs,
- reporting opérationnel et financier.

## 2) Périmètre fonctionnel

### 2.1 Module Produits
- CRUD produit (création, édition, suppression, consultation).
- Gestion des catégories (cosmétique, bébé, santé, hygiène, etc.).
- Gestion code-barres / SKU (unicité obligatoire).
- Prix d’achat, prix de vente et marge.
- TVA paramétrable par produit/catégorie.
- Date d’expiration + lot (suivi DLU/DLC).
- Images produit.
- Stock minimum par produit pour alertes.

### 2.2 Module Stock
- Entrées de stock (achats fournisseurs).
- Sorties de stock (ventes, pertes, casse).
- Transferts inter-stocks (multi-magasin).
- Historique des mouvements (audit complet).
- Alertes automatiques :
  - stock faible,
  - produit expiré,
  - produit proche expiration (fenêtre configurable, ex. 90 jours).
- Inventaire manuel avec ajustements commentés.

### 2.3 Module Facturation
- Génération de facture depuis vente.
- Numérotation automatique (séquence annuelle configurable).
- TVA et détails légaux.
- Export/téléchargement PDF.
- Facture client nominative (optionnelle).
- Historique et recherche multicritère.

### 2.4 Module Caisse (POS)
- Interface de vente rapide (scan, clavier, recherche produit).
- Scan code-barres (lecteur USB / caméra).
- Calcul automatique (sous-total, TVA, total).
- Paiements : espèces, carte, mixte.
- Gestion des remises (% ou montant).
- Impression ticket (imprimante thermique).

### 2.5 Module Fournisseurs
- CRUD fournisseur.
- Historique des commandes et réceptions.
- Gestion dettes fournisseurs.
- Suivi paiements fournisseurs.
- Indicateurs : délai moyen livraison, encours.

### 2.6 Module Clients (recommandé)
- Fiche client (nom, téléphone, email).
- Historique d’achat.
- Fidélité (points/remises).
- Ciblage marketing basique (optionnel).

### 2.7 Module Reporting & Statistiques
- CA journalier, hebdomadaire, mensuel.
- Produits les plus vendus.
- Bénéfice brut estimé.
- État des stocks (valorisation + ruptures).
- Alertes critiques (dashboard).
- Graphiques de synthèse.

### 2.8 Module Utilisateurs & Sécurité
- Authentification JWT.
- Rôles : Admin, Caissier, Gestionnaire.
- Permissions fines par module/action.
- Journal d’audit des actions sensibles.

### 2.9 Module Vente en ligne (phase évolutive)
- Catalogue web public.
- Panier et commande en ligne.
- Paiement en ligne (optionnel dans un premier temps).
- Suivi commande/livraison.

## 3) Fonctionnalités avancées (bonus)
- Multi-magasin.
- Synchronisation mobile.
- Scan code-barres via téléphone.
- Notifications (stock faible, expiration).
- Import Excel/CSV produits.
- API REST complète documentée (OpenAPI/Swagger).
- Mode hors ligne (PWA) pour la caisse.

## 4) Stack technique cible
- **Frontend** : Angular.
- **Backend** : ASP.NET Core (architecture propre, API REST).
- **Base de données** : SQL Server.
- **Authentification** : JWT + refresh token.
- **Mobile (optionnel)** : Ionic ou React Native.

## 5) Structure API (exemple)
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST /api/stock/movements`
- `GET/POST /api/invoices`
- `GET/POST /api/suppliers`
- `GET/POST /api/sales`
- `GET /api/dashboard`

## 6) Exigences non fonctionnelles
- Sécurité : chiffrement, validation serveur, protections OWASP de base.
- Performance : recherche produit < 300 ms sur catalogue moyen.
- Traçabilité : logs applicatifs + audit métier.
- Disponibilité : sauvegardes quotidiennes base SQL.
- Maintenabilité : architecture modulaire + tests automatiques.

## 7) MVP recommandé

### Phase 1 (priorité haute)
1. Produits
2. Stock
3. Caisse (POS)

### Phase 2
1. Facturation
2. Fournisseurs
3. Reporting de base

### Phase 3
1. Clients / fidélité
2. Vente en ligne
3. Fonctions avancées (multi-magasin, offline, mobile)

## 8) Critères d’acceptation (exemples)
- Un produit peut être vendu uniquement si stock disponible.
- Toute vente génère un mouvement de stock traçable.
- Toute facture possède un numéro unique.
- Les alertes de stock faible et d’expiration sont visibles sur dashboard.
- Les permissions empêchent un caissier d’accéder aux paramétrages admin.

## 9) Livrables attendus
- Code source frontend + backend.
- Script de création BD SQL Server.
- Documentation API (Swagger).
- Guide d’installation et d’exploitation.
- Jeu de données de démonstration.
