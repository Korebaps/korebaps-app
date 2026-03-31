require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const path = require('path');

// Debug: Log environment variables (without sensitive data) - only in development
if (process.env.NODE_ENV !== 'production') {
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
  console.log('DB_PORT:', process.env.DB_PORT ? 'SET' : 'NOT SET');
  console.log('DB_NAME:', process.env.DB_NAME ? 'SET' : 'NOT SET');
  console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
  console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET');
  console.log('DB_SSL:', process.env.DB_SSL);
  console.log('PORT:', process.env.PORT);
  console.log('DB_SSL_CA:', process.env.DB_SSL_CA);
  console.log('DB_SSL_REJECT_UNAUTHORIZED:', process.env.DB_SSL_REJECT_UNAUTHORIZED);
  console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('All environment variables:', Object.keys(process.env).filter(key => key.includes('DB') || key.includes('ADMIN') || key.includes('PORT') || key.includes('REACT')));
  console.log('=== END ENVIRONMENT DEBUG ===');
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from React app
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const adminTokens = new Map();
const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const extractAdminToken = (req) => {
  const headerToken = req.get('x-admin-token');
  if (headerToken) return String(headerToken);

  const authHeader = req.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ? String(match[1]) : null;
};

const requireAdmin = (req, res, next) => {
  try {
    if (!ADMIN_PASSWORD) {
      res.status(500).json({ error: 'Admin password not configured on server' });
      return;
    }

    const token = extractAdminToken(req);
    if (!token) {
      res.status(401).json({ error: 'Missing admin token' });
      return;
    }

    const createdAt = adminTokens.get(token);
    if (!createdAt) {
      res.status(401).json({ error: 'Invalid admin token' });
      return;
    }

    if (Date.now() - createdAt > ADMIN_TOKEN_TTL_MS) {
      adminTokens.delete(token);
      res.status(401).json({ error: 'Admin token expired' });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware failed', error);
    res.status(500).json({ error: 'Admin auth failed' });
  }
};

app.post('/api/admin/login', (req, res) => {
  const password = req.body?.password;

  if (!ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Admin password not configured on server' });
    return;
  }

  if (!password || String(password) !== String(ADMIN_PASSWORD)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.set(token, Date.now());
  res.json({ token });
});

app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  const token = extractAdminToken(req);
  if (token) adminTokens.delete(token);
  res.json({ ok: true });
});

const extractSpotifyTrackId = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const spotifyUriPrefix = 'spotify:track:';
  if (trimmed.startsWith(spotifyUriPrefix)) {
    return trimmed.slice(spotifyUriPrefix.length) || null;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('spotify.com')) {
      const match = url.pathname.match(/\/track\/([^/]+)/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // Not a URL
  }

  if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
  return trimmed;
};

const fetchSpotifyThumbnailUrl = async (spotifyTrackId) => {
  if (!spotifyTrackId) return null;
  const trackUrl = `https://open.spotify.com/track/${spotifyTrackId}`;
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`;

  return new Promise((resolve) => {
    https
      .get(oembedUrl, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json?.thumbnail_url ?? null);
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', () => {
        resolve(null);
      });
  });
};

const calculateBattingPoints = (payload) => {
  let points = 0;
  points += (payload.singles ?? 0) * 1;
  points += (payload.doubles ?? 0) * 2;
  points += (payload.triples ?? 0) * 3;
  points += (payload.homeRuns ?? 0) * 5;
  points += (payload.runs ?? 0) * 1;
  points += (payload.rbi ?? 0) * 2;
  points += (payload.walks ?? 0) * 0.5;
  points += (payload.hitByPitch ?? 0) * 0.5;
  points += (payload.stolenBases ?? 0) * 1;
  if (payload.isMVP) points += 5;
  return points;
};

const calculatePitchingPoints = (payload, outsRecorded) => {
  const innings = outsRecorded ? outsRecorded / 3 : 0;
  const wins = Number(payload.wins ?? 0) || 0;
  const strikeouts = Number(payload.strikeouts ?? 0) || 0;
  const runsAllowed = Number(payload.runsAllowed ?? 0) || 0;
  const earnedRuns = Number(payload.earnedRuns ?? 0) || 0;
  const hitsAllowed = Number(payload.hitsAllowed ?? 0) || 0;
  const walks = Number(payload.walks ?? 0) || 0;
  const isMVP = payload.isMVP ? 1 : 0;

  let points = 0;
  points += innings * 3;
  points += wins * 5;
  points += strikeouts * 1;
  points -= runsAllowed * 2;
  points -= earnedRuns * 1;
  points -= walks * 1;
  points -= hitsAllowed * 1;
  if (isMVP) points += 5;

  return points;
};

const sslEnabled = process.env.DB_SSL === 'true';
const sslCaPath = process.env.DB_SSL_CA;
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslEnabled
    ? {
        rejectUnauthorized,
        ca: sslCaPath ? fs.readFileSync(sslCaPath) : undefined,
      }
    : undefined,
});

// Test database connection on startup and ensure visitor_hits table exists
pool.getConnection()
  .then(async (conn) => {
    console.log('Database connected successfully');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS visitor_hits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        visitor_hash VARCHAR(64) NOT NULL,
        visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_visited_at (visited_at),
        INDEX idx_visitor_hash (visitor_hash)
      )
    `);
    console.log('visitor_hits table ready');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

// --- Visitor tracking endpoints ---

async function getVisitorStats() {
  const [[{ today }]] = await pool.execute(
    `SELECT COUNT(*) AS today FROM visitor_hits WHERE DATE(visited_at) = CURDATE()`
  );
  const [[{ month }]] = await pool.execute(
    `SELECT COUNT(*) AS month FROM visitor_hits WHERE YEAR(visited_at) = YEAR(CURDATE()) AND MONTH(visited_at) = MONTH(CURDATE())`
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM visitor_hits`
  );
  return { today, month, total };
}

app.post('/api/visitor/record', async (req, res) => {
  try {
    const { fingerprint } = req.body || {};
    if (!fingerprint || typeof fingerprint !== 'string') {
      return res.status(400).json({ error: 'Missing fingerprint' });
    }

    const visitorHash = crypto.createHash('sha256').update(fingerprint).digest('hex');

    const [existing] = await pool.execute(
      `SELECT id FROM visitor_hits WHERE visitor_hash = ? AND visited_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE) LIMIT 1`,
      [visitorHash]
    );

    if (existing.length === 0) {
      await pool.execute(
        `INSERT INTO visitor_hits (visitor_hash, visited_at) VALUES (?, NOW())`,
        [visitorHash]
      );
    }

    const stats = await getVisitorStats();
    res.json(stats);
  } catch (err) {
    console.error('Visitor record error:', err);
    res.status(500).json({ error: 'Failed to record visit' });
  }
});

app.get('/api/visitor/stats', async (req, res) => {
  try {
    const stats = await getVisitorStats();
    res.json(stats);
  } catch (err) {
    console.error('Visitor stats error:', err);
    res.status(500).json({ error: 'Failed to fetch visitor stats' });
  }
});

// --- End visitor tracking ---

app.get('/api/seasonal-batting-stats', async (req, res) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    let rows;

    if (seasonId) {
      [rows] = await pool.execute(
        `
          select 
            ss.jersey_number, 
            ss.first_name, 
            ss.last_name, 
            ss.games_played, 
            ss.total_pa, 
            ss.total_ab, 
            ss.total_1b, 
            ss.total_2b, 
            ss.total_3b, 
            ss.total_hr, 
            ss.total_runs, 
            ss.total_rbi, 
            ss.total_bb, 
            ss.total_hbp, 
            ss.total_strikeouts, 
            ss.total_sb, 
            ss.avg, 
            ss.obp, 
            ss.slg, 
            ss.ops, 
            ss.total_batting_points,
            COALESCE(sow.season_owar, 0) as season_owar,
            p.is_active
          from seasonal_batting_stats ss
          -- We join players to get the player_id so we can link to the WAR view
          join players p 
            on ss.jersey_number = p.jersey_number 
            and ss.first_name = p.first_name 
            and ss.last_name = p.last_name
          -- Now we join your new WAR view
          left join season_offensive_war sow 
            on p.player_id = sow.player_id 
            and sow.season_id = ?
          where ss.season_id = ?
          order by ss.jersey_number
        `,
        [seasonId, seasonId], // We pass seasonId twice (once for the JOIN, once for the WHERE)
      );
    } else {
      [rows] = await pool.execute(
        `
          select
            p.jersey_number,
            p.first_name,
            p.last_name,
            count(distinct bs.game_id) as games_played,
            sum(bs.plate_appearances) as total_pa,
            sum(bs.at_bats) as total_ab,
            sum(bs.singles) as total_1b,
            sum(bs.doubles) as total_2b,
            sum(bs.triples) as total_3b,
            sum(bs.home_runs) as total_hr,
            sum(bs.runs_scored) as total_runs,
            sum(bs.rbi) as total_rbi,
            sum(bs.walks) as total_bb,
            sum(bs.hit_by_pitch) as total_hbp,
            sum(bs.strikeouts) as total_strikeouts,
            sum(bs.stolen_bases) as total_sb,
            round(
              sum(bs.singles + bs.doubles + bs.triples + bs.home_runs)
              / nullif(sum(bs.at_bats), 0),
              3
            ) as avg,
            round(
              (sum(bs.singles + bs.doubles + bs.triples + bs.home_runs) + sum(bs.walks) + sum(bs.hit_by_pitch))
              / nullif(sum(bs.at_bats) + sum(bs.walks) + sum(bs.hit_by_pitch), 0),
              3
            ) as obp,
            round(
              (sum(bs.singles) + (sum(bs.doubles) * 2) + (sum(bs.triples) * 3) + (sum(bs.home_runs) * 4))
              / nullif(sum(bs.at_bats), 0),
              3
            ) as slg,
            round(
              (
                (sum(bs.singles + bs.doubles + bs.triples + bs.home_runs) + sum(bs.walks) + sum(bs.hit_by_pitch))
                / nullif(sum(bs.at_bats) + sum(bs.walks) + sum(bs.hit_by_pitch), 0)
              )
              + (
                (sum(bs.singles) + (sum(bs.doubles) * 2) + (sum(bs.triples) * 3) + (sum(bs.home_runs) * 4))
                / nullif(sum(bs.at_bats), 0)
              ),
              3
            ) as ops,
            sum(bs.batting_points) as total_batting_points,
            0 as season_owar,
            p.is_active
          from batting_stats bs
          join games g on bs.game_id = g.game_id
          join players p on bs.player_id = p.player_id
          group by p.player_id
          order by p.jersey_number
        `,
      );
    }

    res.json(rows);
  } catch (error) {
    console.error('Failed to load seasonal batting stats', error);
    res.status(500).json({ error: 'Failed to load seasonal batting stats' });
  }
});

app.post('/api/batting-stats', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.body?.gameId);
    const playerId = Number(req.body?.playerId);

    if (!gameId || !playerId) {
      res.status(400).json({ error: 'Missing gameId or playerId' });
      return;
    }

    const payload = {
      plateAppearances: Number(req.body?.plateAppearances ?? 0) || 0,
      singles: Number(req.body?.singles ?? 0) || 0,
      doubles: Number(req.body?.doubles ?? 0) || 0,
      triples: Number(req.body?.triples ?? 0) || 0,
      homeRuns: Number(req.body?.homeRuns ?? 0) || 0,
      runs: Number(req.body?.runs ?? 0) || 0,
      rbi: Number(req.body?.rbi ?? 0) || 0,
      walks: Number(req.body?.walks ?? 0) || 0,
      hitByPitch: Number(req.body?.hitByPitch ?? 0) || 0,
      strikeouts: Number(req.body?.strikeouts ?? 0) || 0,
      sacs: Number(req.body?.sacs ?? 0) || 0,
      stolenBases: Number(req.body?.stolenBases ?? 0) || 0,
      caughtStealing: Number(req.body?.caughtStealing ?? 0) || 0,
      isMVP: req.body?.isMVP ? 1 : 0,
    };

    const [updateResult] = await pool.execute(
      `
        update batting_stats
        set
          plate_appearances = ?,
          singles = ?,
          doubles = ?,
          triples = ?,
          home_runs = ?,
          runs_scored = ?,
          rbi = ?,
          walks = ?,
          strikeouts = ?,
          hit_by_pitch = ?,
          sacs = ?,
          stolen_bases = ?,
          caught_stealing = ?,
          is_mvp = ?
        where game_id = ? and player_id = ?
      `,
      [
        payload.plateAppearances,
        payload.singles,
        payload.doubles,
        payload.triples,
        payload.homeRuns,
        payload.runs,
        payload.rbi,
        payload.walks,
        payload.strikeouts,
        payload.hitByPitch,
        payload.sacs,
        payload.stolenBases,
        payload.caughtStealing,
        payload.isMVP,
        gameId,
        playerId,
      ],
    );

    if (updateResult.affectedRows === 0) {
      await pool.execute(
        `
          insert into batting_stats (
            game_id,
            player_id,
            plate_appearances,
            singles,
            doubles,
            triples,
            home_runs,
            runs_scored,
            rbi,
            walks,
            strikeouts,
            hit_by_pitch,
            sacs,
            stolen_bases,
            caught_stealing,
            is_mvp
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          gameId,
          playerId,
          payload.plateAppearances,
          payload.singles,
          payload.doubles,
          payload.triples,
          payload.homeRuns,
          payload.runs,
          payload.rbi,
          payload.walks,
          payload.strikeouts,
          payload.hitByPitch,
          payload.sacs,
          payload.stolenBases,
          payload.caughtStealing,
          payload.isMVP,
        ],
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to upsert batting stats', error);
    res.status(500).json({ error: 'Failed to upsert batting stats' });
  }
});

