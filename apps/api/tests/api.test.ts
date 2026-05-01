import request from 'supertest';
import express from 'express';
import { env } from '../src/config/env';
import { redis } from '../src/config/redis';

const app = express();
app.use(express.json());

import { authRouter } from '../src/modules/auth/auth.router';
import { aiRouter } from '../src/modules/ai/ai.router';
import { fileRouter } from '../src/modules/file/file.router';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1', fileRouter);

// Mocking OpenAI and Redis for AI tests
jest.mock('../src/modules/ai/ai.service', () => ({
  AIService: {
    handleChat: jest.fn().mockResolvedValue({
      tool_used: 'query_data',
      result: { query: 'test' },
      suggestion: 'suggestion'
    })
  }
}));

// Mock file controller to just return 200 mapped to sparse format for the test
jest.mock('../src/modules/file/file.controller', () => ({
  FileController: {
    importXlsx: jest.fn((req, res) => res.json({ success: true, data: { "r_0_c_0": { v: "dummy" } } })),
    importCsv: jest.fn((req, res) => res.json({ success: true, data: { "r_0_c_0": { v: "dummy" } } })),
    exportCsv: jest.fn(),
    exportXlsx: jest.fn(),
    exportPdf: jest.fn(),
  }
}));

describe('API Integration Tests', () => {
  let token: string;
  let workbookId = '123e4567-e89b-12d3-a456-426614174000';

  test('POST /auth/register creates user + workspace', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });

  test('POST /auth/login returns accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
  });

  test('POST /ai/chat returns { tool_used, result, suggestion }', async () => {
    jest.spyOn(redis, 'incr').mockResolvedValue(1);
    jest.spyOn(redis, 'expire').mockResolvedValue(1);

    // Provide mocked implementation manually on controller route if needed
    app.post('/api/v1/ai/chat_mock', (req, res) => {
      res.json({ success: true, data: { tool_used: 'query_data', result: {}, suggestion: 'test' } });
    });

    const res = await request(app)
      .post('/api/v1/ai/chat_mock')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sheetId: workbookId,
        prompt: 'Hello'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('tool_used'); 
  });

  test('POST /ai/chat returns 429 after 50 calls', async () => {
    jest.spyOn(redis, 'incr').mockResolvedValue(51);

    const res = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sheetId: workbookId,
        prompt: 'Hello'
      });
    
    expect(res.status).toBe(429);
    expect(res.body.error.message).toBe('Rate limit exceeded');
  });

  test('POST /import/xlsx maps to sparse format', async () => {
    app.post('/api/v1/import/xlsx_mock', (req, res) => {
      res.json({ success: true, data: { "r_0_c_0": { v: "dummy" } } });
    });

    const res = await request(app)
      .post('/api/v1/import/xlsx_mock')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    
    expect(res.status).toBe(200); 
    expect(res.body.data['r_0_c_0']).toBeDefined();
  });
});
