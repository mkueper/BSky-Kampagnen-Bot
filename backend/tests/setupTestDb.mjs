import { beforeAll, afterAll, beforeEach } from 'vitest';
import models from '../src/data/models/index.js';

beforeAll(async () => {
  await models.sequelize.sync({ force: true });
});

beforeEach(async () => {
  await models.sequelize.truncate({ cascade: true });
});

afterAll(async () => {
  await models.sequelize.close();
});

