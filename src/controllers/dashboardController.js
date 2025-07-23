const Skeet = require('../models/skeetModel');
const Reply = require('../models/replyModel');
const { getReactions, getReplies } = require('../services/blueskyClient');

async function getSkeets(req, res) {
  try {
    const skeets = await Skeet.findAll();
    res.json(skeets);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Skeets.' });
  }
}

async function getReactionsController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) {
      return res.status(404).json({ error: 'Skeet nicht gefunden.' });
    }

    const reactions = await getReactions(skeet.postUri);

    await skeet.update({
      likesCount: reactions.likes.length,
      repostsCount: reactions.reposts.length
    });

    res.json({ likes: reactions.likes.length, reposts: reactions.reposts.length });
  } catch (error) {
    console.error('Fehler beim Laden der Reaktionen:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Reaktionen.' });
  }
}

async function getRepliesController(req, res) {
  const { skeetId } = req.params;
  try {
    const skeet = await Skeet.findByPk(skeetId);
    if (!skeet) {
      return res.status(404).json({ error: 'Skeet nicht gefunden.' });
    }

    const repliesData = await getReplies(skeet.postUri);
    const replies = repliesData?.replies || [];

    await Reply.destroy({ where: { skeetId: skeet.id } });

    for (const reply of replies) {
      await Reply.create({
        skeetId: skeet.id,
        authorHandle: reply.author.handle,
        content: reply.text,
        createdAt: new Date(reply.indexedAt)
      });
    }

    res.json(replies);
  } catch (error) {
    console.error('Fehler beim Laden der Replies:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Replies.' });
  }
}

async function createSkeet(req, res) {
  try {
    const { content, scheduledAt } = req.body;
    const skeet = await Skeet.create({
      content,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: 'geplant'
    });
    res.json(skeet);
  } catch (err) {
    console.error('Fehler beim Anlegen des Skeets:', err);
    res.status(500).json({ error: 'Fehler beim Anlegen des Skeets' });
  }
}

module.exports = {
  getSkeets,
  createSkeet,
  getReactions: getReactionsController,
  getReplies: getRepliesController
};
