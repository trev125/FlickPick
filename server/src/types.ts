export interface Movie {
  id: string;
  title: string;
  year: number;
  decade: string;
  genres: string[];
  runtime: number; // in minutes
  runtimeBlock: string;
  imdbRating: number | null;
  rtCriticRating: number | null;
  rtAudienceRating: number | null;
  imdbId: string | null;
  poster: string | null;
  summary: string | null;
  watched: boolean;
  contentRating: string | null; // PG, R, PG-13, etc.
  director: string | null;
  directorImage: string | null;
  cast: { name: string; image: string | null }[];
}

export interface UserPreferences {
  genres: string[];
  minImdbRating: number | null;
  minRtCriticRating: number | null;
  minRtAudienceRating: number | null;
  runtimeRange: { min: number; max: number } | null; // in minutes
  yearRange: { min: number; max: number } | null;
  includeWatched: boolean;
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

export interface Session {
  code: string;
  createdAt: Date;
  movieCount: number; // Number of movies to choose from
  users: {
    [userId: string]: {
      name: string;
      preferences: UserPreferences | null;
      joinedAt: Date;
      votes: { [movieId: string]: boolean }; // true = yes, false = no
      votingComplete: boolean;
    };
  };
  result: Movie | null;
  matchedMovies: Movie[];
  currentIndex: number;
  matchedCriteria: MatchedCriteria | null;
}

export interface PlexMovie {
  ratingKey: string;
  title: string;
  year: number;
  Genre?: { tag: string }[];
  duration: number; // in milliseconds
  thumb?: string;
  summary?: string;
  viewCount?: number;
  guid?: string;
}

export const RUNTIME_BLOCKS = [
  { label: "Under 90 min", min: 0, max: 89 },
  { label: "90-120 min", min: 90, max: 120 },
  { label: "120-150 min", min: 121, max: 150 },
  { label: "Over 150 min", min: 151, max: Infinity },
] as const;

export const DECADES = [
  "1950s",
  "1960s",
  "1970s",
  "1980s",
  "1990s",
  "2000s",
  "2010s",
  "2020s",
] as const;

export const MOODS = {
  "Feel Good": ["Comedy", "Family", "Animation", "Romance"],
  "Edge of Seat": ["Action", "Thriller", "Horror", "Crime"],
  "Mind-Bending": ["Sci-Fi", "Mystery", "Thriller", "Fantasy"],
  "Tearjerker": ["Drama", "Romance", "Biography"],
  "Adventure Time": ["Adventure", "Action", "Fantasy", "Sci-Fi"],
  "Laugh Out Loud": ["Comedy", "Animation"],
  "Date Night": ["Romance", "Comedy", "Drama"],
  "Brain Off": ["Action", "Comedy", "Animation"],
} as const;
