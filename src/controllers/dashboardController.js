// src/controllers/dashboardController.js
const { Skeet, Reply } = require("../models");
const { getReactions, getReplies } = require("../services/blueskyClient");

// GET /api/skeets
async function getSkeets(req, res) {
  try {
    const skeets = await Skeet.findAll({
      order: [
        ["scheduledAt", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json(skeets);
  } catch (error) {
    console.error("Fehler beim Laden der Skeets:", error);
    res.status(500).json({ error: "Fehler beim Laden der Skeets." });
  }
}

// GET /api/reactions/:skeetId
async function getReactionsController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) return res.status(404).json({ error: "Skeet nicht gefunden." });

    if (!skeet.postUri) {
      return res.status(400).json({ error: "Für diesen Skeet liegt keine postUri vor." });
    }

    const reactions = await getReactions(skeet.postUri);

    await skeet.update({
      likesCount: reactions.likes.length,
      repostsCount: reactions.reposts.length,
    });

    res.json({
      likes: reactions.likes.length,
      reposts: reactions.reposts.length,
    });
  } catch (error) {
    console.error("Fehler beim Laden der Reaktionen:", error);
    res.status(500).json({ error: "Fehler beim Laden der Reaktionen." });
  }
}

// GET /api/replies/:skeetId
async function getRepliesController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) return res.status(404).json({ error: "Skeet nicht gefunden." });

    if (!skeet.postUri) {
      return res.status(400).json({ error: "Für diesen Skeet liegt keine postUri vor." });
    }

    const repliesData = await getReplies(skeet.postUri);
    const replies = repliesData?.replies || [];

    // Atomar: alte Replies weg, neue speichern
    await Reply.sequelize.transaction(async (t) => {
      await Reply.destroy({ where: { skeetId: skeet.id }, transaction: t });
      if (replies.length > 0) {
        await Reply.bulkCreate(
          replies.map((r) => ({
            skeetId: skeet.id,
            authorHandle: r.author.handle,
            content: r.text,
            createdAt: new Date(r.indexedAt), // überschreibt timestamps, ist ok
          })),
          { transaction: t }
        );
      }
    });

    res.json(replies);
  } catch (error) {
    console.error("Fehler beim Laden der Replies:", error);
    res.status(500).json({ error: "Fehler beim Laden der Replies." });
  }
}

// POST /api/skeets
async function createSkeet(req, res) {
  try {
    const {
      content,
      scheduledAt,
      repeat = "none",
      repeatDayOfWeek = null,
      repeatDayOfMonth = null,
      threadId = null,
      isThreadPost = false,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content ist erforderlich." });
    }

    // Datum nur prüfen, wenn es übergeben wurde
    let scheduled = null;
    if (scheduledAt != null) {
      scheduled = new Date(scheduledAt);
      if (isNaN(scheduled)) {
        return res.status(400).json({ error: "scheduledAt ist kein gültiges Datum." });
      }
    }

    const skeet = await Skeet.create({
      content: content.trim(),
      scheduledAt: scheduled, // darf null sein
      repeat,
      repeatDayOfWeek,
      repeatDayOfMonth,
      threadId,
      isThreadPost,
    });

    res.status(201).json(skeet);
  } catch (err) {
    console.error("Fehler beim Anlegen des Skeets:", err);
    res.status(400).json({ error: err.message || "Fehler beim Anlegen des Skeets." });
  }
}

module.exports = {
  getSkeets,
  createSkeet,
  getReactions: getReactionsController,
  getReplies: getRepliesController,
};