app.delete('/api/batting-stats', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.query.gameId);
    const playerId = Number(req.query.playerId);
    if (!gameId || !playerId) {
      res.status(400).json({ error: 'Missing gameId or playerId' });
      return;
    }

    await pool.execute(
      `delete from batting_stats where game_id = ? and player_id = ?`,
      [gameId, playerId],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete batting stats', error);
    res.status(500).json({ error: 'Failed to delete batting stats' });
  }
});

app.post('/api/pitching-stats', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.body?.gameId);
    const playerId = Number(req.body?.playerId);
    if (!gameId || !playerId) {
      res.status(400).json({ error: 'Missing gameId or playerId' });
      return;
    }

    const outsRecorded = Number(req.body?.outsRecorded ?? 0) || 0;

    const payload = {
      pitchesThrown: Number(req.body?.pitchCount ?? 0) || 0,
      hitsAllowed: Number(req.body?.hitsAllowed ?? 0) || 0,
      runsAllowed: Number(req.body?.runsAllowed ?? 0) || 0,
      earnedRuns: Number(req.body?.earnedRuns ?? 0) || 0,
      strikeouts: Number(req.body?.strikeouts ?? 0) || 0,
      walks: Number(req.body?.walks ?? 0) || 0,
      hitBatters: Number(req.body?.hitByPitch ?? 0) || 0,
      wins: Number(req.body?.wins ?? 0) || 0,
      losses: Number(req.body?.losses ?? 0) || 0,
      saveEarned: Number(req.body?.saveEarned ?? 0) || 0,
      isMVP: req.body?.isMVP ? 1 : 0,
    };

    const pitchingPoints = calculatePitchingPoints(payload, outsRecorded);

    const [updateResult] = await pool.execute(
      `
        update pitching_stats
        set
          outs_recorded = ?,
          pitches_thrown = ?,
          hits_allowed = ?,
          runs_allowed = ?,
          earned_runs = ?,
          strikeouts = ?,
          walks_allowed = ?,
          hit_batters = ?,
          w = ?,
          l = ?,
          save_earned = ?,
          is_mvp = ?
        where game_id = ? and player_id = ?
      `,
      [
        outsRecorded,
        payload.pitchesThrown,
        payload.hitsAllowed,
        payload.runsAllowed,
        payload.earnedRuns,
        payload.strikeouts,
        payload.walks,
        payload.hitBatters,
        payload.wins,
        payload.losses,
        payload.saveEarned,
        payload.isMVP,
        gameId,
        playerId,
      ],
    );

    if (updateResult.affectedRows === 0) {
      await pool.execute(
        `
          insert into pitching_stats (
            game_id,
            player_id,
            outs_recorded,
            pitches_thrown,
            hits_allowed,
            runs_allowed,
            earned_runs,
            strikeouts,
            walks_allowed,
            hit_batters,
            w,
            l,
            save_earned,
            is_mvp
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          gameId,
          playerId,
          outsRecorded,
          payload.pitchesThrown,
          payload.hitsAllowed,
          payload.runsAllowed,
          payload.earnedRuns,
          payload.strikeouts,
          payload.walks,
          payload.hitBatters,
          payload.wins,
          payload.losses,
          payload.saveEarned,
          payload.isMVP,
        ],
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to upsert pitching stats', error);
    res.status(500).json({ error: 'Failed to upsert pitching stats' });
  }
});

app.delete('/api/pitching-stats', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.query.gameId);
    const playerId = Number(req.query.playerId);
    if (!gameId || !playerId) {
      res.status(400).json({ error: 'Missing gameId or playerId' });
      return;
    }

    await pool.execute(
      `delete from pitching_stats where game_id = ? and player_id = ?`,
      [gameId, playerId],
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete pitching stats', error);
    res.status(500).json({ error: 'Failed to delete pitching stats' });
  }
});

app.post('/api/upload-game-stats', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.body?.gameId);
    const battingStats = req.body?.battingStats ?? [];
    const pitchingStats = req.body?.pitchingStats ?? [];

    if (!gameId) {
      res.status(400).json({ error: 'Missing gameId' });
      return;
    }

    const [gameRows] = await pool.execute('SELECT game_id FROM games WHERE game_id = ?', [gameId]);
    if (gameRows.length === 0) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const allPlayerIds = [
      ...battingStats.map((s) => Number(s.playerId)),
      ...pitchingStats.map((s) => Number(s.playerId)),
    ].filter(Boolean);

    if (allPlayerIds.length > 0) {
      const uniqueIds = [...new Set(allPlayerIds)];
      const placeholders = uniqueIds.map(() => '?').join(',');
      const [activeRows] = await pool.query(
        `SELECT player_id FROM players WHERE player_id IN (${placeholders}) AND is_active = 1`,
        uniqueIds,
      );
      const activeIds = new Set(activeRows.map((p) => p.player_id));
      const invalid = uniqueIds.filter((id) => !activeIds.has(id));
      if (invalid.length > 0) {
        res.status(400).json({ error: `Players not active: ${invalid.join(', ')}` });
        return;
      }
    }

    let battingCount = 0;
    for (const stat of battingStats) {
      const playerId = Number(stat.playerId);
      if (!playerId) continue;

      const payload = {
        plateAppearances: Number(stat.plateAppearances ?? 0) || 0,
        singles: Number(stat.singles ?? 0) || 0,
        doubles: Number(stat.doubles ?? 0) || 0,
        triples: Number(stat.triples ?? 0) || 0,
        homeRuns: Number(stat.homeRuns ?? 0) || 0,
        runs: Number(stat.runsScored ?? 0) || 0,
        rbi: Number(stat.rbi ?? 0) || 0,
        walks: Number(stat.walks ?? 0) || 0,
        strikeouts: Number(stat.strikeouts ?? 0) || 0,
        hitByPitch: Number(stat.hitByPitch ?? 0) || 0,
        sacs: Number(stat.sacs ?? 0) || 0,
        stolenBases: Number(stat.stolenBases ?? 0) || 0,
        caughtStealing: Number(stat.caughtStealing ?? 0) || 0,
        isMVP: stat.isMVP ? 1 : 0,
      };

      const [updateResult] = await pool.execute(
        `UPDATE batting_stats SET
          plate_appearances = ?, singles = ?, doubles = ?, triples = ?,
          home_runs = ?, runs_scored = ?, rbi = ?, walks = ?,
          strikeouts = ?, hit_by_pitch = ?, sacs = ?, stolen_bases = ?,
          caught_stealing = ?, is_mvp = ?
        WHERE game_id = ? AND player_id = ?`,
        [
          payload.plateAppearances, payload.singles, payload.doubles, payload.triples,
          payload.homeRuns, payload.runs, payload.rbi, payload.walks,
          payload.strikeouts, payload.hitByPitch, payload.sacs, payload.stolenBases,
          payload.caughtStealing, payload.isMVP,
          gameId, playerId,
        ],
      );

      if (updateResult.affectedRows === 0) {
        await pool.execute(
          `INSERT INTO batting_stats (
            game_id, player_id, plate_appearances, singles, doubles, triples,
            home_runs, runs_scored, rbi, walks, strikeouts, hit_by_pitch,
            sacs, stolen_bases, caught_stealing, is_mvp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            gameId, playerId,
            payload.plateAppearances, payload.singles, payload.doubles, payload.triples,
            payload.homeRuns, payload.runs, payload.rbi, payload.walks,
            payload.strikeouts, payload.hitByPitch, payload.sacs, payload.stolenBases,
            payload.caughtStealing, payload.isMVP,
          ],
        );
      }
      battingCount++;
    }

    let pitchingCount = 0;
    for (const stat of pitchingStats) {
      const playerId = Number(stat.playerId);
      if (!playerId) continue;

      const outsRecorded = Number(stat.outsRecorded ?? 0) || 0;
      const payload = {
        pitchesThrown: Number(stat.pitchesThrown ?? 0) || 0,
        hitsAllowed: Number(stat.hitsAllowed ?? 0) || 0,
        runsAllowed: Number(stat.runsAllowed ?? 0) || 0,
        earnedRuns: Number(stat.earnedRuns ?? 0) || 0,
        strikeouts: Number(stat.strikeouts ?? 0) || 0,
        walks: Number(stat.walksAllowed ?? 0) || 0,
        hitBatters: Number(stat.hitBatters ?? 0) || 0,
        wins: Number(stat.w ?? 0) || 0,
        losses: Number(stat.l ?? 0) || 0,
        saveEarned: Number(stat.saveEarned ?? 0) || 0,
        isMVP: stat.isMVP ? 1 : 0,
      };

      const [updateResult] = await pool.execute(
        `UPDATE pitching_stats SET
          outs_recorded = ?, pitches_thrown = ?, hits_allowed = ?,
          runs_allowed = ?, earned_runs = ?, strikeouts = ?,
          walks_allowed = ?, hit_batters = ?, w = ?, l = ?,
          save_earned = ?, is_mvp = ?
        WHERE game_id = ? AND player_id = ?`,
        [
          outsRecorded, payload.pitchesThrown, payload.hitsAllowed,
          payload.runsAllowed, payload.earnedRuns, payload.strikeouts,
          payload.walks, payload.hitBatters, payload.wins, payload.losses,
          payload.saveEarned, payload.isMVP,
          gameId, playerId,
        ],
      );

      if (updateResult.affectedRows === 0) {
        await pool.execute(
          `INSERT INTO pitching_stats (
            game_id, player_id, outs_recorded, pitches_thrown, hits_allowed,
            runs_allowed, earned_runs, strikeouts, walks_allowed, hit_batters,
            w, l, save_earned, is_mvp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            gameId, playerId,
            outsRecorded, payload.pitchesThrown, payload.hitsAllowed,
            payload.runsAllowed, payload.earnedRuns, payload.strikeouts,
            payload.walks, payload.hitBatters, payload.wins, payload.losses,
            payload.saveEarned, payload.isMVP,
          ],
        );
      }
      pitchingCount++;
    }

    res.json({ ok: true, inserted: { batting: battingCount, pitching: pitchingCount } });
  } catch (error) {
    console.error('Failed to upload game stats', error);
    res.status(500).json({ error: 'Failed to upload game stats: ' + (error.message || 'Unknown error') });
  }
});

app.get('/api/player-career-batting-stats', async (req, res) => {
  try {
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const conditions = ['p.jersey_number = ?', 'p.first_name = ?', 'p.last_name = ?'];
    const params = [jerseyNumber, firstName, lastName];

    if (seasonId) {
      conditions.unshift('g.season_id = ?');
      params.unshift(seasonId);
    }

    const [rows] = await pool.execute(
      `
        select
          p.first_name,
          p.last_name,
          count(distinct bs.game_id) as games,
          sum(bs.plate_appearances) as pa,
          sum(bs.at_bats) as ab,
          sum(bs.singles + bs.doubles + bs.triples + bs.home_runs) as h,
          sum(bs.doubles) as doubles,
          sum(bs.triples) as triples,
          sum(bs.home_runs) as hr,
          sum(bs.rbi) as rbi,
          sum(bs.runs_scored) as r,
          sum(bs.stolen_bases) as sb,
          sum(bs.walks) as bb,
          sum(bs.hit_by_pitch) as hbp,
          sum(bs.strikeouts) as so,
          round(
            sum(bs.singles + bs.doubles + bs.triples + bs.home_runs)
            / nullif(sum(bs.at_bats), 0),
            3
          ) as avg,
          round(
            (sum(bs.singles + bs.doubles + bs.triples + bs.home_runs) + sum(bs.walks) + sum(bs.hit_by_pitch))
            / nullif(sum(bs.at_bats) + sum(bs.walks) + sum(bs.hit_by_pitch), 0),
            3
          ) as obp,
          round(
            (sum(bs.singles) + (sum(bs.doubles) * 2) + (sum(bs.triples) * 3) + (sum(bs.home_runs) * 4))
            / nullif(sum(bs.at_bats), 0),
            3
          ) as slg,
          round(
            (
              (sum(bs.singles + bs.doubles + bs.triples + bs.home_runs) + sum(bs.walks) + sum(bs.hit_by_pitch))
              / nullif(sum(bs.at_bats) + sum(bs.walks) + sum(bs.hit_by_pitch), 0)
            )
            + (
              (sum(bs.singles) + (sum(bs.doubles) * 2) + (sum(bs.triples) * 3) + (sum(bs.home_runs) * 4))
              / nullif(sum(bs.at_bats), 0)
            ),
            3
          ) as ops
        from players p
        join batting_stats bs on p.player_id = bs.player_id
        join games g on bs.game_id = g.game_id
        where ${conditions.join(' and ')}
        group by p.player_id
      `,
      params,
    );

    res.json(rows[0] ?? null);
  } catch (error) {
    console.error('Failed to load player career batting stats', error);
    res.status(500).json({ error: 'Failed to load player career batting stats' });
  }
});

app.get('/api/player-career-pitching-stats', async (req, res) => {
  try {
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const conditions = ['p.jersey_number = ?', 'p.first_name = ?', 'p.last_name = ?'];
    const params = [jerseyNumber, firstName, lastName];

    if (seasonId) {
      conditions.unshift('g.season_id = ?');
      params.unshift(seasonId);
    }

    const [rows] = await pool.execute(
      `
        select
          p.first_name,
          p.last_name,
          count(distinct ps.game_id) as g,
          sum(ps.w) as w,
          concat(floor(sum(ps.outs_recorded) / 3), '.', mod(sum(ps.outs_recorded), 3)) as ip,
          sum(ps.strikeouts) as so,
          sum(ps.walks_allowed) as bb,
          sum(ps.hits_allowed) as h,
          sum(ps.earned_runs) as er,
          round((sum(ps.earned_runs) * 9) / nullif(sum(ps.outs_recorded) / 3, 0), 2) as era,
          round((sum(ps.hits_allowed) + sum(ps.walks_allowed)) / nullif(sum(ps.outs_recorded) / 3, 0), 2) as whip,
          round((sum(ps.strikeouts) * 9) / nullif(sum(ps.outs_recorded) / 3, 0), 2) as k_9
        from players p
        join pitching_stats ps on p.player_id = ps.player_id
        join games g on ps.game_id = g.game_id
        where ${conditions.join(' and ')}
        group by p.player_id
      `,
      params,
    );

    res.json(rows[0] ?? null);
  } catch (error) {
    console.error('Failed to load player career pitching stats', error);
    res.status(500).json({ error: 'Failed to load player career pitching stats' });
  }
});

app.get('/api/player-seasons', async (req, res) => {
  try {
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          season_id as id,
          concat(season_year, ' ', season_term) as label
        from (
          select distinct
            s.season_id,
            s.season_year,
            s.season_term
          from games g
          join seasons s on g.season_id = s.season_id
          join batting_stats bs on bs.game_id = g.game_id
          join players p on bs.player_id = p.player_id
          where p.jersey_number = ?
            and p.first_name = ?
            and p.last_name = ?
          union
          select distinct
            s.season_id,
            s.season_year,
            s.season_term
          from games g
          join seasons s on g.season_id = s.season_id
          join pitching_stats ps on ps.game_id = g.game_id
          join players p on ps.player_id = p.player_id
          where p.jersey_number = ?
            and p.first_name = ?
            and p.last_name = ?
        ) player_seasons
        order by season_year desc, 
          case season_term
            when 'Winter' then 4
            when 'Fall' then 3
            when 'Summer' then 2
            when 'Spring' then 1
            else 0
          end desc
      `,
      [jerseyNumber, firstName, lastName, jerseyNumber, firstName, lastName],
    );

    // Get player's is_active status
    const [playerRows] = await pool.execute(
      `select is_active from players where jersey_number = ? and first_name = ? and last_name = ? limit 1`,
      [jerseyNumber, firstName, lastName],
    );
    const isActive = playerRows[0]?.is_active ?? 1;

    res.json({ seasons: rows, isActive });
  } catch (error) {
    console.error('Failed to load player seasons', error);
    res.status(500).json({ error: 'Failed to load player seasons' });
  }
});

