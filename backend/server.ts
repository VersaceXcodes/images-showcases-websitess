import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import pkg from 'pg';

// Import zod schemas
import {
  usersEntitySchema,
  createUserInputSchema,
  updateUserInputSchema,
  galleriesEntitySchema,
  createGalleryInputSchema,
  updateGalleryInputSchema,
  imagesEntitySchema,
  createImageInputSchema,
  updateImageInputSchema,
  createViewLogInputSchema
} from './schema.ts';

dotenv.config();

const { Pool } = pkg;
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key' } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { require: true } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { require: true },
      }
);

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan('combined'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Serve uploaded files from storage
app.use('/storage', express.static(storageDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP are allowed.'));
    }
  }
});

// Error response utility
function createErrorResponse(message, error = null, errorCode = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error_code = errorCode;
  }

  if (error && process.env.NODE_ENV === 'development') {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return response;
}

/*
  Authentication middleware for protected routes
  Verifies JWT token and attaches user to request object
*/
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_MISSING'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT user_id, email, name, profile_photo_url, bio, contact_link, created_at, updated_at FROM users WHERE user_id = $1', [decoded.user_id]);
      
      if (result.rows.length === 0) {
        return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
      }

      req.user = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
  }
};

/*
  @@need:external-api: Email service for sending verification and password reset emails
  This function mocks the email sending functionality that would typically use
  services like SendGrid, AWS SES, or similar email providers
*/
async function sendEmail(to, subject, content) {
  // Mock email sending - returns successful response
  console.log(`Mock email sent to ${to}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${content}`);
  
  return {
    success: true,
    messageId: `mock-${uuidv4()}`,
    timestamp: new Date().toISOString()
  };
}

// Authentication Routes

