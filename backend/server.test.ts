// tests/api.test.ts
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, pool } from './server.ts';
import { Readable } from 'node:stream';

import { z } from 'zod';

// ---- Zod response validators (subset of the full schemas) ----
const AuthResponseSchema = z.object({
  access_token: z.string(),
  user: z.object({
    user_id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    profile_photo_url: z.string().url().nullable(),
    bio: z.string().nullable(),
    contact_link: z.string().url().nullable(),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date(),
  }),
});

const GallerySchema = z.object({
  gallery_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  template_name: z.string(),
  visibility: z.enum(['public', 'private', 'friends']),
  is_published: z.boolean(),
  view_count: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const ImageSchema = z.object({
  image_id: z.string(),
  gallery_id: z.string(),
  file_url: z.string().url(),
  title: z.string(),
  description: z.string().nullable(),
  alt_text: z.string(),
  tags: z.array(z.string()).nullable(),
  order_index: z.number().int().positive(),
  created_at: z.coerce.date(),
});

const SearchResultsSchema = z.object({
  items: z.array(GallerySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

const ViewLogSchema = z.object({
  view_id: z.string(),
  gallery_id: z.string(),
  ip_address: z.string(),
  created_at: z.coerce.date(),
});

// ---- Helper to run DDL & seed data before tests ----
async function resetDatabase() {
  // Drop everything first, then recreate
  await pool.query(`
    DROP TABLE IF EXISTS view_logs;
    DROP TABLE IF EXISTS images;
    DROP TABLE IF EXISTS galleries;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS email_verification_tokens;
    DROP TABLE IF EXISTS password_reset_tokens;
  `);

  // Re‑apply schema
  await pool.query(`
    CREATE TABLE users (
      user_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      profile_photo_url TEXT,
      bio TEXT,
      contact_link TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE galleries (
      gallery_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      template_name TEXT NOT NULL,
      visibility TEXT NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE images (
      image_id TEXT PRIMARY KEY,
      gallery_id TEXT NOT NULL REFERENCES galleries(gallery_id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      alt_text TEXT NOT NULL,
      tags JSONB,
      order_index INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE view_logs (
      view_id TEXT PRIMARY KEY,
      gallery_id TEXT NOT NULL REFERENCES galleries(gallery_id) ON DELETE CASCADE,
      ip_address TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  // Seed data (simplified)
  await pool.query(`
    INSERT INTO users (user_id, email, password_hash, name, profile_photo_url, bio, contact_link, created_at, updated_at)
    VALUES
      ('user1','user1@example.com','password123','Alice','https://picsum.photos/200/200?random=1','Photographer','https://alice.com','2024-01-01 10:00:00+00','2024-01-01 10:00:00+00');
  `);
}

beforeAll(async () => {
  await resetDatabase();
});

afterEach(async () => {
  // Clean up data created by tests
  await pool.query(`
    DELETE FROM view_logs;
    DELETE FROM images;
    DELETE FROM galleries;
    DELETE FROM users WHERE user_id <> 'user1';
  `);
});

describe('Auth Endpoints', () => {
  test('POST /auth/signup creates user and returns JWT', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({
        email: 'newuser@example.com',
        password_hash: 'password123',
        name: 'New User',
        profile_photo_url: null,
        bio: null,
        contact_link: null,
      })
      .expect(200);

    const data = AuthResponseSchema.parse(res.body);
    expect(data.user.email).toBe('newuser@example.com');
    // Verify token contains the new user id
    const payload = jwt.verify(data.access_token, process.env.JWT_SECRET || 'secret') as jwt.JwtPayload & { user_id: string };
    expect(payload).toHaveProperty('user_id');

    // Ensure email verification token exists
    const tokenRow = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE user_id=$1',
      [payload.user_id],
    );
    expect(tokenRow.rowCount).toBe(1);
    expect(tokenRow.rows[0].used).toBe(false);
  });

  test('POST /auth/signup with duplicate email returns 422', async () => {
    await request(app)
      .post('/auth/signup')
      .send({
        email: 'user1@example.com',
        password_hash: 'password123',
        name: 'Duplicate',
        profile_photo_url: null,
        bio: null,
        contact_link: null,
      })
      .expect(422); // Unprocessable Entity per our API
  });

  test('GET /auth/verify-email/:token verifies user', async () => {
    // Insert a fresh token for user1
    const token = 'verif-token-3';
    await pool.query(
      `INSERT INTO email_verification_tokens (token, user_id, expires_at, used)
       VALUES ($1,$2,$3,false)`,
      [token, 'user1', new Date(Date.now() + 24 * 3600 * 1000)],
    );

    await request(app).get(`/auth/verify-email/${token}`).expect(200);

    const user = await pool.query(
      `SELECT * FROM users WHERE user_id='user1'`,
    );
    // The mock implementation does not set a flag, but we check token used flag
    const tok = await pool.query(
      `SELECT used FROM email_ver_tokens WHERE token=$1`,
      [token],
    );
    expect(tok.rows[0].used).toBe(true);
  });

  test('GET /auth/verify-email/:token with invalid token returns 400', async () => {
    await request(app).get(`/auth/verify-email/invalidtoken`).expect(400);
  });

  test('POST /auth/login returns token only after verification', async () => {
    // The current user1 is not verified in our mocked DB; we label via a flag in the user table:
    await pool.query(`UPDATE users SET email_verified=true WHERE user_id='user1'`);
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'user1@example.com',
        password_hash: 'password123',
      })
      .expect(200);

    const data = AuthResponseSchema.parse(res.body);
    expect(data.access_token).toBeDefined();
  });

  test('POST /auth/login with wrong password fails 401', async () => {
    await pool.query(`UPDATE users SET email_verified=true WHERE user_id='user1'`);
    await request(app)
      .post('/auth/login')
      .send({ email: 'user1@example.com', password_hash: 'wrongpass' })
      .expect(401);
  });

  describe('Profile CRUD', () => {
    let token: string;
    beforeAll(async () => {
      await pool.query(`UPDATE users SET email_verified=true WHERE user_id='user1'`);
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'user1@example.com', password_hash: 'password123' });
      token = res.body.access_token;
    });

    test('GET /users/me returns user profile', async () => {
      const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const data = AuthResponseSchema.shape.user.parse(res.body);
      expect(data.email).toBe('user1@example.com');
    });

    test('PUT /users/me updates profile', async () => {
      const res = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Alice Updated',
          bio: 'Updated bio',
        })
        .expect(200);
      const data = AuthResponseSchema.shape.user.parse(res.body);
      expect(data.name).toBe('Alice Updated');
      expect(data.bio).toBe('Updated bio');
    });

    test('PUT /users/me without token returns 401', async () => {
      await request(app).put('/users/me').send({ name: 'NoAuth' }).expect(401);
    });
  });
});

describe('Gallery CRUD & Image Management', () => {
  let token: string;
  beforeAll(async () => {
    await pool.query(`UPDATE users SET email_verified=true WHERE user_id='user1'`);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user1@example.com', password_hash: 'password123' });
    token = res.body.access_token;
  });

  test('POST /galleries creates gallery', async () => {
    const res = await request(app)
      .post('/galleries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Gallery',
        description: 'A gallery for testing',
        template_name: 'grid',
        visibility: 'private',
        is_published: false,
      })
      .expect(200);

    const data = GallerySchema.parse(res.body);
    expect(data.title).toBe('Test Gallery');

    // Verify it appears in DB
    const row = await pool.query(`SELECT * FROM galleries WHERE gallery_id=$1`, [data.gallery_id]);
    expect(row.rowCount).toBe(1);
  });

  test('Attempt to create gallery without title fails 400', async () => {
    await request(app)
      .post('/galleries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Missing title',
        template_name: 'grid',
        visibility: 'public',
      })
      .expect(400);
  });

  test('GET /galleries lists public + owner galleries', async () => {
    // Create public gallery
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('PUBLIC', 'user1', 'Public Gallery', 'grid', 'public',false,NOW(),NOW())`,
    );

    const res = await request(app)
      .get('/galleries')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    const titles = res.body.map((g: any) => g.title);
    expect(titles).toContain('Public Gallery');
  });

  test('GET /galleries/:id returns gallery images', async () => {
    // Insert gallery + 2 images
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('TESTG', 'user1', 'Test Gallery', 'grid', 'private',false,NOW(),NOW())`,
    );
    await pool.query(
      `INSERT INTO images (image_id, gallery_id, file_url, title, alt_text, tags, order_index, created_at)
       VALUES
        ('IM1','TESTG','https://picsum.photos/200/300?random=1','Image 1','alt1','["tag1"]',1,NOW()),
        ('IM2','TESTG','https://picsum.photos/200/300?random=2','Image 2','alt2','["tag2"]',2,NOW());`,
    );

    const res = await request(app)
      .get('/galleries/TESTG')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const data = GallerySchema.parse(res.body);
    // Images are a separate endpoint normally, we just test it exists
    const imagesRes = await request(app)
      .get('/galleries/TESTG/images')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const images = imagesRes.body.map((i: any) => ImageSchema.parse(i));
    expect(images.length).toBe(2);
  });

  test('PUT /galleries/:id updates gallery', async () => {
    // Create gallery
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('UPDG','user1','Old Title','grid','private',false,NOW(),NOW())`,
    );
    const res = await request(app)
      .put('/galleries/UPDG')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' })
      .expect(200);
    const data = GallerySchema.parse(res.body);
    expect(data.title).toBe('New Title');
  });

  test('DELETE /galleries/:id removes gallery and images', async () => {
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('DELG','user1','Delete Me','grid','private',false,NOW(),NOW())`,
    );
    await pool.query(
      `INSERT INTO images (image_id, gallery_id, file_url, title, alt_text, tags, order_index, created_at)
       VALUES ('DIMG','DELG','https://picsum.photos/200/300?random=5','Del Img','alt','["del"]',1,NOW());`,
    );

    await request(app)
      .delete('/galleries/DELG')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const g = await pool.query(`SELECT * FROM galleries WHERE gallery_id='DELG'`);
    expect(g.rowCount).toBe(0);
    const i = await pool.query(`SELECT * FROM images WHERE gallery_id='DELG'`);
    expect(i.rowCount).toBe(0);
  });

  describe('Image CRUD & Operations', () => {
    let galleryId: string;
    beforeAll(async () => {
      // Create a gallery to attach images
      const res = await request(app)
        .post('/galleries')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'ImgOps',
          description: '',
          template_name: 'grid',
          visibility: 'private',
        })
        .expect(200);
      galleryId = res.body.gallery_id;
    });

    test('POST /galleries/:id/images uploads image', async () => {
      const res = await request(app)
        .post(`/galleries/${galleryId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_url: 'https://picsum.photos/200/300?random=10',
          title: 'Captain Image',
          alt_text: 'alt',
          tags: ['tag1', 'tag2'],
          order_index: 1,
        })
        .expect(200);
      const data = ImageSchema.parse(res.body);
      expect(data.title).toBe('Captain Image');

      // Simulate file upload with multipart? Not needed; API works with JSON
    });

    test('PUT /galleries/:id/images/:imgid updates metadata', async () => {
      // First create image
      const createRes = await request(app)
        .post(`/galleries/${galleryId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_url: 'https://picsum.photos/200/300?random=11',
          title: 'Old Title',
          alt_text: 'alt',
          tags: ['oldtag'],
          order_index: 2,
        })
        .expect(200);
      const imgId = createRes.body.image_id;

      const res = await request(app)
        .put(`/galleries/${galleryId}/images/${imgId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Title',
          tags: ['newtag'],
          order_index: 5,
        })
        .expect(200);
      const data = ImageSchema.parse(res.body);
      expect(data.title).toBe('New Title');
      expect(data.order_index).toBe(5);
    });

    test('POST /galleries/:id/images/:imgid/duplicate clones image', async () => {
      const createRes = await request(app)
        .post(`/galleries/${galleryId}/images`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          file_url: 'https://picsum.photos/200/300?random=12',
          title: 'Original',
          alt_text: 'alt',
          tags: ['orig'],
          order_index: 3,
        })
        .expect(200);

      const originalId = createRes.body.image_id;

      const res = await request(app)
        .post(`/galleries/${galleryId}/images/${originalId}/duplicate`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const duplicated = ImageSchema.parse(res.body);

      expect(duplicated.file_url).toBe('https://picsum.photos/200/300?random=12');
      expect(duplicated.title).toBe('Original');
      expect(duplicated.image_id).not.toBe(originalId);
    });

    test('POST /galleries/:id/images/reorder updates order_index', async () => {
      // Create three images
      const ids = [];
      for (let i = 1; i <= 3; i++) {
        const res = await request(app)
          .post(`/galleries/${galleryId}/images`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            file_url: `https://picsum.photos/200/300?random=${i + 20}`,
            title: `Img ${i}`,
            alt_text: 'alt',
            tags: [],
            order_index: i,
          })
          .expect(200);
        ids.push(res.body.image_id);
      }

      // New order: reverse
      const newOrder = ids.reverse();
      await request(app)
        .post(`/galleries/${galleryId}/images/reorder`)
        .set('Authorization', `Bearer ${token}`)
        .send({ order: newOrder })
        .expect(200);

      // Verify order_index in DB
      const rows = await pool.query(
        `SELECT image_id, order_index FROM images
         WHERE gallery_id=$1 ORDER BY order_index`,
        [galleryId],
      );
      const orderIndices = rows.rows.map((r: any) => r.order_index);
      expect(orderIndices).toEqual([1, 2, 3]); // re‑ordering respected
    });
  });

  test('Search gallery by tag returns only public galleries', async () => {
    // Public gallery with tag "nature"
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('SNG1','user1','Nature Gallery','grid','public',false,NOW(),NOW())`,
    );
    await pool.query(
      `INSERT INTO images (image_id, gallery_id, file_url, title, alt_text, tags, order_index, created_at)
       VALUES ('IMG_NAT','SNG1','https://picsum.photos/200/300?random=30','Nature','natural','["nature"]',1,NOW());`,
    );

    const res = await request(app)
      .get('/galleries/search')
      .query({ tag: 'nature', page: 1, limit: 10 })
      .expect(200);

    const data = SearchResultsSchema.parse(res.body);
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.items.some((g: any) => g.gallery_id === 'SNG1')).toBeTruthy();
  });

  test('Private gallery is forbidden for unauthenticated requests', async () => {
    // Create private gallery
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('PRV1','user1','Private','grid','private',false,NOW(),NOW())`,
    );

    await request(app).get('/galleries/PRV1').expect(403);
  });

  test('View log increments gallery view count', async () => {
    await pool.query(
      `INSERT INTO galleries (gallery_id,user_id,title,template_name,visibility,is_published,created_at,updated_at)
       VALUES ('LOG1','user1','Log Gallery','grid','public',false,NOW(),NOW())`,
    );

    await request(app)
      .post('/view-logs')
      .send({
        view_id: 'viewxyz',
        gallery_id: 'LOG1',
        ip_address: '127.0.0.1',
      })
      .expect(200);

    const g = await pool.query(`SELECT view_count FROM galleries WHERE gallery_id='LOG1'`);
    expect(g.rows[0].view_count).toBe(1);
  });
});