app.get('/api/player-game-pitching-stats', async (req, res) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const conditions = ['p.jersey_number = ?', 'p.first_name = ?', 'p.last_name = ?'];
    const params = [jerseyNumber, firstName, lastName];

    if (seasonId) {
      conditions.unshift('g.season_id = ?');
      params.unshift(seasonId);
    }

    const [rows] = await pool.execute(
      `
        select
          g.game_id,
          g.game_date,
          g.opponent,
          g.is_friendly,
          g.score,
          g.opp_score,
          case
            when ps.outs_recorded is null then null
            else concat(floor(ps.outs_recorded / 3), '.', mod(ps.outs_recorded, 3))
          end as innings_pitched,
          ps.w as wins,
          ps.strikeouts,
          ps.runs_allowed,
          ps.earned_runs,
          ps.hits_allowed,
          ps.walks_allowed as walks,
          ps.hit_batters as hit_by_pitch,
          ps.pitches_thrown,
          ps.pitching_points
        from pitching_stats ps
        join games g on ps.game_id = g.game_id
        join players p on ps.player_id = p.player_id
        where ${conditions.join(' and ')}
        order by g.game_date desc
      `,
      params,
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to load player game pitching stats', error);
    res.status(500).json({ error: 'Failed to load player game pitching stats' });
  }
});

