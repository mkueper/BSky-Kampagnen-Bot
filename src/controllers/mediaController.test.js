const { describe, it, expect, beforeEach, vi } = global;

// We'll inject fakes via require.cache before loading the controller module

const fs = require('fs');
let mediaController;

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}

describe('mediaController.addMedia', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // stub sqlite3 to avoid native binding load
    const sqlitePath = require.resolve('sqlite3');
    require.cache[sqlitePath] = { id: sqlitePath, filename: sqlitePath, loaded: true, exports: {} };

    // inject fake models module as controllers resolve '../models'
    const path = require('path');
    const modelsPath = path.join(__dirname, '../data/models/index.js');
    const fake = {
      Thread: {
        findByPk: vi.fn(async (id) => ({ id, segments: [{ id: 11, sequence: 0 }] })),
      },
      ThreadSkeet: {},
      ThreadSkeetMedia: {
        count: vi.fn(async () => 0),
        create: vi.fn(async (row) => ({ id: 99, ...row })),
      },
      Skeet: {},
      SkeetMedia: {},
    };
    require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: fake };

    // finally require the controller under test
    delete require.cache[require.resolve('../api/controllers/mediaController')];
    mediaController = require('../api/controllers/mediaController');
  });

  it('rejects unsupported MIME type with 400', async () => {
    const req = {
      params: { id: '1', sequence: '0' },
      body: { filename: 'x.jpg', mime: 'image/unknown', data: 'data:;base64,AAAA' },
    };
    const res = mockRes();
    await mediaController.addMedia(req, res);
    expect(res.statusCode).toBe(400);
    expect(String(res.body?.error || '')).toMatch(/MIME/i);
  });

  it('rejects too large file with 413 and does not write file', async () => {
    const spy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const prev = process.env.UPLOAD_MAX_BYTES;
    process.env.UPLOAD_MAX_BYTES = '5';
    try {
      const base64 = Buffer.from('0123456789').toString('base64'); // 10 bytes
      const req = {
        params: { id: '1', sequence: '0' },
        body: { filename: 'x.jpg', mime: 'image/jpeg', data: `data:image/jpeg;base64,${base64}` },
      };
      const res = mockRes();
      await mediaController.addMedia(req, res);
      expect(res.statusCode).toBe(413);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      process.env.UPLOAD_MAX_BYTES = prev;
      spy.mockRestore();
    }
  });
});
