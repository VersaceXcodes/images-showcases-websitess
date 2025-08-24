-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    user_id            TEXT      PRIMARY KEY,
    email              TEXT      UNIQUE NOT NULL,
    password_hash      TEXT      NOT NULL,
    name               TEXT,
    profile_photo_url  TEXT,
    bio                TEXT,
    contact_link       TEXT,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL
);

-- Galleries table
CREATE TABLE galleries (
    gallery_id        TEXT       PRIMARY KEY,
    user_id           TEXT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title             TEXT       NOT NULL,
    description       TEXT,
    template_name     TEXT       NOT NULL,
    visibility        TEXT       NOT NULL,
    is_published      BOOLEAN    NOT NULL DEFAULT FALSE,
    view_count        INTEGER    NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL
);

-- Images table
CREATE TABLE images (
    image_id     TEXT       PRIMARY KEY,
    gallery_id   TEXT       NOT NULL REFERENCES galleries(gallery_id) ON DELETE CASCADE,
    file_url     TEXT       NOT NULL,
    title        TEXT       NOT NULL,
    description  TEXT,
    alt_text     TEXT       NOT NULL,
    tags         JSONB,
    order_index  INTEGER    NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL
);

-- Email Verification Tokens table
CREATE TABLE email_verification_tokens (
    token       TEXT       PRIMARY KEY,
    user_id     TEXT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN    NOT NULL DEFAULT FALSE
);

-- Password Reset Tokens table
CREATE TABLE password_reset_tokens (
    token       TEXT       PRIMARY KEY,
    user_id     TEXT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN    NOT NULL DEFAULT FALSE
);

