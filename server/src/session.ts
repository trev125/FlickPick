import { customAlphabet } from "nanoid";
import { Session, UserPreferences, Movie } from "./types.js";
import { getAllMovies, enrichMovieWithRatings } from "./plex.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const sessions = new Map<string, Session>();

export function createSession(): Session {
  const code = generateCode();
  const session: Session = {
    code,
    createdAt: new Date(),
    users: {},
    result: null,
    matchedMovies: [],
    currentIndex: 0,
    matchedCriteria: null,
  };
  sessions.set(code, session);
  return session;
}

export function getSession(code: string): Session | null {
  return sessions.get(code.toUpperCase()) || null;
}

export function joinSession(
  code: string,
  userId: string,
  name: string
): Session | null {
  const session = sessions.get(code.toUpperCase());
  if (!session) return null;

  if (Object.keys(session.users).length >= 2 && !session.users[userId]) {
    return null; // Session full
  }

  if (!session.users[userId]) {
    session.users[userId] = {
      name,
      preferences: null,
      joinedAt: new Date(),
    };
  }

  return session;
}

export function submitPreferences(
  code: string,
  userId: string,
  preferences: UserPreferences
): Session | null {
  const session = sessions.get(code.toUpperCase());
  if (!session || !session.users[userId]) return null;

  session.users[userId].preferences = preferences;
  return session;
}

export function allUsersSubmitted(session: Session): boolean {
  const users = Object.values(session.users);
  return users.length === 2 && users.every((u) => u.preferences !== null);
}

function computeOverlappingRange(
  range1: { min: number; max: number } | null,
  range2: { min: number; max: number } | null
): { min: number; max: number } | null {
  if (!range1 && !range2) return null;
  if (!range1) return range2;
  if (!range2) return range1;
  
  // Find the overlap
  const min = Math.max(range1.min, range2.min);
  const max = Math.min(range1.max, range2.max);
  
  // If no overlap, return null (will result in no matches)
  if (min > max) return null;
  
  return { min, max };
}

