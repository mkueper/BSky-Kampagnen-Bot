const { Skeet } = require('../models');
const skeetService = require('./skeetService');

async function exportPlannedSkeets() {
  const skeets = await Skeet.findAll({
    where: { postUri: null },
    order: [['scheduledAt', 'ASC'], ['createdAt', 'DESC']],
  });

  return {
    exportedAt: new Date().toISOString(),
    count: skeets.length,
    skeets: skeets.map((entry) => ({
      content: entry.content,
      scheduledAt: entry.scheduledAt ? entry.scheduledAt.toISOString() : null,
      repeat: entry.repeat,
      repeatDayOfWeek: entry.repeatDayOfWeek,
      repeatDayOfMonth: entry.repeatDayOfMonth,
      threadId: entry.threadId,
      isThreadPost: entry.isThreadPost,
      targetPlatforms: Array.isArray(entry.targetPlatforms)
        ? entry.targetPlatforms
        : ['bluesky'],
    })),
  };
}

function normalizeImportPayload(body) {
  if (!body) {
    return [];
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body.skeets)) {
    return body.skeets;
  }
  return [];
}

async function importPlannedSkeets(body) {
  const entries = normalizeImportPayload(body);
  if (entries.length === 0) {
    throw new Error('Erwartet ein Array geplanter Skeets im JSON-Body.');
  }

  const created = [];
  for (let index = 0; index < entries.length; index += 1) {
    const item = entries[index];
    if (!item || typeof item !== 'object') {
      throw new Error(`Eintrag ${index + 1}: Ungültige Struktur.`);
    }

    const payload = {
      content: item.content,
      scheduledAt: item.scheduledAt,
      repeat: item.repeat,
      repeatDayOfWeek: item.repeatDayOfWeek,
      repeatDayOfMonth: item.repeatDayOfMonth,
      threadId: item.threadId,
      isThreadPost: item.isThreadPost,
      targetPlatforms: item.targetPlatforms,
    };

    try {
      const skeet = await skeetService.createSkeet(payload);
      created.push(skeet);
    } catch (error) {
      throw new Error(`Eintrag ${index + 1}: ${error?.message || error}`);
    }
  }

  return created;
}

module.exports = {
  exportPlannedSkeets,
  importPlannedSkeets,
};
