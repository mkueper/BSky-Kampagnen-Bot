const bskyController = require('@api/controllers/bskyController');
const { getBlueskyCredentials } = require('@core/services/credentialsService');

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

    await bskyController.getProfile(mockReq, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
};
