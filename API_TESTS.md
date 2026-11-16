# EasyZakat — vérifications API

Base locale : `http://localhost:5000/api`

## 1. Santé du serveur

`GET /api/health` — doit retourner `{"status":"ok","service":"easyzakat-api"}`.

## 2. Créer et connecter un compte

`POST /auth/register`

```json
{
  "firstName": "Prenom",
  "lastName": "Nom",
  "email": "utilisateur@example.com",
  "phone": "770000000",
  "password": "MotDePasseSolide123"
}
```

Le compte public est créé avec le rôle `donor`. Pour préparer un administrateur, exécutez côté backend `node scripts/promote-admin.js utilisateur@example.com`.

`POST /auth/login`

```json
{ "email": "admin@example.com", "password": "MotDePasseSolide123" }
```

Conservez le `token` retourné et envoyez-le dans `Authorization: Bearer <token>` pour les routes protégées.

## 3. Contrôle des routes administrateur

Avec un token `admin` ou `superadmin` :

- `GET /admin/users`
- `GET /admin/donations`
- `GET /admin/campaigns`
- `GET /dashboard/admin`
- `GET /organizations`
- `GET /beneficiaries`
- `GET /distributions`
- `GET /payments/admin/recent`
- `GET /audits`
- `GET /settings`

Sans token ou avec un rôle non autorisé, ces routes doivent répondre 401 ou 403.

## 4. Calcul de Zakat

`POST /zakat/calculate` — public, avec ou sans token. Les valeurs `nisab` et `zakatRate` proviennent des paramètres serveur, pas du formulaire.

```json
{
  "cash": 500000,
  "bankBalance": 1000000,
  "savings": 500000,
  "gold": 0,
  "silver": 0,
  "tradeGoods": 0,
  "receivables": 0,
  "otherAssets": 0,
  "shortTermDebt": 100000,
  "immediateObligations": 50000
}
```

## 5. Flux de paiement

- `POST /donations` crée un don. Pour un don invité, fournir `guestInfo` ; la réponse contient un jeton temporaire.
- `POST /payments` crée un paiement `initiated` avec une référence interne. Un don invité doit transmettre `guestPaymentToken`.
- Le statut final n'est jamais défini par le navigateur. Le prestataire ou le serveur d'intégration doit appeler `POST /payments/webhook` avec l'en-tête `x-webhook-secret` égal à `PAYMENT_WEBHOOK_SECRET` et le corps :

```json
{
  "transactionReference": "REFERENCE_INTERNE_RETOURNEE_PAR_L_API",
  "providerReference": "REFERENCE_PRESTATAIRE",
  "status": "success"
}
```

Le webhook met à jour le don, les collectes de campagne et crée le reçu. Les vrais comptes et signatures Wave / Orange Money / Free Money / carte restent à configurer auprès des prestataires.

## 6. Workflow distribution

1. Créer et approuver une organisation.
2. Créer un bénéficiaire rattaché à cette organisation, puis l'approuver.
3. Créer une distribution avec montant et justificatif.
4. L'autoriser (`approved`).
5. La terminer (`completed`). Le backend vérifie les fonds et le justificatif, met à jour le montant reçu du bénéficiaire et journalise l'opération.
