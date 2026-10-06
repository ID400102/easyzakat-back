============================================================
                    EASYZAKAT
                API-TEST / POSTMAN
============================================================

BASE URL
http://localhost:5000

IMPORTANT
- Route protégée : Authorization -> Bearer Token
- Remplacer ID_* par les vrais IDs MongoDB.
- Remplacer TON_TOKEN par le token JWT obtenu après Login.
- Pour JSON : Body -> raw -> JSON.


============================================================
1. AUTHENTIFICATION
============================================================

1.1 INSCRIPTION
POST http://localhost:5000/api/auth/register
Authorization : Aucune

Body :
{
  "firstName": "Hawa",
  "lastName": "Sow",
  "email": "hawa@example.com",
  "phone": "771234567",
  "password": "123456"
}

1.2 CONNEXION
POST http://localhost:5000/api/auth/login
Authorization : Aucune

Body :
{
  "email": "hawa@example.com",
  "password": "123456"
}

Le Login fournit le token JWT à utiliser dans les routes protégées.


============================================================
2. ADMIN / UTILISATEURS
============================================================

BASE : http://localhost:5000/api/admin

GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/ID_USER
PUT    /api/admin/users/ID_USER
DELETE /api/admin/users/ID_USER

Authorization : Bearer TON_TOKEN_ADMIN

IMPORTANT : utiliser exactement /api/admin, pas /api/api/admin.


============================================================
3. CALCULATEUR ZAKAT
============================================================

Les noms exacts des routes dépendent de ton fichier zakatRoutes.js actuel.
Utiliser ici les routes déjà présentes dans ton projet.

Exemple de test si cette route existe :
POST http://localhost:5000/api/zakat/calculate
Authorization : Bearer TON_TOKEN

Body exemple :
{
  "cash": 500000,
  "gold": 100000,
  "silver": 0,
  "investments": 0,
  "debts": 0
}

Exemples de routes précédemment utilisées :
GET http://localhost:5000/api/zakat/my-calculations
GET http://localhost:5000/api/zakat/ID_CALCUL


============================================================
4. CAMPAGNES
============================================================

Les routes exactes dépendent de ton campaignRoutes.js actuel.

Routes prévues/utilisées :
GET    http://localhost:5000/api/campaigns
GET    http://localhost:5000/api/campaigns/ID_CAMPAIGN
POST   http://localhost:5000/api/campaigns
PUT    http://localhost:5000/api/campaigns/ID_CAMPAIGN
DELETE http://localhost:5000/api/campaigns/ID_CAMPAIGN

Création - Body exemple :
{
  "name": "Campagne Solidarité Ramadan",
  "organization": "ID_ORGANIZATION",
  "category": "ramadan",
  "description": "Aide aux familles vulnérables",
  "objective": 1000000,
  "startDate": "2026-10-01",
  "endDate": "2026-11-01",
  "location": "Dakar"
}

IMPORTANT :
- organization = ObjectId MongoDB réel
- objective = nombre
- catégories utilisées dans le modèle :
  zakat, sadaqa, ramadan, urgence_sociale


============================================================
5. DONATIONS
============================================================

Les routes exactes dépendent de ton donationRoutes.js actuel.

Routes prévues/utilisées :
POST http://localhost:5000/api/donations
GET  http://localhost:5000/api/donations
GET  http://localhost:5000/api/donations/my-donations
GET  http://localhost:5000/api/donations/ID_DON
PUT  http://localhost:5000/api/donations/ID_DON

Création - Body exemple :
{
  "type": "sadaqa",
  "amount": 25000,
  "anonymous": false,
  "paymentMethod": "wave",
  "campaign": null
}

Type : zakat | sadaqa | ramadan | urgence_sociale
Payment method : wave | orange_money | free_money | card | bank_transfer


============================================================
6. PAIEMENTS
============================================================

BASE : http://localhost:5000/api/payments

6.1 CREER UN PAIEMENT
POST http://localhost:5000/api/payments
Authorization : Bearer TON_TOKEN

Body :
{
  "donation": "ID_DON",
  "provider": "wave",
  "fees": 0
}

Le backend génère automatiquement une référence interne :
EZ-PAY-AAAAMMJJ-XXXXXXXX

6.2 MES PAIEMENTS
GET http://localhost:5000/api/payments/my-payments
Authorization : Bearer TON_TOKEN

6.3 UN PAIEMENT
GET http://localhost:5000/api/payments/ID_PAYMENT
Authorization : Bearer TON_TOKEN

6.4 MODIFIER LE STATUT
PUT http://localhost:5000/api/payments/ID_PAYMENT/status
Authorization : Bearer TON_TOKEN

Body exemple :
{
  "status": "pending"
}

Statuts : initiated | pending | success | failed

6.5 WEBHOOK
POST http://localhost:5000/api/payments/webhook
Authorization : Aucune

Body pending :
{
  "transactionReference": "EZ-PAY-AAAAMMJJ-XXXXXXXX",
  "providerReference": "WAVE-TEST-001",
  "status": "pending"
}

