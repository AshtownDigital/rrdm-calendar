const request = require('supertest');
const app = require('../../server'); // Express app

// Increase default timeout as app startup & first DB ops may take a second
jest.setTimeout(15000);

describe('Academic Year API', () => {
  it('GET /api/v1/academic-years -> list', async () => {
    const res = await request(app).get('/api/v1/academic-years');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('academicYears');
    expect(Array.isArray(res.body.academicYears)).toBe(true);
    expect(res.body.academicYears.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/academic-years/:id -> single item', async () => {
    // Fetch list first to obtain an identifier (uuid or _id)
    const listRes = await request(app).get('/api/v1/academic-years');
    expect(listRes.statusCode).toBe(200);
    const { academicYears } = listRes.body;
    const first = academicYears[0];
    const identifier = first.uuid || first._id;
    expect(identifier).toBeDefined();

    const itemRes = await request(app).get(`/api/v1/academic-years/${identifier}`);
    expect(itemRes.statusCode).toBe(200);
    expect(itemRes.body).toHaveProperty('_id');
    expect(itemRes.body).toHaveProperty('startDate');
    expect(itemRes.body).toHaveProperty('endDate');
  });
});