/*
  POST /api/auth/signup
  Creates a new user account with email verification token
  Stores password in plain text for development purposes
*/
app.post('/api/auth/signup', async (req, res) => {
  try {
    // Validate input using zod schema
    const validatedData = createUserInputSchema.parse(req.body);
    const { email, password_hash, name, profile_photo_url, bio, contact_link } = validatedData;

    const client = await pool.connect();
    try {
      // Check if user already exists
      const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json(createErrorResponse('User with this email already exists', null, 'USER_ALREADY_EXISTS'));
      }

      // Generate user ID and timestamps
      const userId = uuidv4();
      const now = new Date().toISOString();

      // Create user (store password directly for development)
      const userResult = await client.query(
        'INSERT INTO users (user_id, email, password_hash, name, profile_photo_url, bio, contact_link, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id, email, name, profile_photo_url, bio, contact_link, created_at, updated_at',
        [userId, email.toLowerCase().trim(), password_hash, name, profile_photo_url, bio, contact_link, now, now]
      );

      const user = userResult.rows[0];

      // Generate email verification token
      const verificationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

      await client.query(
        'INSERT INTO email_verification_tokens (token, user_id, expires_at, used) VALUES ($1, $2, $3, $4)',
        [verificationToken, userId, expiresAt, false]
      );

      // Send verification email (mocked)
      await sendEmail(
        email,
        'Verify your ImageShow account',
        `Click here to verify your account: http://localhost:${port}/api/auth/verify-email/${verificationToken}`
      );

      // Generate JWT token
      const accessToken = jwt.sign(
        { user_id: userId, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        access_token: accessToken,
        user: user
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/auth/login
  Authenticates user credentials and returns JWT token
  Uses direct password comparison for development
*/
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password_hash } = req.body;

    if (!email || !password_hash) {
      return res.status(400).json(createErrorResponse('Email and password are required', null, 'MISSING_REQUIRED_FIELDS'));
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT user_id, email, password_hash, name, profile_photo_url, bio, contact_link, created_at, updated_at FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );

      if (result.rows.length === 0) {
        return res.status(400).json(createErrorResponse('Invalid email or password', null, 'INVALID_CREDENTIALS'));
      }

      const user = result.rows[0];

      // Direct password comparison for development
      if (password_hash !== user.password_hash) {
        return res.status(400).json(createErrorResponse('Invalid email or password', null, 'INVALID_CREDENTIALS'));
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Remove password from response
      const { password_hash: _, ...userResponse } = user;

      res.json({
        access_token: accessToken,
        user: userResponse
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  GET /api/auth/verify-email/{token}
  Verifies email address using verification token
*/
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT token, user_id, expires_at, used FROM email_verification_tokens WHERE token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(400).json(createErrorResponse('Invalid verification token', null, 'INVALID_TOKEN'));
      }

      const tokenData = result.rows[0];

      if (tokenData.used) {
        return res.status(400).json(createErrorResponse('Verification token already used', null, 'TOKEN_ALREADY_USED'));
      }

      if (new Date() > new Date(tokenData.expires_at)) {
        return res.status(400).json(createErrorResponse('Verification token expired', null, 'TOKEN_EXPIRED'));
      }

      // Mark token as used
      await client.query('UPDATE email_verification_tokens SET used = $1 WHERE token = $2', [true, token]);

      res.json({
        message: 'Email verified successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/auth/password-reset-request
  Generates password reset token and sends reset email
*/
app.post('/api/auth/password-reset-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(createErrorResponse('Email is required', null, 'MISSING_REQUIRED_FIELDS'));
    }

    const client = await pool.connect();
    try {
      const userResult = await client.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);

      if (userResult.rows.length === 0) {
        // Return success even if email doesn't exist for security
        return res.json({ message: 'If an account with that email exists, a reset link has been sent' });
      }

      const userId = userResult.rows[0].user_id;

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      await client.query(
        'INSERT INTO password_reset_tokens (token, user_id, expires_at, used) VALUES ($1, $2, $3, $4)',
        [resetToken, userId, expiresAt, false]
      );

      // Send reset email (mocked)
      await sendEmail(
        email,
        'Reset your ImageShow password',
        `Click here to reset your password: http://localhost:${port}/api/auth/password-reset/${resetToken}`
      );

      res.json({ message: 'If an account with that email exists, a reset link has been sent' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/auth/password-reset/{token}
  Resets user password using valid reset token
*/
app.post('/api/auth/password-reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password_hash } = req.body;

    if (!password_hash || password_hash.length < 8) {
      return res.status(400).json(createErrorResponse('Password must be at least 8 characters long', null, 'PASSWORD_TOO_SHORT'));
    }

    const client = await pool.connect();
    try {
      const tokenResult = await client.query(
        'SELECT token, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json(createErrorResponse('Invalid reset token', null, 'INVALID_TOKEN'));
      }

      const tokenData = tokenResult.rows[0];

      if (tokenData.used) {
        return res.status(400).json(createErrorResponse('Reset token already used', null, 'TOKEN_ALREADY_USED'));
      }

      if (new Date() > new Date(tokenData.expires_at)) {
        return res.status(400).json(createErrorResponse('Reset token expired', null, 'TOKEN_EXPIRED'));
      }

      // Update password (store directly for development)
      await client.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3', 
        [password_hash, new Date().toISOString(), tokenData.user_id]);

      // Mark token as used
      await client.query('UPDATE password_reset_tokens SET used = $1 WHERE token = $2', [true, token]);

      res.json({ message: 'Password reset successful' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// User Profile Routes

/*
  GET /api/users/me
  Returns current authenticated user's profile
*/
app.get('/api/users/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

/*
  PUT /api/users/me
  Updates current authenticated user's profile
  Handles profile photo upload if provided
*/
app.put('/api/users/me', authenticateToken, upload.single('profile_photo'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    let updateData = { ...req.body };

    // If file was uploaded, update profile_photo_url
    if (req.file) {
      updateData.profile_photo_url = `http://localhost:${port}/storage/${req.file.filename}`;
    }

    // Validate update data
    const validatedData = updateUserInputSchema.parse({ ...updateData, user_id: userId });

    const client = await pool.connect();
    try {
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(validatedData).forEach(([key, value]) => {
        if (key !== 'user_id' && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
      });

      updateFields.push(`updated_at = $${paramIndex}`);
      updateValues.push(new Date().toISOString());
      updateValues.push(userId);

      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex + 1} RETURNING user_id, email, name, profile_photo_url, bio, contact_link, created_at, updated_at`;

      const result = await client.query(query, updateValues);

      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Gallery Routes

/*
  GET /api/galleries
  Lists galleries - owned by user if authenticated, public galleries if not
  Supports pagination with page and limit parameters
*/
app.get('/api/galleries', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      let query, countQuery, params;

      if (req.headers.authorization) {
        // If authenticated, show user's galleries
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET);
          
          query = `SELECT gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at 
                   FROM galleries WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
          countQuery = 'SELECT COUNT(*) FROM galleries WHERE user_id = $1';
          params = [decoded.user_id, limit, offset];
        } catch {
          // Invalid token, show public galleries
          query = `SELECT gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at 
                   FROM galleries WHERE visibility = 'public' ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
          countQuery = "SELECT COUNT(*) FROM galleries WHERE visibility = 'public'";
          params = [limit, offset];
        }
      } else {
        // Not authenticated, show public galleries
        query = `SELECT gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at 
                 FROM galleries WHERE visibility = 'public' ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        countQuery = "SELECT COUNT(*) FROM galleries WHERE visibility = 'public'";
        params = [limit, offset];
      }

      const [galleriesResult, countResult] = await Promise.all([
        client.query(query, params),
        client.query(countQuery, params.slice(0, -2))
      ]);

      res.json({
        items: galleriesResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('List galleries error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/galleries
  Creates a new gallery for the authenticated user
*/
app.post('/api/galleries', authenticateToken, async (req, res) => {
  try {
    const validatedData = createGalleryInputSchema.parse({
      ...req.body,
      user_id: req.user.user_id
    });

    const galleryId = uuidv4();
    const now = new Date().toISOString();

    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO galleries (gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at',
        [galleryId, validatedData.user_id, validatedData.title, validatedData.description, validatedData.template_name, validatedData.visibility, validatedData.is_published || false, 0, now, now]
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create gallery error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  GET /api/galleries/{gallery_id}
  Retrieves a specific gallery with its images
  Access control: owner can access any, public for others
*/
app.get('/api/galleries/:gallery_id', async (req, res) => {
  try {
    const { gallery_id } = req.params;

    const client = await pool.connect();
    try {
      // Get gallery
      const galleryResult = await client.query(
        'SELECT gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at FROM galleries WHERE gallery_id = $1',
        [gallery_id]
      );

      if (galleryResult.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }

      const gallery = galleryResult.rows[0];

      // Check access permissions
      let hasAccess = gallery.visibility === 'public';
      
      if (!hasAccess && req.headers.authorization) {
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET);
          hasAccess = gallery.user_id === decoded.user_id;
        } catch {
          // Invalid token, keep hasAccess as false
        }
      }

      if (!hasAccess) {
        return res.status(403).json(createErrorResponse('Access denied to private gallery', null, 'ACCESS_DENIED'));
      }

      // Get images for the gallery
      const imagesResult = await client.query(
        'SELECT image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at FROM images WHERE gallery_id = $1 ORDER BY order_index ASC',
        [gallery_id]
      );

      res.json({
        ...gallery,
        images: imagesResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  PUT /api/galleries/{gallery_id}
  Updates a gallery - only owner can update
*/
app.put('/api/galleries/:gallery_id', authenticateToken, async (req, res) => {
  try {
    const { gallery_id } = req.params;
    const validatedData = updateGalleryInputSchema.parse({
      ...req.body,
      gallery_id
    });

    const client = await pool.connect();
    try {
      // Check ownership
      const ownerCheck = await client.query('SELECT user_id FROM galleries WHERE gallery_id = $1', [gallery_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }
      if (ownerCheck.rows[0].user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      Object.entries(validatedData).forEach(([key, value]) => {
        if (key !== 'gallery_id' && value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
      });

      updateFields.push(`updated_at = $${paramIndex}`);
      updateValues.push(new Date().toISOString());
      updateValues.push(gallery_id);

      const query = `UPDATE galleries SET ${updateFields.join(', ')} WHERE gallery_id = $${paramIndex + 1} RETURNING gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at`;

      const result = await client.query(query, updateValues);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update gallery error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  DELETE /api/galleries/{gallery_id}
  Deletes a gallery and all its images - only owner can delete
*/
app.delete('/api/galleries/:gallery_id', authenticateToken, async (req, res) => {
  try {
    const { gallery_id } = req.params;

    const client = await pool.connect();
    try {
      // Check ownership
      const ownerCheck = await client.query('SELECT user_id FROM galleries WHERE gallery_id = $1', [gallery_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }
      if (ownerCheck.rows[0].user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      // Delete gallery (images will be deleted by CASCADE)
      await client.query('DELETE FROM galleries WHERE gallery_id = $1', [gallery_id]);

      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Image Routes

/*
  GET /api/galleries/{gallery_id}/images
  Lists all images in a gallery - requires ownership for private galleries
*/
app.get('/api/galleries/:gallery_id/images', async (req, res) => {
  try {
    const { gallery_id } = req.params;

    const client = await pool.connect();
    try {
      // Check gallery access
      const galleryResult = await client.query(
        'SELECT user_id, visibility FROM galleries WHERE gallery_id = $1',
        [gallery_id]
      );

      if (galleryResult.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }

      const gallery = galleryResult.rows[0];
      let hasAccess = gallery.visibility === 'public';

      if (!hasAccess && req.headers.authorization) {
        try {
          const authHeader = req.headers.authorization;
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, JWT_SECRET);
          hasAccess = gallery.user_id === decoded.user_id;
        } catch {
          // Invalid token
        }
      }

      if (!hasAccess) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      const imagesResult = await client.query(
        'SELECT image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at FROM images WHERE gallery_id = $1 ORDER BY order_index ASC',
        [gallery_id]
      );

      res.json(imagesResult.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/galleries/{gallery_id}/images
  Uploads a new image to a gallery - requires ownership
*/
app.post('/api/galleries/:gallery_id/images', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { gallery_id } = req.params;

    const client = await pool.connect();
    try {
      // Check ownership
      const ownerCheck = await client.query('SELECT user_id FROM galleries WHERE gallery_id = $1', [gallery_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }
      if (ownerCheck.rows[0].user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      // Get file URL
      let file_url;
      if (req.file) {
        file_url = `http://localhost:${port}/storage/${req.file.filename}`;
      } else if (req.body.file_url) {
        file_url = req.body.file_url;
      } else {
        return res.status(400).json(createErrorResponse('Image file or file_url is required', null, 'MISSING_IMAGE'));
      }

      // Get next order index
      const orderResult = await client.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM images WHERE gallery_id = $1',
        [gallery_id]
      );
      const nextOrder = orderResult.rows[0].next_order;

      const validatedData = createImageInputSchema.parse({
        ...req.body,
        gallery_id,
        file_url,
        order_index: req.body.order_index || nextOrder
      });

      const imageId = uuidv4();
      const now = new Date().toISOString();

      const result = await client.query(
        'INSERT INTO images (image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at',
        [imageId, validatedData.gallery_id, validatedData.file_url, validatedData.title, validatedData.description, validatedData.alt_text, JSON.stringify(validatedData.tags), validatedData.order_index, now]
      );

      res.status(201).json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Upload image error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  PUT /api/galleries/{gallery_id}/images/{image_id}
  Updates image metadata - requires ownership
*/
app.put('/api/galleries/:gallery_id/images/:image_id', authenticateToken, async (req, res) => {
  try {
    const { gallery_id, image_id } = req.params;

    const client = await pool.connect();
    try {
      // Check ownership
      const ownerCheck = await client.query(
        'SELECT g.user_id FROM galleries g JOIN images i ON g.gallery_id = i.gallery_id WHERE i.image_id = $1 AND g.gallery_id = $2',
        [image_id, gallery_id]
      );
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Image not found', null, 'IMAGE_NOT_FOUND'));
      }
      if (ownerCheck.rows[0].user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      const validatedData = updateImageInputSchema.parse({
        ...req.body,
        image_id
      });

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      Object.entries(validatedData).forEach(([key, value]) => {
        if (key !== 'image_id' && value !== undefined) {
          if (key === 'tags') {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(value);
          }
          paramIndex++;
        }
      });

      updateValues.push(image_id);

      const query = `UPDATE images SET ${updateFields.join(', ')} WHERE image_id = $${paramIndex} RETURNING image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at`;

      const result = await client.query(query, updateValues);
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update image error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/galleries/{gallery_id}/images/{image_id}/duplicate
  Creates a duplicate of an image within the same gallery
*/
app.post('/api/galleries/:gallery_id/images/:image_id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { gallery_id, image_id } = req.params;

    const client = await pool.connect();
    try {
      // Check ownership and get original image
      const imageResult = await client.query(
        'SELECT i.*, g.user_id FROM images i JOIN galleries g ON i.gallery_id = g.gallery_id WHERE i.image_id = $1 AND g.gallery_id = $2',
        [image_id, gallery_id]
      );

      if (imageResult.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Image not found', null, 'IMAGE_NOT_FOUND'));
      }

      const originalImage = imageResult.rows[0];
      if (originalImage.user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      // Get next order index
      const orderResult = await client.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM images WHERE gallery_id = $1',
        [gallery_id]
      );
      const nextOrder = orderResult.rows[0].next_order;

      // Create duplicate
      const duplicateId = uuidv4();
      const now = new Date().toISOString();

      const result = await client.query(
        'INSERT INTO images (image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at',
        [duplicateId, gallery_id, originalImage.file_url, `Copy of ${originalImage.title}`, originalImage.description, originalImage.alt_text, originalImage.tags, nextOrder, now]
      );

      res.status(201).json({
        image: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Duplicate image error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/galleries/{gallery_id}/images/reorder
  Reorders images within a gallery based on provided order array
*/
app.post('/api/galleries/:gallery_id/images/reorder', authenticateToken, async (req, res) => {
  try {
    const { gallery_id } = req.params;
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json(createErrorResponse('Order must be an array of image IDs', null, 'INVALID_ORDER'));
    }

    const client = await pool.connect();
    try {
      // Check ownership
      const ownerCheck = await client.query('SELECT user_id FROM galleries WHERE gallery_id = $1', [gallery_id]);
      if (ownerCheck.rows.length === 0) {
        return res.status(404).json(createErrorResponse('Gallery not found', null, 'GALLERY_NOT_FOUND'));
      }
      if (ownerCheck.rows[0].user_id !== req.user.user_id) {
        return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
      }

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Update order_index for each image
        for (let i = 0; i < order.length; i++) {
          await client.query(
            'UPDATE images SET order_index = $1 WHERE image_id = $2 AND gallery_id = $3',
            [i + 1, order[i], gallery_id]
          );
        }

        await client.query('COMMIT');
        res.json({ message: 'Images reordered successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reorder images error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Search and Analytics Routes

/*
  GET /api/galleries/search
  Searches public galleries by tag with pagination
*/
app.get('/api/galleries/search', async (req, res) => {
  try {
    const { tag } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!tag) {
      return res.status(400).json(createErrorResponse('Tag parameter is required', null, 'MISSING_TAG'));
    }

    const client = await pool.connect();
    try {
      // Search galleries containing images with the specified tag
      const query = `
        SELECT DISTINCT g.gallery_id, g.user_id, g.title, g.description, g.template_name, g.visibility, g.is_published, g.view_count, g.created_at, g.updated_at
        FROM galleries g
        JOIN images i ON g.gallery_id = i.gallery_id
        WHERE g.visibility = 'public' 
        AND i.tags::text ILIKE $1
        ORDER BY g.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(DISTINCT g.gallery_id)
        FROM galleries g
        JOIN images i ON g.gallery_id = i.gallery_id
        WHERE g.visibility = 'public' 
        AND i.tags::text ILIKE $1
      `;

      const [galleriesResult, countResult] = await Promise.all([
        client.query(query, [`%${tag}%`, limit, offset]),
        client.query(countQuery, [`%${tag}%`])
      ]);

      res.json({
        items: galleriesResult.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Search galleries error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

/*
  POST /api/view-logs
  Logs a view event for a gallery and increments view count
  Prevents duplicate views from same IP within 1 hour
*/
app.post('/api/view-logs', async (req, res) => {
  try {
    const validatedData = createViewLogInputSchema.parse(req.body);
    const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const client = await pool.connect();
    try {
      // Check for recent view from same IP
      const recentViewResult = await client.query(
        'SELECT view_id FROM view_logs WHERE gallery_id = $1 AND ip_address = $2 AND created_at > NOW() - INTERVAL \'1 hour\'',
        [validatedData.gallery_id, clientIp]
      );

      if (recentViewResult.rows.length > 0) {
        // Already viewed recently, don't log again
        return res.status(200).json({ message: 'View already logged recently' });
      }

      // Log the view
      const viewId = uuidv4();
      const now = new Date().toISOString();

      await client.query(
        'INSERT INTO view_logs (view_id, gallery_id, ip_address, created_at) VALUES ($1, $2, $3, $4)',
        [viewId, validatedData.gallery_id, clientIp, now]
      );

      // Increment gallery view count
      await client.query(
        'UPDATE galleries SET view_count = view_count + 1 WHERE gallery_id = $1',
        [validatedData.gallery_id]
      );

      res.status(200).json({ message: 'View logged successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Log view error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json(createErrorResponse('Validation failed', error, 'VALIDATION_ERROR'));
    }
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA catch-all: serve index.html for non-API routes only
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app, pool };

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and listening on 0.0.0.0`);
});