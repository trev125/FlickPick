export interface Movie {
  id: string;
  title: string;
  year: number;
  decade: string;
  genres: string[];
  runtime: number;
  runtimeBlock: string;
  imdbRating: number | null;
  rtCriticRating: number | null;
  rtAudienceRating: number | null;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  imdbId: string | null;
  poster: string | null;
  backdrop: string | null;
  summary: string | null;
  watched: boolean;
  contentRating: string | null;
  director: string | null;
  directorImage: string | null;
  cast: { name: string; image: string | null }[];
  keywords: string[];
  collection: string | null;
}

export interface UserPreferences {
  genres: string[];
  minImdbRating: number | null;
  minRtCriticRating: number | null;
  minRtAudienceRating: number | null;
  runtimeRange: { min: number; max: number } | null;
  yearRange: { min: number; max: number } | null;
  includeWatched: boolean;
}

export interface SessionUser {
  id: string;
  name: string;
  hasSubmitted: boolean;
  votingComplete: boolean;
  votesCount: number;
}

export interface SessionInfo {
  code: string;
  userCount: number;
  submittedCount: number;
  votingCompleteCount: number;
  movieCount: number;
  totalMovies: number;
  allVotingComplete: boolean;
  users: SessionUser[];
  hasResult: boolean;
}

export interface VotingResults {
  bothYes: Movie[];
  user1No: Movie[];
  user2No: Movie[];
  bothNo: Movie[];
  users: { id: string; name: string }[];
}

export interface FilterOptions {
  genres: string[];
  runtimeBlocks: string[];
  decades: string[];
  moods: string[];
  moodGenreMap: Record<string, string[]>;
}

export interface MatchedCriteria {
  genres: string[];
  genresSkipped: boolean;
  yearRange: { min: number; max: number } | null;
  yearSkipped: boolean;
  runtimeRange: { min: number; max: number } | null;
  runtimeSkipped: boolean;
  minImdbRating: number | null;
  ratingSkipped: boolean;
}

export interface MatchResult {
  result: Movie | null;
  totalMatches: number;
  currentIndex: number;
  isLast: boolean;
  matchedCriteria: MatchedCriteria | null;
  movies: Movie[];
}