-- View Logs table
CREATE TABLE view_logs (
    view_id     TEXT       PRIMARY KEY,
    gallery_id  TEXT       NOT NULL REFERENCES galleries(gallery_id) ON DELETE CASCADE,
    ip_address  TEXT       NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- 2. SEED DATA
-- =====================================================

-- Users
INSERT INTO users (user_id, email, password_hash, name, profile_photo_url, bio, contact_link, created_at, updated_at)
VALUES
('user1', 'user1@example.com', 'password123', 'Alice Smith', 'https://picsum.photos/200/200?random=1', 'Photographer & Traveller', 'https://alice.com', '2024-01-01 10:00:00+00', '2024-01-01 10:00:00+00'),
('user2', 'user2@example.com', 'admin123', 'Bob Johnson', 'https://picsum.photos/200/200?random=2', 'Architect & Designer', 'https://bob.io', '2024-01-02 11:30:00+00', '2024-01-02 11:30:00+00'),
('user3', 'user3@example.com', 'user123', 'Carol Davis', NULL, NULL, NULL, '2024-01-03 09:15:00+00', '2024-01-03 09:15:00+00');

-- Galleries
INSERT INTO galleries (gallery_id, user_id, title, description, template_name, visibility, is_published, view_count, created_at, updated_at)
VALUES
('gal1', 'user1', 'Nature Wonders', 'A collection of breathtaking nature photos.', 'nature_template', 'public', FALSE, 0, '2024-01-04 08:00:00+00', '2024-01-04 08:00:00+00'),
('gal2', 'user1', 'Urban Exploration', 'Cityscapes and street photography.', 'city_template', 'public', FALSE, 0, '2024-01-05 12:45:00+00', '2024-01-05 12:45:00+00'),
('gal3', 'user2', 'Architectural Marvels', 'Designs from modern architecture.', 'architecture_template', 'public', FALSE, 0, '2024-01-06 14:20:00+00', '2024-01-06 14:20:00+00'),
('gal4', 'user2', 'Landscape Art', 'Beautiful landscapes from around the world.', 'landscape_template', 'public', FALSE, 0, '2024-01-07 16:10:00+00', '2024-01-07 16:10:00+00'),
('gal5', 'user3', 'Portrait Series', 'A series of portrait shots.', 'portrait_template', 'public', FALSE, 0, '2024-01-08 09:00:00+00', '2024-01-08 09:00:00+00');

-- Images
INSERT INTO images (image_id, gallery_id, file_url, title, description, alt_text, tags, order_index, created_at)
VALUES
-- Gallery 1
('img1', 'gal1', 'https://picsum.photos/800/600?random=10', 'Mountain Peak', 'Sunrise over the peak.', 'Mountain sunrise', '["mountain","sunrise","nature"]', 1, '2024-01-09 10:00:00+00'),
('img2', 'gal1', 'https://picsum.photos/800/600?random=11', 'Forest Trail', 'A misty trail in the forest.', 'Forest mist', '["forest","mist","trail"]', 2, '2024-01-09 10:05:00+00'),
('img3', 'gal1', 'https://picsum.photos/800/600?random=12', 'Lake Reflection', 'Lake reflecting the sky.', 'Lake reflection', '["lake","reflection","water"]', 3, '2024-01-09 10:10:00+00'),
-- Gallery 2
('img4', 'gal2', 'https://picsum.photos/800/600?random=20', 'Downtown Alley', 'Nighttime alley shot.', 'Alley at night', '["city","night","alley"]', 1, '2024-01-10 12:00:00+00'),
('img5', 'gal2', 'https://picsum.photos/800/600?random=21', 'Skyline View', 'Skyline from rooftop.', 'Skyline view', '["skyline","rooftop","city"]', 2, '2024-01-10 12:05:00+00'),
('img6', 'gal2', 'https://picsum.photos/800/600?random=22', 'Streetscape', 'Busy street scene.', 'Busy street', '["streetscape","urbanscene","city"]', 3, '2024-01-10 12:10:00+00'),
-- Gallery 3
('img7', 'gal3', 'https://picsum.photos/800/600?random=30', 'Modern Bridge', 'Sleek bridge design.', 'Modern bridge', '["bridge","modern","architecture"]', 1, '2024-01-11 14:00:00+00'),
('img8', 'gal3', 'https://picsum.photos/800/600?random=31', 'Glass Facade', 'Reflection in glass building.', 'Glass building', '["glass","facade","building"]', 2, '2024-01-11 14:05:00+00'),
('img9', 'gal3', 'https://picsum.photos/800/600?random=32', 'Skyscraper', 'Tall skyscraper at dusk.', 'Skyscraper dusk', '["skyscraper","dusk","architecture"]', 3, '2024-01-11 14:10:00+00'),
-- Gallery 4
('img10', 'gal4', 'https://picsum.photos/800/600?random=40', 'Desert Dunes', 'Golden dunes under sunrise.', 'Desert sunrise', '["desert","dunes","nature"]', 1, '2024-01-12 16:00:00+00'),
('img11', 'gal4', 'https://picsum.photos/800/600?random=41', 'Waterfall', 'Waterfall in tropical forest.', 'Tropical waterfall', '["waterfall","forest","nature"]', 2, '2024-01-12 16:05:00+00'),
('img12', 'gal4', 'https://picsum.photos/800/600?random=42', 'Mountain Lake', 'Lake surrounded by mountains.', 'Mountain lake', '["lake","mountain","nature"]', 3, '2024-01-12 16:10:00+00'),
-- Gallery 5
('img13', 'gal5', 'https://picsum.photos/800/600?random=50', 'Portrait 1', 'Smiling woman in park.', 'Woman portrait', '["portrait","smiling"]', 1, '2024-01-13 09:00:00+00'),
('img14', 'gal5', 'https://picsum.photos/800/600?random=51', 'Portrait 2', 'Man in studio lights.', 'Man portrait', '["portrait","studio"]', 2, '2024-01-13 09:05:00+00'),
('img15', 'gal5', 'https://picsum.photos/800/600?random=52', 'Portrait 3', 'Child in garden.', 'Child portrait', '["portrait","child"]', 3, '2024-01-13 09:10:00+00');

-- Email Verification Tokens
INSERT INTO email_verification_tokens (token, user_id, expires_at, used)
VALUES
('verif-token-1', 'user1', '2024-01-15 12:00:00+00', FALSE),
('verif-token-2', 'user2', '2024-01-15 12:05:00+00', FALSE),
('verif-token-3', 'user3', '2024-01-15 12:10:00+00', FALSE);

-- Password Reset Tokens
INSERT INTO password_reset_tokens (token, user_id, expires_at, used)
VALUES
('reset-token-1', 'user1', '2024-01-16 09:00:00+00', FALSE),
('reset-token-2', 'user2', '2024-01-16 09:05:00+00', FALSE),
('reset-token-3', 'user3', '2024-01-16 09:10:00+00', FALSE);

-- View Logs
INSERT INTO view_logs (view_id, gallery_id, ip_address, created_at)
VALUES
('view1', 'gal1', '192.168.1.10', '2024-01-17 08:00:00+00'),
('view2', 'gal2', '192.168.1.11', '2024-01-17 08:05:00+00'),
('view3', 'gal3', '192.168.1.12', '2024-01-17 08:10:00+00'),
('view4', 'gal4', '192.168.1.13', '2024-01-17 08:15:00+00'),
('view5', 'gal5', '192.168.1.14', '2024-01-17 08:20:00+00');

-- =====================================================
-- 3. OPTIONAL: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Unique email index (already covered by UNIQUE constraint on email)
-- Additional indices could be added by nodejs migrations if needed.

-- =====================================================
-- End of script
-- =====================================================