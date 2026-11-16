# EasyZakat API

API Node.js / Express / MongoDB pour la plateforme EasyZakat.

## Prérequis

- Node.js 20.19+ (Node 22 recommandé)
- MongoDB Atlas ou MongoDB local

## Installation locale

```bash
npm install
cp .env.example .env
```

Renseignez `MONGO_URI`, `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET` et `CORS_ORIGIN` dans `.env`. Ne partagez jamais ce fichier et ne le commitez pas.

Démarrer l'API :

```bash
npm run dev
```

L'API écoute sur `http://localhost:5000`. Vérification : `GET /api/health`.

## Compte administrateur

1. Créez d'abord un compte depuis l'écran d'inscription.
2. Promouvez ce compte depuis le dossier backend :

```bash
node scripts/promote-admin.js votre-email@example.com
```

L'inscription publique crée toujours un compte `donor`. Le rôle administrateur n'est jamais accepté depuis le formulaire public.

## Variables d'environnement

| Variable | Utilité |
|---|---|
| `PORT` | Port HTTP (5000 par défaut) |
| `MONGO_URI` | URI MongoDB |
| `JWT_SECRET` | Signature des tokens JWT |
| `PAYMENT_WEBHOOK_SECRET` | Secret partagé pour le webhook de paiement (`x-webhook-secret`) |
| `CORS_ORIGIN` | Origines frontend autorisées, séparées par des virgules |

## Routes principales

- `/api/auth` : inscription et connexion
- `/api/campaigns` : lecture publique des campagnes actives
- `/api/admin` : utilisateurs, dons et CRUD administratif des campagnes
- `/api/organizations` : organisations
- `/api/beneficiaries` : bénéficiaires
- `/api/distributions` : distributions et workflow d'autorisation
- `/api/payments` : initiation, historique, liste admin et webhook sécurisé
- `/api/dashboard` : statistiques publiques, donateur et administrateur
- `/api/impact` : statistiques publiques d'impact
- `/api/audits` : journal d'audit administrateur
- `/api/settings` : paramètres administrables (Nisab et taux)
- `/api/receipts` : génération idempotente d'un reçu après paiement confirmé

## Paiements

L'API crée une référence interne et conserve le paiement à l'état `initiated`. Elle ne déclare jamais un paiement réussi depuis le navigateur. Le statut final doit provenir du webhook serveur `POST /api/payments/webhook` avec l'en-tête `x-webhook-secret` configuré. Les identifiants et contrats d'intégration Wave, Orange Money, Free Money ou carte bancaire doivent être fournis par les prestataires avant une mise en production réelle.

## Notes de sécurité

- Les routes d'administration exigent un JWT et un rôle `admin` ou `superadmin`.
- Les mots de passe sont hashés avec bcrypt.
- Les statuts de dons et de paiements ne peuvent pas être forcés par un utilisateur depuis l'interface.
- Les distributions suivent le flux attente → autorisée → réalisée, avec preuve requise avant clôture.
- Les opérations administratives importantes sont journalisées.
