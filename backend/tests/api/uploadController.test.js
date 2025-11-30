const { describe, it, expect } = global;

const uploadController = require('../../src/api/controllers/uploadController');

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  res.send = (obj) => { res.body = obj; return res; };
  return res;
}

describe('uploadController.uploadTemp', () => {
  it('returns 400 for invalid data URL', async () => {
    const req = { body: { filename: 'x.jpg', mime: 'image/jpeg', data: 'not-a-data-url' } };
    const res = mockRes();
    await uploadController.uploadTemp(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 413 for payload exceeding limit', async () => {
    const prev = process.env.UPLOAD_MAX_BYTES;
    process.env.UPLOAD_MAX_BYTES = '5';
    try {
      const big = Buffer.from('0123456789').toString('base64'); // 10 bytes
      const req = { body: { filename: 'x.jpg', mime: 'image/jpeg', data: `data:image/jpeg;base64,${big}` } };
      const res = mockRes();
      await uploadController.uploadTemp(req, res);
      expect(res.statusCode).toBe(413);
    } finally {
      process.env.UPLOAD_MAX_BYTES = prev;
    }
  });
});
