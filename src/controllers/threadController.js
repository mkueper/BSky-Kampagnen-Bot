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

async function updateThread(req, res) {
  try {
    const thread = await threadService.updateThread(req.params.id, req.body || {});
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.name === "SequelizeValidationError" ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Aktualisieren des Threads." });
  }
}

async function deleteThread(req, res) {
  try {
    const permanent = ["1", "true", "yes"].includes((req.query.permanent || "").toString().toLowerCase());
    await threadService.deleteThread(req.params.id, { permanent });
    res.status(204).send();
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.name === "SequelizeValidationError" ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Löschen des Threads." });
  }
}

async function restoreThread(req, res) {
  try {
    const thread = await threadService.restoreThread(req.params.id);
    res.json(thread);
  } catch (error) {
    const status = error?.status === 404 ? 404 : error?.status === 400 ? 400 : 500;
    res.status(status).json({ error: error?.message || "Fehler beim Wiederherstellen des Threads." });
  }
}

module.exports = {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  restoreThread,
};
