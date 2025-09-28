const threadService = require("../services/threadService");

async function listThreads(req, res) {
  try {
    const statusFilter = req.query.status ? String(req.query.status) : undefined;
    const threads = await threadService.listThreads({ status: statusFilter });
    res.json(threads);
  } catch (error) {
    console.error("Fehler beim Auflisten der Threads:", error);
    res.status(500).json({ error: error?.message || "Fehler beim Laden der Threads." });
  }
}

async function getThread(req, res) {
  try {
    const thread = await threadService.getThread(req.params.id);
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Laden des Threads." });
  }
}

async function createThread(req, res) {
  try {
    const thread = await threadService.createThread(req.body || {});
    res.status(201).json(thread);
  } catch (error) {
    const isValidation = error?.name === "SequelizeValidationError" || error instanceof SyntaxError;
    const status = isValidation ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Speichern des Threads." });
  }
}

module.exports = {
  listThreads,
  getThread,
  createThread,
};