export async function calculateMatch(code: string): Promise<Session | null> {
  const session = sessions.get(code.toUpperCase());
  if (!session || !allUsersSubmitted(session)) return null;

  const users = Object.values(session.users);
  const prefs1 = users[0].preferences!;
  const prefs2 = users[1].preferences!;

  // Get all movies from Plex
  let movies = await getAllMovies();

  // Compute overlapping ranges
  const yearRange = computeOverlappingRange(prefs1.yearRange, prefs2.yearRange);
  const runtimeRange = computeOverlappingRange(prefs1.runtimeRange, prefs2.runtimeRange);

  // First pass: filter by non-rating criteria (fast)
  const combinedPrefs: UserPreferences = {
    genres: [...new Set([...prefs1.genres, ...prefs2.genres])],
    yearRange,
    runtimeRange,
    minImdbRating: Math.max(prefs1.minImdbRating || 0, prefs2.minImdbRating || 0) || null,
    minRtCriticRating: Math.max(prefs1.minRtCriticRating || 0, prefs2.minRtCriticRating || 0) || null,
    minRtAudienceRating: Math.max(prefs1.minRtAudienceRating || 0, prefs2.minRtAudienceRating || 0) || null,
    includeWatched: prefs1.includeWatched && prefs2.includeWatched,
  };

  // Filter movies that match both users' basic criteria
  let candidates = movies.filter((m) => {
    // Check watched status
    if (!combinedPrefs.includeWatched && m.watched) return false;

    // Check genres (movie must have at least one genre each user selected, if they selected any)
    if (prefs1.genres.length > 0 && !m.genres.some((g) => prefs1.genres.includes(g))) return false;
    if (prefs2.genres.length > 0 && !m.genres.some((g) => prefs2.genres.includes(g))) return false;

    // Check year range (overlap of both users' preferences)
    if (yearRange && (m.year < yearRange.min || m.year > yearRange.max)) return false;

    // Check runtime range (overlap of both users' preferences)
    if (runtimeRange && (m.runtime < runtimeRange.min || m.runtime > runtimeRange.max)) return false;

    return true;
  });

  // Shuffle candidates BEFORE selecting which ones to enrich
  // This ensures we get a random sample, not just alphabetically first
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Enrich top candidates with ratings (to save API calls)
  const maxToEnrich = Math.min(candidates.length, 50);
  const enriched: Movie[] = [];

  for (let i = 0; i < maxToEnrich; i++) {
    const enrichedMovie = await enrichMovieWithRatings(candidates[i]);
    
    // Check rating filters
    if (combinedPrefs.minImdbRating && enrichedMovie.imdbRating !== null) {
      if (enrichedMovie.imdbRating < combinedPrefs.minImdbRating) continue;
    }
    if (combinedPrefs.minRtCriticRating && enrichedMovie.rtCriticRating !== null) {
      if (enrichedMovie.rtCriticRating < combinedPrefs.minRtCriticRating) continue;
    }

    enriched.push(enrichedMovie);
  }

  // Shuffle again for final presentation order
  for (let i = enriched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [enriched[i], enriched[j]] = [enriched[j], enriched[i]];
  }

  session.matchedMovies = enriched;

  // Store the matched criteria for display
  // Track what was actually specified vs skipped
  const genresSkipped = prefs1.genres.length === 0 && prefs2.genres.length === 0;
  const yearSkipped = prefs1.yearRange === null && prefs2.yearRange === null;
  const runtimeSkipped = prefs1.runtimeRange === null && prefs2.runtimeRange === null;
  const ratingSkipped = (prefs1.minImdbRating === null || prefs1.minImdbRating === 0) && 
                        (prefs2.minImdbRating === null || prefs2.minImdbRating === 0);

  // Find common genres between both users' selections
  const commonGenres = prefs1.genres.filter(g => prefs2.genres.includes(g));
  session.matchedCriteria = {
    genres: commonGenres.length > 0 ? commonGenres : combinedPrefs.genres,
    genresSkipped,
    yearRange,
    yearSkipped,
    runtimeRange,
    runtimeSkipped,
    minImdbRating: combinedPrefs.minImdbRating,
    ratingSkipped,
  };

  // Set to first movie in shuffled list
  session.currentIndex = 0;
  if (enriched.length > 0) {
    session.result = enriched[0];
  }

  return session;
}

export function rerollMovie(code: string): { result: Movie | null; isLast: boolean; isFirst: boolean } | null {
  const session = sessions.get(code.toUpperCase());
  if (!session || session.matchedMovies.length === 0) return null;

  // Move to next movie
  session.currentIndex++;
  
  // Check if we've reached the end
  if (session.currentIndex >= session.matchedMovies.length) {
    session.currentIndex = session.matchedMovies.length - 1;
    return { result: session.result, isLast: true, isFirst: false };
  }

  session.result = session.matchedMovies[session.currentIndex];
  const isLast = session.currentIndex >= session.matchedMovies.length - 1;
  const isFirst = session.currentIndex === 0;
  
  return { result: session.result, isLast, isFirst };
}

export function previousMovie(code: string): { result: Movie | null; isLast: boolean; isFirst: boolean } | null {
  const session = sessions.get(code.toUpperCase());
  if (!session || session.matchedMovies.length === 0) return null;

  // Move to previous movie
  session.currentIndex--;
  
  // Check if we've reached the beginning
  if (session.currentIndex < 0) {
    session.currentIndex = 0;
    return { result: session.result, isLast: false, isFirst: true };
  }

  session.result = session.matchedMovies[session.currentIndex];
  const isLast = session.currentIndex >= session.matchedMovies.length - 1;
  const isFirst = session.currentIndex === 0;
  
  return { result: session.result, isLast, isFirst };
}

// Cleanup old sessions (run periodically)
export function cleanupSessions(): void {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();

  for (const [code, session] of sessions) {
    if (now - session.createdAt.getTime() > maxAge) {
      sessions.delete(code);
    }
  }
}

setInterval(cleanupSessions, 60 * 60 * 1000); // Run every hour
