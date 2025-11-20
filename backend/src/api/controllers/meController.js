const bskyController = require('@api/controllers/bskyController');
const { getBlueskyCredentials } = require('@core/services/credentialsService');


// eslint-disable-next-line no-unused-vars
async function getMe(req, res, next) {
  try {
    const { handle } = getBlueskyCredentials();
    if (!handle) {
      return res.status(404).json({ error: 'Bluesky handle not configured.' });
    }
    
    // Reuse getProfile logic by creating a mock request object
    const mockReq = {
      query: {
        actor: handle
      }
    };

    await bskyController.getProfile(mockReq, res);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Fehler beim Laden des eigenen Profils.' });
  }
}

module.exports = {
  getMe,
};
