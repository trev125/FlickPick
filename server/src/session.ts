import { customAlphabet } from "nanoid";
import { Session, UserPreferences, Movie } from "./types.js";
import { getAllMovies, enrichMovieWithRatings } from "./plex.js";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const sessions = new Map<string, Session>();

export function createSession(movieCount: number = 25): Session {
  const code = generateCode();
  const session: Session = {
    code,
    createdAt: new Date(),
    movieCount: Math.min(Math.max(movieCount, 5), 100), // Clamp between 5 and 100
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
      votes: {},
      votingComplete: false,
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
  // Support both solo (1 user) and duo (2 users) modes
  return users.length >= 1 && users.length <= 2 && users.every((u) => u.preferences !== null);
}

export function isSoloSession(session: Session): boolean {
  return Object.keys(session.users).length === 1;
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
  const prefs2 = users.length > 1 ? users[1].preferences! : null;
  const solo = prefs2 === null;

  // Get all movies from Plex
  let movies = await getAllMovies();

  // Compute ranges (solo uses just prefs1, duo computes overlap)
  const yearRange = solo ? prefs1.yearRange : computeOverlappingRange(prefs1.yearRange, prefs2.yearRange);
  const runtimeRange = solo ? prefs1.runtimeRange : computeOverlappingRange(prefs1.runtimeRange, prefs2.runtimeRange);

  // Combined preferences
  const combinedPrefs: UserPreferences = solo ? {
    ...prefs1,
    yearRange,
    runtimeRange,
  } : {
    genres: [...new Set([...prefs1.genres, ...prefs2.genres])],
    yearRange,
    runtimeRange,
    minImdbRating: Math.max(prefs1.minImdbRating || 0, prefs2.minImdbRating || 0) || null,
    minRtCriticRating: Math.max(prefs1.minRtCriticRating || 0, prefs2.minRtCriticRating || 0) || null,
    minRtAudienceRating: Math.max(prefs1.minRtAudienceRating || 0, prefs2.minRtAudienceRating || 0) || null,
    includeWatched: prefs1.includeWatched && prefs2.includeWatched,
  };

  // Filter movies that match criteria
  let candidates = movies.filter((m) => {
    // Check watched status
    if (!combinedPrefs.includeWatched && m.watched) return false;

    // Check genres
    if (prefs1.genres.length > 0 && !m.genres.some((g) => prefs1.genres.includes(g))) return false;
    if (prefs2 && prefs2.genres.length > 0 && !m.genres.some((g) => prefs2.genres.includes(g))) return false;

    // Check year range
    if (yearRange && (m.year < yearRange.min || m.year > yearRange.max)) return false;

    // Check runtime range
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
  const maxToEnrich = Math.min(candidates.length, session.movieCount);
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
  const genresSkipped = solo 
    ? prefs1.genres.length === 0 
    : prefs1.genres.length === 0 && prefs2!.genres.length === 0;
  const yearSkipped = solo 
    ? prefs1.yearRange === null 
    : prefs1.yearRange === null && prefs2!.yearRange === null;
  const runtimeSkipped = solo 
    ? prefs1.runtimeRange === null 
    : prefs1.runtimeRange === null && prefs2!.runtimeRange === null;
  const ratingSkipped = solo
    ? (prefs1.minImdbRating === null || prefs1.minImdbRating === 0)
    : (prefs1.minImdbRating === null || prefs1.minImdbRating === 0) && 
      (prefs2!.minImdbRating === null || prefs2!.minImdbRating === 0);

  // Find common genres (solo just uses prefs1)
  const commonGenres = solo ? prefs1.genres : prefs1.genres.filter(g => prefs2!.genres.includes(g));
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

// Vote on a movie
export function voteOnMovie(
  code: string,
  userId: string,
  movieId: string,
  vote: boolean
): { success: boolean; votingComplete: boolean } | null {
  const session = sessions.get(code.toUpperCase());
  if (!session || !session.users[userId]) return null;

  session.users[userId].votes[movieId] = vote;
  
  // Check if user has voted on all movies
  const totalMovies = session.matchedMovies.length;
  const userVotes = Object.keys(session.users[userId].votes).length;
  const votingComplete = userVotes >= totalMovies;
  
  if (votingComplete) {
    session.users[userId].votingComplete = true;
  }

  return { success: true, votingComplete };
}

// Check if all users have finished voting
export function allVotingComplete(session: Session): boolean {
  const users = Object.values(session.users);
  return users.length >= 1 && users.every((u) => u.votingComplete);
}

// Get voting results
export interface VotingResults {
  bothYes: Movie[];
  user1No: Movie[];
  user2No: Movie[];
  bothNo: Movie[];
}

export function getVotingResults(code: string): VotingResults | null {
  const session = sessions.get(code.toUpperCase());
  if (!session) return null;

  const userIds = Object.keys(session.users);
  const user1Id = userIds[0];
  const user2Id = userIds[1]; // May be undefined for solo

  const bothYes: Movie[] = [];
  const user1No: Movie[] = [];
  const user2No: Movie[] = [];
  const bothNo: Movie[] = [];

  console.log(`getVotingResults: user1=${user1Id}, user2=${user2Id || 'solo'}`);
  console.log(`User1 votes:`, session.users[user1Id]?.votes);
  if (user2Id) console.log(`User2 votes:`, session.users[user2Id]?.votes);

  for (const movie of session.matchedMovies) {
    // Get votes - undefined means not voted yet, true/false are actual votes
    const user1VoteRaw = session.users[user1Id]?.votes[movie.id];
    const user2VoteRaw = user2Id ? session.users[user2Id]?.votes[movie.id] : undefined;
    
    // Convert to boolean: true = yes, false = no (or not voted counts as no)
    const user1Vote = user1VoteRaw === true;
    const user2Vote = user2Id ? user2VoteRaw === true : true; // Solo mode: treat as yes

    if (user1Vote && user2Vote) {
      bothYes.push(movie);
    } else if (!user1Vote && !user2Vote) {
      bothNo.push(movie);
    } else if (!user1Vote) {
      user1No.push(movie);
    } else {
      user2No.push(movie);
    }
  }

  console.log(`Results: bothYes=${bothYes.length}, user1No=${user1No.length}, user2No=${user2No.length}, bothNo=${bothNo.length}`);
  return { bothYes, user1No, user2No, bothNo };
}

// Get user's current voting position
export function getUserVotingPosition(code: string, userId: string): number {
  const session = sessions.get(code.toUpperCase());
  if (!session || !session.users[userId]) return 0;
  return Object.keys(session.users[userId].votes).length;
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