Body success :
{
  "transactionReference": "EZ-PAY-AAAAMMJJ-XXXXXXXX",
  "providerReference": "WAVE-TEST-001",
  "status": "success"
}

Body failed :
{
  "transactionReference": "EZ-PAY-AAAAMMJJ-XXXXXXXX",
  "providerReference": "WAVE-TEST-001",
  "status": "failed"
}

IMPORTANT : la route webhook ne demande pas de Bearer Token.


============================================================
7. RECUS
============================================================

BASE : http://localhost:5000/api/receipts

7.1 CREER UN RECU
POST http://localhost:5000/api/receipts
Authorization : Bearer TON_TOKEN

Body :
{
  "paymentId": "ID_PAYMENT"
}

IMPORTANT : le paiement doit être en status = success.
Le backend génère un numéro de reçu : EZ-REC-AAAAMMJJ-XXXXXXXX

7.2 MES RECUS
GET http://localhost:5000/api/receipts/my-receipts
Authorization : Bearer TON_TOKEN

7.3 UN RECU
GET http://localhost:5000/api/receipts/ID_RECEIPT
Authorization : Bearer TON_TOKEN


============================================================
8. ORGANISATIONS
============================================================

BASE : http://localhost:5000/api/organizations

8.1 CREER
POST http://localhost:5000/api/organizations
Authorization : Bearer TON_TOKEN

Body :
{
  "name": "Association Solidarité Sénégal",
  "description": "Association d'aide aux personnes vulnérables",
  "email": "solidarite@example.com",
  "phone": "771234567",
  "address": "Dakar",
  "city": "Dakar",
  "country": "Sénégal",
  "type": "association"
}

8.2 LISTER
GET http://localhost:5000/api/organizations
Authorization : Aucune

8.3 MON ORGANISATION
GET http://localhost:5000/api/organizations/my-organization
Authorization : Bearer TON_TOKEN

8.4 UNE ORGANISATION
GET http://localhost:5000/api/organizations/ID_ORGANIZATION
Authorization : Aucune

8.5 MODIFIER
PUT http://localhost:5000/api/organizations/ID_ORGANIZATION
Authorization : Bearer TON_TOKEN

Body exemple :
{
  "phone": "778889999",
  "city": "Dakar"
}

8.6 DESACTIVER
DELETE http://localhost:5000/api/organizations/ID_ORGANIZATION
Authorization : Bearer TON_TOKEN

8.7 VALIDATION ADMIN
PUT http://localhost:5000/api/organizations/ID_ORGANIZATION/status
Authorization : Bearer TON_TOKEN_ADMIN

Body :
{
  "status": "approved"
}

Statuts : pending | approved | rejected | suspended


============================================================
9. BENEFICIAIRES
============================================================

BASE : http://localhost:5000/api/beneficiaries

9.1 CREER
POST http://localhost:5000/api/beneficiaries
Authorization : Bearer TON_TOKEN

Body exemple :
{
  "firstName": "Aminata",
  "lastName": "Ndiaye",
  "phone": "778889999",
  "email": "aminata@example.com",
  "address": "Pikine",
  "city": "Dakar",
  "country": "Sénégal",
  "category": "famille",
  "description": "Famille en situation difficile",
  "amountNeeded": 100000,
  "organization": "ID_ORGANIZATION"
}

9.2 LISTER
GET http://localhost:5000/api/beneficiaries
Authorization : Aucune

9.3 UN BENEFICIAIRE
GET http://localhost:5000/api/beneficiaries/ID_BENEFICIARY
Authorization : Aucune

9.4 MODIFIER
PUT http://localhost:5000/api/beneficiaries/ID_BENEFICIARY
Authorization : Bearer TON_TOKEN

9.5 VALIDATION ADMIN
PUT http://localhost:5000/api/beneficiaries/ID_BENEFICIARY/status
Authorization : Bearer TON_TOKEN_ADMIN

Body :
{
  "status": "approved"
}

Statuts : pending | approved | rejected | completed

9.6 DESACTIVER
DELETE http://localhost:5000/api/beneficiaries/ID_BENEFICIARY
Authorization : Bearer TON_TOKEN

Catégories :
famille | orphelin | personne_agee | personne_handicapee |
etudiant | malade | urgence_sociale | autre


============================================================
10. DISTRIBUTIONS
============================================================

BASE : http://localhost:5000/api/distributions

10.1 CREER
POST http://localhost:5000/api/distributions
Authorization : Bearer TON_TOKEN

Body exemple :
{
  "beneficiary": "ID_BENEFICIARY",
  "organization": "ID_ORGANIZATION",
  "amount": 50000,
  "donationType": "zakat",
  "reason": "Aide financière pour les besoins essentiels"
}

Statut initial : pending

10.2 LISTER
GET http://localhost:5000/api/distributions
Authorization : Aucune

