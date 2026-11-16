
const mongoose = require("mongoose");
const Distribution = require("../models/Distribution");
const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const createAudit = require("../utils/createAudit");

class ControllerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const getDistributions = async (req, res) => {
  try {
    const distributions = await Distribution.find()
      .populate("beneficiary", "firstName lastName category amountNeeded amountReceived amountReserved status")
      .populate("organization", "name status")
      .populate("campaign", "name")
      .populate("createdBy", "firstName lastName")
      .populate("validatedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json({ count: distributions.length, distributions });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des distributions.",
      error: error.message
    });
  }
};

const createDistribution = async (req, res) => {
  try {
    const {
      beneficiary,
      organization,
      campaign = null,
      amount,
      donationType = "sadaqa",
      reason = "",
      method = "cash",
      proofUrl = ""
    } = req.body;

    if (
      !beneficiary ||
      !organization ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Bénéficiaire, organisation et montant positif sont obligatoires."
      });
    }

    const [b, o, collected] = await Promise.all([
      Beneficiary.findById(beneficiary),
      Organization.findById(organization),
      Donation.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    if (!b || !b.isActive || b.status !== "approved") {
      return res.status(400).json({
        message: "Le bénéficiaire doit être approuvé et actif."
      });
    }

    if (!o || !o.isActive || o.status !== "approved") {
      return res.status(400).json({
        message: "L'organisation doit être approuvée et active."
      });
    }

    if (String(b.organization) !== String(o._id)) {
      return res.status(400).json({
        message: "L'organisation ne correspond pas au dossier du bénéficiaire."
      });
    }

    if (campaign) {
      const linkedCampaign = await Campaign.findById(campaign);

      if (!linkedCampaign || linkedCampaign.status !== "active") {
        return res.status(400).json({
          message: "La campagne associée doit être active."
        });
      }
    }

    const totalCollected = collected[0]?.total || 0;

    const allocated = await Distribution.aggregate([
      { $match: { status: { $in: ["approved", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const available = totalCollected - (allocated[0]?.total || 0);

    if (Number(amount) > available) {
      return res.status(400).json({
        message: "Fonds insuffisants pour cette distribution.",
        availableFunds: Math.max(available, 0)
      });
    }

    const distribution = await Distribution.create({
      beneficiary,
      organization,
      campaign,
      amount: Number(amount),
      donationType,
      reason,
      method,
      proofUrl,
      createdBy: req.user.id,
      status: "pending"
    });

    await createAudit({
      action: "DISTRIBUTION_CREATED",
      entityType: "Distribution",
      entityId: distribution._id,
      user: req.user.id,
      details: {
        amount: distribution.amount,
        status: distribution.status
      },
      ip: req.ip
    });

    res.status(201).json({
      message: "Distribution enregistrée en attente d'autorisation.",
      distribution
    });
  } catch (error) {
    res.status(400).json({
      message: "Création de la distribution impossible.",
      error: error.message
    });
  }
};

const updateDistributionStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const next = req.body.status;

    if (!["approved", "completed", "cancelled"].includes(next)) {
      throw new ControllerError("Statut de distribution invalide.");
    }

    let result;
    let auditDetails;

    await session.withTransaction(async () => {
      const distribution = await Distribution.findById(req.params.id).session(session);

      if (!distribution) {
        throw new ControllerError("Distribution introuvable.", 404);
      }

      const oldStatus = distribution.status;

      if (oldStatus === "completed" || oldStatus === "cancelled") {
        throw new ControllerError("Cette distribution est déjà clôturée.", 409);
      }

      if (next === "approved" && oldStatus !== "pending") {
        throw new ControllerError(
          "Seule une distribution en attente peut être autorisée.",
          409
        );
      }

      if (next === "completed" && oldStatus !== "approved") {
        throw new ControllerError(
          "La distribution doit être autorisée avant sa réalisation.",
          409
        );
      }

      const beneficiary = await Beneficiary.findById(
        distribution.beneficiary
      ).session(session);

      if (!beneficiary) {
        throw new ControllerError("Bénéficiaire introuvable.", 404);
      }

      // Les réservations sont recalculées depuis les distributions
      // existantes afin de prendre en compte les anciennes données.
      if (next === "approved") {
        const approvedRows = await Distribution.aggregate([
          {
            $match: {
              beneficiary: beneficiary._id,
              status: "approved"
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]).session(session);

        const existingReserved = approvedRows[0]?.total || 0;

        const alreadyReceived = Number(beneficiary.amountReceived || 0);
        const totalCommitted =
          alreadyReceived + existingReserved + distribution.amount;

        if (totalCommitted > beneficiary.amountNeeded) {
          throw new ControllerError(
            "Le besoin du bénéficiaire est déjà dépassé ou insuffisant pour cette réservation. Vérifiez ses anciennes distributions.",
            400
          );
        }

        const [collected, allocated] = await Promise.all([
          Donation.aggregate([
            { $match: { status: "success" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ]).session(session),

          Distribution.aggregate([
            {
              $match: {
                status: { $in: ["approved", "completed"] },
                _id: { $ne: distribution._id }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" }
              }
            }
          ]).session(session)
        ]);

        const totalCollected = collected[0]?.total || 0;
        const totalAllocated = allocated[0]?.total || 0;
        const available = totalCollected - totalAllocated;

        if (distribution.amount > available) {
          throw new ControllerError(
            "Fonds disponibles insuffisants pour autoriser cette distribution.",
            400
          );
        }

        beneficiary.amountReserved = existingReserved + distribution.amount;
        await beneficiary.save({ session });
      }

      if (next === "completed") {
        if (!distribution.proofUrl?.trim()) {
          throw new ControllerError(
            "Ajoutez un justificatif avant de valider la réalisation."
          );
        }

        const approvedRows = await Distribution.aggregate([
          {
            $match: {
              beneficiary: beneficiary._id,
              status: "approved"
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]).session(session);

        const totalApproved = approvedRows[0]?.total || 0;
        const received = Number(beneficiary.amountReceived || 0);

        if (received + distribution.amount > beneficiary.amountNeeded) {
          throw new ControllerError(
            "Le montant dépasse le besoin restant du bénéficiaire."
          );
        }

        beneficiary.amountReceived = received + distribution.amount;
        beneficiary.amountReserved = Math.max(
          0,
          totalApproved - distribution.amount
        );

        if (
          beneficiary.amountReceived >= beneficiary.amountNeeded &&
          beneficiary.amountReserved === 0
        ) {
          beneficiary.status = "completed";
        }

        await beneficiary.save({ session });

        distribution.distributedAt = new Date();
        distribution.validatedAt = new Date();
        distribution.validatedBy = req.user.id;
      }

      if (next === "cancelled" && oldStatus === "approved") {
        const approvedRows = await Distribution.aggregate([
          {
            $match: {
              beneficiary: beneficiary._id,
              status: "approved",
              _id: { $ne: distribution._id }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]).session(session);

        beneficiary.amountReserved = approvedRows[0]?.total || 0;
        await beneficiary.save({ session });
      }

      distribution.status = next;
      await distribution.save({ session });

      auditDetails = {
        oldStatus,
        newStatus: next,
        amount: distribution.amount
      };

      result = distribution;
    });

    await createAudit({
      action: "DISTRIBUTION_STATUS_UPDATED",
      entityType: "Distribution",
      entityId: result._id,
      user: req.user.id,
      details: auditDetails,
      ip: req.ip
    });

    res.json({
      message: "Statut de la distribution mis à jour.",
      distribution: result
    });
  } catch (error) {
    res.status(error.status || 400).json({
      message: "Mise à jour de la distribution impossible.",
      error: error.message
    });
  } finally {
    await session.endSession();
  }
};

const deleteDistribution = async (req, res) => {
  try {
    req.body.status = "cancelled";
    return await updateDistributionStatus(req, res);
  } catch (error) {
    res.status(400).json({
      message: "Annulation impossible.",
      error: error.message
    });
  }
};

module.exports = {
  getDistributions,
  createDistribution,
  updateDistributionStatus,
  deleteDistribution
};
