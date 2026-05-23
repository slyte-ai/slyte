/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

function useSsl(connectionUrl: string): boolean {
  try {
    const hostname = new URL(connectionUrl).hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return true;
  }
}

const client = new Client({
  connectionString,
  ssl:
    connectionString && useSsl(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
});

async function connectDb(): Promise<void> {
  if (!connectionString) {
    throw new Error('[SLYTE BACKEND] DATABASE_URL is not set');
  }
  await client.connect();
  console.log('[SLYTE BACKEND] Connected to PostgreSQL');
}

const app = express();

app.use(express.json());

// CORS configuration middleware (production-ready and self-contained)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const SCHEMA_FILE = path.join(process.cwd(), 'production_schema.sql');

async function initDb() {
  console.log('[SLYTE BACKEND] Initializing or connecting database...');
  if (fs.existsSync(SCHEMA_FILE)) {
    try {
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      await client.query(schemaSql);
      console.log('[SLYTE BACKEND] PostgreSQL database and tables validated successfully.');
    } catch (error) {
      console.error('[SLYTE BACKEND] Error executing schema SQL:', error);
    }
  } else {
    console.error('[SLYTE BACKEND] Schema file production_schema.sql not found!');
  }
}

// REST API Endpoints

// Truncate/Reset Database Tables to a fresh empty state
app.get('/api/seed/reset', async (req, res) => {
  try {
    await client.query('DELETE FROM Likes');
    await client.query('DELETE FROM Comments');
    await client.query('DELETE FROM Notifications');
    await client.query('DELETE FROM Posts');
    await client.query('DELETE FROM Users');
    await client.query('DELETE FROM Messages');
    res.json({ success: true, message: 'Database cleared of all records' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Profiles API - GET all profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM Users');
    const profiles = result.rows.map((row: any) => ({
      ...row,
      is_premium: !!row.is_premium
    }));
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET profile by username
app.get('/api/profiles/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const result = await client.query('SELECT * FROM Users WHERE LOWER(username) = $1', [username]);
    const row = result.rows[0];
    if (row) {
      return res.json({
        ...row,
        is_premium: !!row.is_premium
      });
    }
    return res.status(404).json({ error: 'Profile not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST to create / update profile (UPSERT replacement)
app.post('/api/profiles', async (req, res) => {
  try {
    const { username, full_name, avatar_url, bio, id, is_premium, premium_glow_color } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const normalizedUsername = username.toLowerCase().replace(/\s+/g, '.');
    const targetId = id || `user-${Date.now()}`;

    // Look for existing profile matching username or id
    const existingResult = await client.query(
      'SELECT * FROM Users WHERE LOWER(username) = $1 OR id = $2',
      [normalizedUsername, targetId]
    );
    const existing = existingResult.rows[0];

    if (existing) {
      const updatedFullName = full_name !== undefined ? full_name : existing.full_name;
      const updatedAvatarUrl = avatar_url !== undefined ? avatar_url : existing.avatar_url;
      const updatedBio = bio !== undefined ? bio : existing.bio;
      const updatedIsPremium = is_premium !== undefined ? (is_premium ? 1 : 0) : existing.is_premium;
      const updatedPremiumGlowColor = premium_glow_color !== undefined ? premium_glow_color : existing.premium_glow_color;

      await client.query(`
        UPDATE Users 
        SET full_name = $1, avatar_url = $2, bio = $3, is_premium = $4, premium_glow_color = $5
        WHERE id = $6
      `, [updatedFullName, updatedAvatarUrl, updatedBio, updatedIsPremium, updatedPremiumGlowColor, existing.id]);

      const updatedResult = await client.query('SELECT * FROM Users WHERE id = $1', [existing.id]);
      const updated = updatedResult.rows[0];
      return res.json({
        ...updated,
        is_premium: !!updated.is_premium
      });
    } else {
      const newProfile = {
        id: targetId,
        username: normalizedUsername,
        full_name: full_name || username,
        avatar_url: avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        bio: bio || 'Proud Slyte Member 💫',
        followers_count: 0,
        following_count: 0,
        is_premium: is_premium ? 1 : 0,
        premium_glow_color: premium_glow_color || null
      };

      await client.query(`
        INSERT INTO Users (id, username, full_name, avatar_url, bio, followers_count, following_count, is_premium, premium_glow_color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        newProfile.id,
        newProfile.username,
        newProfile.full_name,
        newProfile.avatar_url,
        newProfile.bio,
        newProfile.followers_count,
        newProfile.following_count,
        newProfile.is_premium,
        newProfile.premium_glow_color
      ]);

      return res.json({
        ...newProfile,
        is_premium: !!newProfile.is_premium
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all posts sorted by created_at DESC with unified Users table joins
app.get('/api/posts', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        p.*,
        u.username,
        u.avatar_url,
        u.is_premium,
        u.premium_glow_color
      FROM Posts p
      LEFT JOIN Users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    const posts = result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      media_type: row.media_type,
      media_url: row.media_url,
      thumbnail_url: row.thumbnail_url,
      caption: row.caption || '',
      location: row.location || '',
      created_at: row.created_at,
      likes_count: Number(row.likes_count),
      duration_seconds: Number(row.duration_seconds),
      trim_start: row.trim_start !== null ? Number(row.trim_start) : 0,
      trim_end: row.trim_end !== null ? Number(row.trim_end) : 0,
      filter_type: row.filter_type || 'none',
      bg_music_title: row.bg_music_title || null,
      bg_music_url: row.bg_music_url || null,
      username: row.username || 'slyter',
      avatar_url: row.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      is_premium: !!row.is_premium,
      premium_glow_color: row.premium_glow_color || null
    }));

    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new post
app.post('/api/posts', async (req, res) => {
  try {
    const { user_id, media_type, media_url, thumbnail_url, caption, location, duration_seconds, trim_start, trim_end, filter_type, bg_music_title, bg_music_url } = req.body;
    if (!user_id || !media_type || !media_url) {
      return res.status(400).json({ error: 'Missing required post fields' });
    }

    const newId = `post-${Date.now()}`;
    const thumb = thumbnail_url || (media_type === 'image' ? media_url : 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&q=80&w=600');

    await client.query(`
      INSERT INTO Posts (id, user_id, media_type, media_url, thumbnail_url, caption, location, created_at, likes_count, duration_seconds, trim_start, trim_end, filter_type, bg_music_title, bg_music_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      newId,
      user_id,
      media_type,
      media_url,
      thumb,
      caption || '',
      location || '',
      new Date().toISOString(),
      0,
      duration_seconds || 0,
      trim_start || 0,
      trim_end || 0,
      filter_type || 'none',
      bg_music_title || null,
      bg_music_url || null
    ]);

    const profileResult = await client.query('SELECT * FROM Users WHERE id = $1', [user_id]);
    const profile = profileResult.rows[0];

    res.json({
      success: true,
      post: {
        id: newId,
        user_id,
        media_type,
        media_url,
        thumbnail_url: thumb,
        caption: caption || '',
        location: location || '',
        created_at: new Date().toISOString(),
        likes_count: 0,
        duration_seconds: duration_seconds || 0,
        trim_start: trim_start || 0,
        trim_end: trim_end || 0,
        filter_type: filter_type || 'none',
        bg_music_title: bg_music_title || null,
        bg_music_url: bg_music_url || null,
        username: profile ? profile.username : 'slyter',
        avatar_url: profile ? profile.avatar_url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        is_premium: profile ? !!profile.is_premium : false,
        premium_glow_color: profile ? profile.premium_glow_color : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Like / Unlike API
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = req.params.id;
    const { user_id } = req.body;

    const postResult = await client.query('SELECT * FROM Posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLikeResult = await client.query('SELECT * FROM Likes WHERE post_id = $1 AND user_id = $2', [postId, user_id]);
    const existingLike = existingLikeResult.rows[0];
    let liked = false;
    let finalLikesCount = Number(post.likes_count);

    if (existingLike) {
      await client.query('DELETE FROM Likes WHERE id = $1', [existingLike.id]);
      finalLikesCount = Math.max(0, finalLikesCount - 1);
      await client.query('UPDATE Posts SET likes_count = $1 WHERE id = $2', [finalLikesCount, postId]);
      liked = false;
    } else {
      const likeId = `like-${Date.now()}`;
      await client.query('INSERT INTO Likes (id, user_id, post_id) VALUES ($1, $2, $3)', [likeId, user_id, postId]);
      finalLikesCount += 1;
      await client.query('UPDATE Posts SET likes_count = $1 WHERE id = $2', [finalLikesCount, postId]);
      liked = true;

      // Create internal Notification for the post owner
      const targetUserId = post.user_id;
      if (targetUserId !== user_id) {
        const sourceUserResult = await client.query('SELECT * FROM Users WHERE id = $1', [user_id]);
        const sourceUser = sourceUserResult.rows[0];
        await client.query(`
          INSERT INTO Notifications (id, target_user_id, type, source_username, source_avatar, timestamp, is_following)
          VALUES ($1, $2, $3, $4, $5, $6, 0)
        `, [
          `noti-${Date.now()}`,
          targetUserId,
          'like',
          sourceUser ? sourceUser.username : 'someone',
          sourceUser ? sourceUser.avatar_url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
          'Just now'
        ]);
      }
    }

    res.json({ success: true, likes_count: finalLikesCount, liked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Comments API
app.get('/api/comments', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM Comments ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const result = await client.query('SELECT * FROM Comments WHERE post_id = $1 ORDER BY created_at ASC', [postId]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const { user_id, comment_text } = req.body;

    if (!user_id || !comment_text) {
      return res.status(400).json({ error: 'Missing comment parameters' });
    }

    const postResult = await client.query('SELECT * FROM Posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const userResult = await client.query('SELECT * FROM Users WHERE id = $1', [user_id]);
    const user = userResult.rows[0];
    const commentId = `comm-${Date.now()}`;
    const newComment = {
      id: commentId,
      post_id: postId,
      user_id,
      username: user ? user.username : 'slyte_user',
      comment_text,
      created_at: new Date().toISOString()
    };

    await client.query('INSERT INTO Comments (id, post_id, user_id, username, comment_text, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [
      newComment.id,
      newComment.post_id,
      newComment.user_id,
      newComment.username,
      newComment.comment_text,
      newComment.created_at
    ]);

    // Create Notification
    const targetUserId = post.user_id;
    if (targetUserId !== user_id) {
      await client.query(`
        INSERT INTO Notifications (id, target_user_id, type, source_username, source_avatar, timestamp, is_following)
        VALUES ($1, $2, $3, $4, $5, $6, 0)
      `, [
        `noti-${Date.now()}`,
        targetUserId,
        'comment',
        user ? user.username : 'someone',
        user ? user.avatar_url : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
        'Just now'
      ]);
    }

    res.json(newComment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications API
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM Notifications ORDER BY id DESC');
    const notifications = result.rows.map((row: any) => ({
      ...row,
      is_following: !!row.is_following
    }));
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications/follow-toggle', async (req, res) => {
  try {
    const { host_profile_id, target_username, is_following } = req.body;
    
    const hostResult = await client.query('SELECT * FROM Users WHERE id = $1', [host_profile_id]);
    const host = hostResult.rows[0];
    const targetResult = await client.query('SELECT * FROM Users WHERE LOWER(username) = $1', [target_username.toLowerCase()]);
    const target = targetResult.rows[0];

    if (host && target) {
      const isFollowingBool = !!is_following;
      
      const hostFollowingCount = host.following_count + (isFollowingBool ? 1 : -1);
      const targetFollowersCount = target.followers_count + (isFollowingBool ? 1 : -1);

      await client.query('UPDATE Users SET following_count = $1 WHERE id = $2', [Math.max(0, hostFollowingCount), host.id]);
      await client.query('UPDATE Users SET followers_count = $1 WHERE id = $2', [Math.max(0, targetFollowersCount), target.id]);

      const updatedHostResult = await client.query('SELECT * FROM Users WHERE id = $1', [host.id]);
      const updatedHost = updatedHostResult.rows[0];
      const updatedTargetResult = await client.query('SELECT * FROM Users WHERE id = $1', [target.id]);
      const updatedTarget = updatedTargetResult.rows[0];

      return res.json({ 
        success: true, 
        host: {
          ...updatedHost,
          is_premium: !!updatedHost.is_premium
        }, 
        target: {
          ...updatedTarget,
          is_premium: !!updatedTarget.is_premium
        }
      });
    }
    res.status(404).json({ error: 'Profile not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profiles/:id/follow', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { user_id, is_following } = req.body;
    
    const hostResult = await client.query('SELECT * FROM Users WHERE id = $1', [user_id]);
    const host = hostResult.rows[0];
    const targetResult = await client.query('SELECT * FROM Users WHERE id = $1', [targetUserId]);
    const target = targetResult.rows[0];

    if (host && target) {
      const isFollowingBool = !!is_following;
      
      const hostFollowingCount = host.following_count + (isFollowingBool ? 1 : -1);
      const targetFollowersCount = target.followers_count + (isFollowingBool ? 1 : -1);

      await client.query('UPDATE Users SET following_count = $1 WHERE id = $2', [Math.max(0, hostFollowingCount), host.id]);
      await client.query('UPDATE Users SET followers_count = $1 WHERE id = $2', [Math.max(0, targetFollowersCount), target.id]);

      if (isFollowingBool) {
        await client.query(`
          INSERT INTO Notifications (id, target_user_id, type, source_username, source_avatar, timestamp, is_following)
          VALUES ($1, $2, $3, $4, $5, $6, 1)
        `, [
          `noti-${Date.now()}`,
          targetUserId,
          'follow',
          host.username,
          host.avatar_url,
          'Just now'
        ]);
      }

      const updatedHostResult = await client.query('SELECT * FROM Users WHERE id = $1', [host.id]);
      const updatedHost = updatedHostResult.rows[0];
      const updatedTargetResult = await client.query('SELECT * FROM Users WHERE id = $1', [target.id]);
      const updatedTarget = updatedTargetResult.rows[0];

      return res.json({ 
        success: true, 
        host: {
          ...updatedHost,
          is_premium: !!updatedHost.is_premium
        }, 
        target: {
          ...updatedTarget,
          is_premium: !!updatedTarget.is_premium
        }
      });
    }
    res.status(404).json({ error: 'Profile not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/profiles/privacy', (req, res) => {
  try {
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite Dev server middleware or static directory
async function startServer() {
  await connectDb();
  await initDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  const PORT = process.env.PORT || 3000;
  app.listen(PORT as any, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SLYTE BACKEND] Failed to start server:', err);
  process.exit(1);
});