10.3 UNE DISTRIBUTION
GET http://localhost:5000/api/distributions/ID_DISTRIBUTION
Authorization : Aucune

10.4 STATUT ADMIN
PUT http://localhost:5000/api/distributions/ID_DISTRIBUTION/status
Authorization : Bearer TON_TOKEN_ADMIN

Body approbation :
{
  "status": "approved"
}

Puis pour terminer :
{
  "status": "completed"
}

Lorsque le statut passe à completed :
- distributedAt est renseigné
- amountReceived du bénéficiaire est augmenté

10.5 ANNULER
DELETE http://localhost:5000/api/distributions/ID_DISTRIBUTION
Authorization : Bearer TON_TOKEN_ADMIN


============================================================
11. DASHBOARD DONNEUR
============================================================

GET http://localhost:5000/api/dashboard/donor
Authorization : Bearer TON_TOKEN

Retourne notamment :
- totalDonated
- donationsCount
- successfulDonationsCount
- paymentsCount
- successfulPaymentsCount
- pendingPaymentsCount
- receiptsCount
- recentDonations
- recentPayments
- recentReceipts


============================================================
12. DASHBOARD ADMIN
============================================================

GET http://localhost:5000/api/dashboard/admin
Authorization : Bearer TON_TOKEN_ADMIN

Retourne notamment :
- totalDonated
- donationsCount
- totalPayments
- successfulPaymentsCount
- pendingPayments
- failedPayments
- organizationsCount
- approvedOrganizations
- pendingOrganizations
- beneficiariesCount
- approvedBeneficiaries
- pendingBeneficiaries
- distributionsCount
- totalDistributed
- pendingDistributions
- receiptsCount


============================================================
13. TRANSPARENCE / IMPACT
============================================================

GET http://localhost:5000/api/impact
Authorization : Aucune

Retourne notamment :
- totalCollected
- totalDistributed
- distributionPercentage
- beneficiariesHelped
- beneficiariesCount
- organizationsCount
- campaignsCount
- activeCampaignsCount
- distributionsCount


============================================================
14. AUDIT
============================================================

BASE : http://localhost:5000/api/audits

14.1 TOUS LES AUDITS
GET http://localhost:5000/api/audits
Authorization : Bearer TON_TOKEN_ADMIN

14.2 UN AUDIT
GET http://localhost:5000/api/audits/ID_AUDIT
Authorization : Bearer TON_TOKEN_ADMIN

Actions suivies/ prévues :
- ORGANIZATION_STATUS_UPDATED
- PAYMENT_STATUS_UPDATED
- RECEIPT_CREATED
- BENEFICIARY_STATUS_UPDATED
- DISTRIBUTION_STATUS_UPDATED


============================================================
15. IDS DE TEST UTILISES
============================================================

ORGANIZATION
6ac5200243d7abb20b59994c

BENEFICIARY
6ac52565c6324657c54cdd0f

DISTRIBUTION
6ac5289e5d22fe2494fba52f

PAYMENT
6ac50e5de10aa0625487afcb

DONATION
6aafcea6d4b469708ef3ece8

USER
6aad10a138c07f212b324dd9

PAYMENT REFERENCE
EZ-PAY-20261006-530C4087

PROVIDER REFERENCE
WAVE-TEST-001


============================================================
16. ORDRE RECOMMANDE DES TESTS
============================================================

1  Register
2  Login
3  Calcul Zakat
4  Campaign
5  Donation
6  Payment
7  Webhook pending
8  Webhook success
9  Receipt
10 Organization
11 Approve Organization
12 Beneficiary
13 Approve Beneficiary
14 Distribution
15 Approve Distribution
16 Complete Distribution
17 Dashboard Donor
18 Dashboard Admin
19 Impact
20 Audit


============================================================
17. URLS A NE PAS CONFONDRE
============================================================

CORRECT :
http://localhost:5000/api/admin/users

INCORRECT :
http://localhost:5000/api/api/admin/users

CORRECT :
http://localhost:5000/api/payments/webhook

INCORRECT :
http://localhost:5000/api/api/payments/webhook

CORRECT :
http://localhost:5000/api/receipts
http://localhost:5000/api/organizations
http://localhost:5000/api/beneficiaries
http://localhost:5000/api/distributions
http://localhost:5000/api/dashboard/donor
http://localhost:5000/api/dashboard/admin
http://localhost:5000/api/impact
http://localhost:5000/api/audits


============================================================
18. ETAT DU BACKEND
============================================================

[OK] Authentification / utilisateurs
[OK] Calculateur Zakat
[OK] Campagnes
[OK] Donations
[OK] Paiements
[OK] Webhook
[OK] Référence transaction
[OK] Reçus
[OK] Organisations
[OK] Validation organisations
[OK] Bénéficiaires
[OK] Validation bénéficiaires
[OK] Distributions
[OK] Dashboard donneur
[OK] Dashboard administrateur
[OK] Transparence / Impact
[OK] Audit


============================================================
                         FIN
============================================================