app.get('/api/seasonal-pitching-stats', async (req, res) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    let rows;

    if (seasonId) {
      [rows] = await pool.execute(
        `
          select
            sps.jersey_number,
            sps.first_name,
            sps.last_name,
            sps.games_played,
            sps.ip,
            sps.total_wins,
            sps.total_k,
            sps.total_runs_allowed,
            sps.total_er,
            sps.total_h,
            sps.total_bb,
            sps.total_hbp,
            sps.total_pitches_thrown,
            sps.era,
            sps.whip,
            sps.total_pitching_points,
            p.is_active
          from seasonal_pitching_stats sps
          join players p 
            on sps.jersey_number = p.jersey_number 
            and sps.first_name = p.first_name 
            and sps.last_name = p.last_name
          where sps.season_id = ?
        `,
        [seasonId],
      );
    } else {
      [rows] = await pool.execute(
        `
          select
            p.jersey_number,
            p.first_name,
            p.last_name,
            count(distinct ps.game_id) as games_played,
            concat(floor(sum(ps.outs_recorded) / 3), '.', mod(sum(ps.outs_recorded), 3)) as ip,
            sum(ps.w) as total_wins,
            sum(ps.strikeouts) as total_k,
            sum(ps.runs_allowed) as total_runs_allowed,
            sum(ps.earned_runs) as total_er,
            sum(ps.hits_allowed) as total_h,
            sum(ps.walks_allowed) as total_bb,
            sum(ps.hit_batters) as total_hbp,
            sum(ps.pitches_thrown) as total_pitches_thrown,
            round((sum(ps.earned_runs) * 9) / nullif(sum(ps.outs_recorded) / 3, 0), 2) as era,
            round((sum(ps.hits_allowed) + sum(ps.walks_allowed)) / nullif(sum(ps.outs_recorded) / 3, 0), 2) as whip,
            sum(ps.pitching_points) as total_pitching_points,
            p.is_active
          from pitching_stats ps
          join games g on ps.game_id = g.game_id
          join players p on ps.player_id = p.player_id
          group by p.player_id
          order by p.jersey_number
        `,
      );
    }

    res.json(rows);
  } catch (error) {
    console.error('Failed to load seasonal pitching stats', error);
    res.status(500).json({ error: 'Failed to load seasonal pitching stats' });
  }
});

