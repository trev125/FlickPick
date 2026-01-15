import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), "../.env") });

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  createSession,
  getSession,
  joinSession,
  submitPreferences,
  allUsersSubmitted,
  calculateMatch,
  rerollMovie,
  previousMovie,
  voteOnMovie,
  allVotingComplete,
  getVotingResults,
  getUserVotingPosition,
} from "./session.js";
import { getAvailableGenres, getMovieLibrarySections } from "./plex.js";
import { RUNTIME_BLOCKS, DECADES, MOODS } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientPath));
}

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

// Get available filter options
app.get("/api/filters", async (_, res) => {
  try {
    const genres = await getAvailableGenres();
    res.json({
      genres,
      runtimeBlocks: RUNTIME_BLOCKS.map((b) => b.label),
      decades: [...DECADES],
      moods: Object.keys(MOODS),
      moodGenreMap: MOODS,
    });
  } catch (error) {
    console.error("Failed to get filters:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// Get Plex library sections
app.get("/api/libraries", async (_, res) => {
  try {
    const sections = await getMovieLibrarySections();
    res.json({ sections });
  } catch (error) {
    console.error("Failed to get libraries:", error);
    res.status(500).json({ error: "Failed to fetch libraries" });
  }
});

// Create a new session
app.post("/api/session", (req, res) => {
  const { movieCount } = req.body || {};
  const session = createSession(movieCount);
  res.json({ code: session.code, movieCount: session.movieCount });
});

// Get session info
app.get("/api/session/:code", (req, res) => {
  const session = getSession(req.params.code);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const userCount = Object.keys(session.users).length;
  const submittedCount = Object.values(session.users).filter(
    (u) => u.preferences !== null
  ).length;

  const votingCompleteCount = Object.values(session.users).filter(
    (u) => u.votingComplete
  ).length;

  res.json({
    code: session.code,
    userCount,
    submittedCount,
    votingCompleteCount,
    movieCount: session.movieCount,
    totalMovies: session.matchedMovies.length,
    allVotingComplete: allVotingComplete(session),
    users: Object.entries(session.users).map(([id, u]) => ({
      id,
      name: u.name,
      hasSubmitted: u.preferences !== null,
      votingComplete: u.votingComplete,
      votesCount: Object.keys(u.votes).length,
    })),
    hasResult: session.result !== null,
  });
});

// Join a session
app.post("/api/session/:code/join", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ error: "userId and name are required" });
  }

  const session = joinSession(req.params.code, userId, name);
  if (!session) {
    return res.status(404).json({ error: "Session not found or full" });
  }

  res.json({
    code: session.code,
    joined: true,
  });
});

// Submit preferences
app.post("/api/session/:code/preferences", (req, res) => {
  const { userId, preferences } = req.body;

  if (!userId || !preferences) {
    return res
      .status(400)
      .json({ error: "userId and preferences are required" });
  }

  const session = submitPreferences(req.params.code, userId, preferences);
  if (!session) {
    return res
      .status(404)
      .json({ error: "Session not found or user not in session" });
  }

  res.json({
    submitted: true,
    allSubmitted: allUsersSubmitted(session),
  });
});

// Get match result
app.get("/api/session/:code/result", async (req, res) => {
  let session = getSession(req.params.code);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (!allUsersSubmitted(session)) {
    return res
      .status(400)
      .json({ error: "Not all users have submitted preferences" });
  }

  // Calculate match if not already done
  if (!session.result && session.matchedMovies.length === 0) {
    console.log(`Calculating match for session ${req.params.code}`);
    session = await calculateMatch(req.params.code);
  } else {
    console.log(`Using cached result for session ${req.params.code}`);
  }

  if (!session) {
    return res.status(500).json({ error: "Failed to calculate match" });
  }

  const isLast = session.currentIndex >= session.matchedMovies.length - 1;
  
  res.json({
    result: session.result,
    totalMatches: session.matchedMovies.length,
    currentIndex: session.currentIndex,
    isLast,
    matchedCriteria: session.matchedCriteria,
    movies: session.matchedMovies, // Include all movies for voting
  });
});

// Reroll - move to next movie in shuffled list
app.post("/api/session/:code/reroll", (req, res) => {
  const result = rerollMovie(req.params.code);
  if (!result) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(result);
});

// Previous - move to previous movie in shuffled list
app.post("/api/session/:code/previous", (req, res) => {
  const result = previousMovie(req.params.code);
  if (!result) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(result);
});

// Vote on a movie
app.post("/api/session/:code/vote", (req, res) => {
  const { userId, movieId, vote } = req.body;

  if (!userId || !movieId || vote === undefined) {
    return res.status(400).json({ error: "userId, movieId, and vote are required" });
  }

  const result = voteOnMovie(req.params.code, userId, movieId, vote);
  if (!result) {
    return res.status(404).json({ error: "Session not found or user not in session" });
  }

  res.json(result);
});

// Get user's voting position
app.get("/api/session/:code/voting-position/:userId", (req, res) => {
  const position = getUserVotingPosition(req.params.code, req.params.userId);
  res.json({ position });
});

// Get voting results
app.get("/api/session/:code/voting-results", (req, res) => {
  const session = getSession(req.params.code);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (!allVotingComplete(session)) {
    return res.status(400).json({ error: "Not all users have finished voting" });
  }

  const results = getVotingResults(req.params.code);
  if (!results) {
    return res.status(500).json({ error: "Failed to get voting results" });
  }

  // Include user names for display
  const userNames = Object.entries(session.users).map(([id, u]) => ({
    id,
    name: u.name,
  }));

  res.json({ ...results, users: userNames });
});

// Image proxy - proxies Plex/TMDB images so they work from external networks
app.get("/api/image", async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "URL parameter required" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch image" });
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(500).json({ error: "Failed to proxy image" });
  }
});

// SPA fallback - serve index.html for all non-API routes in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../../client/dist");
  app.get("*", (_, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`FlickPick server running on port ${PORT}`);
});