app.get('/api/player-game-batting-stats', async (req, res) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const conditions = ['p.jersey_number = ?', 'p.first_name = ?', 'p.last_name = ?'];
    const params = [jerseyNumber, firstName, lastName];

    if (seasonId) {
      conditions.unshift('g.season_id = ?');
      params.unshift(seasonId);
    }

    const [rows] = await pool.execute(
      `
        select
          g.game_id,
          g.game_date,
          g.opponent,
          g.is_friendly,
          g.score,
          g.opp_score,
          bs.plate_appearances,
          bs.at_bats,
          bs.singles,
          bs.doubles,
          bs.triples,
          bs.home_runs,
          bs.runs_scored,
          bs.rbi,
          bs.walks,
          bs.hit_by_pitch,
          bs.strikeouts,
          bs.stolen_bases,
          bs.caught_stealing,
          bs.batting_points
        from batting_stats bs
        join games g on bs.game_id = g.game_id
        join players p on bs.player_id = p.player_id
        where ${conditions.join(' and ')}
        order by g.game_date desc
      `,
      params,
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to load player game batting stats', error);
    res.status(500).json({ error: 'Failed to load player game batting stats' });
  }
});

app.get('/api/player-walkup-song', async (req, res) => {
  try {
    const jerseyNumber = req.query.jerseyNumber;
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;

    if (!jerseyNumber || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing player identifiers' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          ws.song_id,
          ws.player_id,
          ws.song_title,
          ws.artist_name,
          ws.spotify_track_id,
          ws.start_time_seconds
        from walkup_songs ws
        join players p on ws.player_id = p.player_id
        where p.jersey_number = ?
          and p.first_name = ?
          and p.last_name = ?
        order by ws.song_id desc
        limit 1
      `,
      [jerseyNumber, firstName, lastName],
    );

    const song = rows[0] ?? null;
    if (!song) {
      res.json(null);
      return;
    }

    const normalizedTrackId = extractSpotifyTrackId(song.spotify_track_id);
    const spotifyTrackUrl = normalizedTrackId
      ? `https://open.spotify.com/track/${normalizedTrackId}`
      : null;
    const albumArtUrl = normalizedTrackId
      ? await fetchSpotifyThumbnailUrl(normalizedTrackId)
      : null;

    res.json({
      ...song,
      spotify_track_id: normalizedTrackId,
      spotify_track_url: spotifyTrackUrl,
      album_art_url: albumArtUrl,
    });
  } catch (error) {
    console.error('Failed to load player walkup song', error);
    res.status(500).json({ error: 'Failed to load player walkup song' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const seasonId = req.query.seasonId ? Number(req.query.seasonId) : null;
    const conditions = [];
    const params = [];

    if (seasonId) {
      conditions.push('g.season_id = ?');
      params.push(seasonId);
    }

    const [rows] = await pool.execute(
      `
        select
          g.game_id,
          g.game_date,
          g.opponent,
          g.is_friendly,
          g.score,
          g.opp_score,
          (select count(*) from batting_stats bs where bs.game_id = g.game_id) as batting_count,
          (select count(*) from pitching_stats ps where ps.game_id = g.game_id) as pitching_count
        from games g
        ${conditions.length ? `where ${conditions.join(' and ')}` : ''}
        order by g.game_date desc
      `,
      params,
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to load game records', error);
    res.status(500).json({ error: 'Failed to load game records' });
  }
});

app.get('/api/game-info', async (req, res) => {
  try {
    const gameId = Number(req.query.gameId);
    if (!gameId) {
      res.status(400).json({ error: 'Missing gameId' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          g.game_id,
          g.game_date,
          g.opponent,
          g.is_friendly,
          g.score,
          g.opp_score,
          s.season_year,
          s.season_term
        from games g
        left join seasons s on g.season_id = s.season_id
        where g.game_id = ?
        limit 1
      `,
      [gameId],
    );

    res.json(rows[0] ?? null);
  } catch (error) {
    console.error('Failed to load game info', error);
    res.status(500).json({ error: 'Failed to load game info' });
  }
});

app.get('/api/game-batting-stats', async (req, res) => {
  try {
    const gameId = Number(req.query.gameId);
    if (!gameId) {
      res.status(400).json({ error: 'Missing gameId' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          p.player_id,
          p.jersey_number,
          p.first_name,
          p.last_name,
          bs.plate_appearances,
          bs.at_bats,
          bs.singles,
          bs.doubles,
          bs.triples,
          bs.home_runs,
          bs.runs_scored,
          bs.rbi,
          bs.walks,
          bs.hit_by_pitch,
          bs.strikeouts,
          bs.stolen_bases,
          bs.caught_stealing,
          bs.sacs,
          bs.is_mvp,
          bs.batting_points
        from batting_stats bs
        join players p on bs.player_id = p.player_id
        where bs.game_id = ?
        order by p.jersey_number
      `,
      [gameId],
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to load game batting stats', error);
    res.status(500).json({ error: 'Failed to load game batting stats' });
  }
});

app.get('/api/game-pitching-stats', async (req, res) => {
  try {
    const gameId = Number(req.query.gameId);
    if (!gameId) {
      res.status(400).json({ error: 'Missing gameId' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          p.player_id,
          p.jersey_number,
          p.first_name,
          p.last_name,
          ps.outs_recorded,
          case
            when ps.outs_recorded is null then null
            else concat(floor(ps.outs_recorded / 3), '.', mod(ps.outs_recorded, 3))
          end as innings_pitched,
          ps.w as wins,
          ps.l as losses,
          ps.save_earned,
          ps.strikeouts,
          ps.runs_allowed,
          ps.earned_runs,
          ps.hits_allowed,
          ps.walks_allowed as walks,
          ps.hit_batters as hit_by_pitch,
          ps.pitches_thrown,
          ps.is_mvp,
          ps.pitching_points
        from pitching_stats ps
        join players p on ps.player_id = p.player_id
        where ps.game_id = ?
        order by p.jersey_number
      `,
      [gameId],
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to load game pitching stats', error);
    res.status(500).json({ error: 'Failed to load game pitching stats' });
  }
});


app.get('/api/seasons', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `select 
         s.season_id, 
         s.season_year,
         s.season_term,
         concat(s.season_year, ' ', s.season_term) as label,
         s.manager_player_id, 
         p.first_name as manager_first_name, 
         p.last_name as manager_last_name
       from seasons s
       left join players p on s.manager_player_id = p.player_id
       order by s.season_year desc, 
         case s.season_term
           when 'Winter' then 4
           when 'Fall' then 3
           when 'Summer' then 2
           when 'Spring' then 1
           else 0
         end desc`
    );

    // Format the data for the frontend
    // We combine "2025" and "Fall" to make "2025 Fall"
    const formattedSeasons = rows.map((row) => ({
      id: row.season_id,
      label: row.label ?? `${row.season_year} ${row.season_term}`,
      manager: row.manager_first_name && row.manager_last_name
        ? `${row.manager_first_name} ${row.manager_last_name}`
        : null,
      managerPlayerId: row.manager_player_id ?? null,
      seasonYear: row.season_year,
      seasonTerm: row.season_term,
    }));

    res.json(formattedSeasons);
  } catch (error) {
    console.error('Failed to load seasons', error);
    res.status(500).json({ error: 'Failed to load seasons' });
  }
});

app.post('/api/seasons', requireAdmin, async (req, res) => {
  try {
    const seasonYear = req.body?.seasonYear;
    const seasonTerm = req.body?.seasonTerm;
    const managerPlayerId = req.body?.managerPlayerId ?? null;

    if (seasonYear === undefined || seasonYear === null || seasonTerm === undefined || seasonTerm === null) {
      res.status(400).json({ error: 'Missing seasonYear or seasonTerm' });
      return;
    }

    const yearNumber = Number(seasonYear);
    const termString = String(seasonTerm).trim();

    if (!Number.isFinite(yearNumber) || !termString) {
      res.status(400).json({ error: 'Invalid seasonYear or seasonTerm' });
      return;
    }

    const managerIdNumber = managerPlayerId === null ? null : Number(managerPlayerId);
    if (managerIdNumber !== null && !Number.isFinite(managerIdNumber)) {
      res.status(400).json({ error: 'Invalid managerPlayerId' });
      return;
    }

    const [result] = await pool.execute(
      `insert into seasons (season_year, season_term, manager_player_id) values (?, ?, ?)`,
      [yearNumber, termString, managerIdNumber],
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Failed to create season', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

app.post('/api/games', requireAdmin, async (req, res) => {
  try {
    const seasonId = req.body?.seasonId;
    const gameDate = req.body?.gameDate;
    const opponent = req.body?.opponent;
    const isFriendly = req.body?.isFriendly ?? 0;
    const score = req.body?.score ?? null;
    const oppScore = req.body?.oppScore ?? null;

    if (!seasonId || !gameDate || !opponent) {
      res.status(400).json({ error: 'Missing seasonId, gameDate, or opponent' });
      return;
    }

    const seasonIdNumber = Number(seasonId);
    const opponentString = String(opponent).trim();
    const friendlyValue = isFriendly ? 1 : 0;

    if (!Number.isFinite(seasonIdNumber) || !opponentString) {
      res.status(400).json({ error: 'Invalid seasonId or opponent' });
      return;
    }

    const scoreNumber = score === null || score === '' ? null : Number(score);
    const oppScoreNumber = oppScore === null || oppScore === '' ? null : Number(oppScore);
    if (scoreNumber !== null && !Number.isFinite(scoreNumber)) {
      res.status(400).json({ error: 'Invalid score' });
      return;
    }
    if (oppScoreNumber !== null && !Number.isFinite(oppScoreNumber)) {
      res.status(400).json({ error: 'Invalid oppScore' });
      return;
    }

    const [result] = await pool.execute(
      `
        insert into games (season_id, game_date, opponent, is_friendly, score, opp_score)
        values (?, ?, ?, ?, ?, ?)
      `,
      [seasonIdNumber, gameDate, opponentString, friendlyValue, scoreNumber, oppScoreNumber],
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Failed to create game', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

app.delete('/api/games/:gameId', requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!gameId || !Number.isFinite(gameId)) {
      res.status(400).json({ error: 'Invalid gameId' });
      return;
    }

    const [battingDel] = await pool.execute('DELETE FROM batting_stats WHERE game_id = ?', [gameId]);
    const [pitchingDel] = await pool.execute('DELETE FROM pitching_stats WHERE game_id = ?', [gameId]);
    await pool.execute('DELETE FROM games WHERE game_id = ?', [gameId]);

    res.json({
      ok: true,
      deleted: {
        battingStats: battingDel.affectedRows,
        pitchingStats: pitchingDel.affectedRows,
      },
    });
  } catch (error) {
    console.error('Failed to delete game', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});



// Get ONLY active players for the admin data entry forms
app.get('/api/active-players', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
        select player_id, first_name, last_name, jersey_number 
        from players 
        where is_active = 1 
        order by jersey_number asc
      `
    );

    const formattedPlayers = rows.map((row) => ({
      id: row.player_id,
      label: `${row.first_name} ${row.last_name} (#${row.jersey_number})`,
      jerseyNumber: row.jersey_number,
      firstName: row.first_name,
      lastName: row.last_name
    }));

    res.json(formattedPlayers);
  } catch (error) {
    console.error('Failed to load active players', error);
    res.status(500).json({ error: 'Failed to load active players' });
  }
});

app.get('/api/inactive-players', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
        select player_id, first_name, last_name, jersey_number 
        from players 
        where is_active = 0 
        order by jersey_number asc
      `
    );

    const formattedPlayers = rows.map((row) => ({
      id: row.player_id,
      label: `${row.first_name} ${row.last_name} (#${row.jersey_number})`,
      jerseyNumber: row.jersey_number,
      firstName: row.first_name,
      lastName: row.last_name
    }));

    res.json(formattedPlayers);
  } catch (error) {
    console.error('Failed to load inactive players', error);
    res.status(500).json({ error: 'Failed to load inactive players' });
  }
});

app.get('/api/players', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
        select player_id, first_name, last_name, jersey_number, is_active
        from players
        order by is_active desc, jersey_number asc, last_name asc, first_name asc
      `,
    );

    const formattedPlayers = rows.map((row) => ({
      id: row.player_id,
      jerseyNumber: row.jersey_number,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active,
    }));

    res.json(formattedPlayers);
  } catch (error) {
    console.error('Failed to load players', error);
    res.status(500).json({ error: 'Failed to load players' });
  }
});

app.post('/api/players', requireAdmin, async (req, res) => {
  try {
    const jerseyNumber = req.body?.jerseyNumber;
    const firstName = req.body?.firstName;
    const lastName = req.body?.lastName;
    const isActive = req.body?.isActive ?? 1;

    if (jerseyNumber === undefined || jerseyNumber === null || !firstName || !lastName) {
      res.status(400).json({ error: 'Missing jerseyNumber, firstName, or lastName' });
      return;
    }

    const jerseyNumberValue = Number(jerseyNumber);
    if (!Number.isFinite(jerseyNumberValue)) {
      res.status(400).json({ error: 'Invalid jerseyNumber' });
      return;
    }

    const firstNameValue = String(firstName).trim();
    const lastNameValue = String(lastName).trim();
    if (!firstNameValue || !lastNameValue) {
      res.status(400).json({ error: 'Invalid firstName or lastName' });
      return;
    }

    const isActiveValue = isActive ? 1 : 0;

    const [result] = await pool.execute(
      `insert into players (jersey_number, first_name, last_name, is_active) values (?, ?, ?, ?)`,
      [jerseyNumberValue, firstNameValue, lastNameValue, isActiveValue],
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Failed to create player', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

app.patch('/api/players/:playerId', requireAdmin, async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    if (!playerId) {
      res.status(400).json({ error: 'Missing playerId' });
      return;
    }

    const jerseyNumber = req.body?.jerseyNumber;
    const isActive = req.body?.isActive;
    const firstName = req.body?.firstName;
    const lastName = req.body?.lastName;

    const fields = [];
    const params = [];

    if (jerseyNumber !== undefined) {
      const jerseyNumberValue = Number(jerseyNumber);
      if (!Number.isFinite(jerseyNumberValue)) {
        res.status(400).json({ error: 'Invalid jerseyNumber' });
        return;
      }
      fields.push('jersey_number = ?');
      params.push(jerseyNumberValue);
    }

    if (isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (firstName !== undefined) {
      const firstNameValue = String(firstName).trim();
      if (!firstNameValue) {
        res.status(400).json({ error: 'Invalid firstName' });
        return;
      }
      fields.push('first_name = ?');
      params.push(firstNameValue);
    }

    if (lastName !== undefined) {
      const lastNameValue = String(lastName).trim();
      if (!lastNameValue) {
        res.status(400).json({ error: 'Invalid lastName' });
        return;
      }
      fields.push('last_name = ?');
      params.push(lastNameValue);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    params.push(playerId);

    await pool.execute(
      `update players set ${fields.join(', ')} where player_id = ?`,
      params,
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to update player', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

app.get('/api/player-walkup-song-by-id', requireAdmin, async (req, res) => {
  try {
    const playerId = req.query.playerId ? Number(req.query.playerId) : null;
    if (!playerId) {
      res.status(400).json({ error: 'Missing playerId' });
      return;
    }

    const [rows] = await pool.execute(
      `
        select
          song_id,
          player_id,
          song_title,
          artist_name,
          spotify_track_id,
          start_time_seconds
        from walkup_songs
        where player_id = ?
        order by song_id desc
        limit 1
      `,
      [playerId],
    );

    const song = rows[0] ?? null;
    if (!song) {
      res.json(null);
      return;
    }

    const normalizedTrackId = extractSpotifyTrackId(song.spotify_track_id);
    const spotifyTrackUrl = normalizedTrackId
      ? `https://open.spotify.com/track/${normalizedTrackId}`
      : null;
    const albumArtUrl = normalizedTrackId
      ? await fetchSpotifyThumbnailUrl(normalizedTrackId)
      : null;

    res.json({
      ...song,
      spotify_track_id: normalizedTrackId,
      spotify_track_url: spotifyTrackUrl,
      album_art_url: albumArtUrl,
    });
  } catch (error) {
    console.error('Failed to load player walkup song by id', error);
    res.status(500).json({ error: 'Failed to load player walkup song by id' });
  }
});

app.post('/api/player-walkup-song', requireAdmin, async (req, res) => {
  try {
    const playerId = req.body?.playerId;
    const songTitle = req.body?.songTitle;
    const artistName = req.body?.artistName;
    const spotifyTrackId = req.body?.spotifyTrackId ?? null;
    const startTimeSeconds = req.body?.startTimeSeconds ?? 0;

    if (!playerId || !songTitle || !artistName) {
      res.status(400).json({ error: 'Missing playerId, songTitle, or artistName' });
      return;
    }

    const playerIdNumber = Number(playerId);
    if (!Number.isFinite(playerIdNumber)) {
      res.status(400).json({ error: 'Invalid playerId' });
      return;
    }

    const songTitleValue = String(songTitle).trim();
    const artistNameValue = String(artistName).trim();
    if (!songTitleValue || !artistNameValue) {
      res.status(400).json({ error: 'Invalid songTitle or artistName' });
      return;
    }

    const startTimeNumber = Number(startTimeSeconds);
    if (!Number.isFinite(startTimeNumber) || startTimeNumber < 0) {
      res.status(400).json({ error: 'Invalid startTimeSeconds' });
      return;
    }

    const spotifyTrackIdValue = spotifyTrackId === null ? null : String(spotifyTrackId).trim();

    const [result] = await pool.execute(
      `
        insert into walkup_songs (player_id, song_title, artist_name, spotify_track_id, start_time_seconds)
        values (?, ?, ?, ?, ?)
      `,
      [playerIdNumber, songTitleValue, artistNameValue, spotifyTrackIdValue, startTimeNumber],
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Failed to save player walkup song', error);
    res.status(500).json({ error: 'Failed to save player walkup song' });
  }
});


const port = Number(process.env.PORT) || 4000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', port });
});

// Debug endpoints (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug-env', (req, res) => {
    res.json({
      DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
      DB_PORT: process.env.DB_PORT ? 'SET' : 'NOT SET',
      DB_NAME: process.env.DB_NAME ? 'SET' : 'NOT SET',
      DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
      DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
      DB_SSL: process.env.DB_SSL,
      PORT: process.env.PORT,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET'
    });
  });

  app.get('/debug-db', async (req, res) => {
    try {
      console.log('Testing database connection...');
      console.log('DB_HOST:', process.env.DB_HOST);
      console.log('DB_PORT:', process.env.DB_PORT);
      console.log('DB_NAME:', process.env.DB_NAME);
      console.log('DB_USER:', process.env.DB_USER);
      console.log('DB_SSL:', process.env.DB_SSL);
      console.log('DB_SSL_CA:', process.env.DB_SSL_CA);
      
      const connection = await pool.getConnection();
      console.log('Database connection successful!');
      
      const [rows] = await connection.execute('SELECT 1 as test');
      connection.release();
      
      res.json({
        status: 'success',
        message: 'Database connection working',
        testQuery: rows,
        sslConfig: {
          enabled: sslEnabled,
          caPath: sslCaPath,
          rejectUnauthorized,
          caFileExists: sslCaPath ? fs.existsSync(sslCaPath) : false
        }
      });
    } catch (error) {
      console.error('Database connection failed:', error);
      res.json({
        status: 'error',
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        sslConfig: {
          enabled: sslEnabled,
          caPath: sslCaPath,
          rejectUnauthorized,
          caFileExists: sslCaPath ? fs.existsSync(sslCaPath) : false
        }
      });
    }
  });
}

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
