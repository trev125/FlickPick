import { existsSync, readFileSync, writeFileSync } from "fs";
import { Movie, PlexMovie, RUNTIME_BLOCKS } from "./types.js";

function getPlexUrl() {
  return process.env.PLEX_URL || "http://localhost:32400";
}

function getPlexToken() {
  return process.env.PLEX_TOKEN || "";
}

function getOmdbApiKey() {
  return process.env.OMDB_API_KEY || "";
}

function getTmdbApiKey() {
  return process.env.TMDB_API_KEY || "";
}

function getDecade(year: number): string {
  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

function getRuntimeBlock(minutes: number): string {
  for (const block of RUNTIME_BLOCKS) {
    if (minutes >= block.min && minutes <= block.max) {
      return block.label;
    }
  }
  return "Over 150 min";
}

interface CastMember {
  name: string;
  image: string | null;
}

interface OmdbRatings {
  imdbRating: number | null;
  rtCriticRating: number | null;
  rtAudienceRating: number | null;
  imdbId: string | null;
  contentRating: string | null;
  director: string | null;
  directorImage: string | null;
  cast: CastMember[];
}

// File-based cache for ratings (persists across restarts)
const CACHE_DIR = process.env.NODE_ENV === "production" ? "/app/data" : ".";
const CACHE_FILE = `${CACHE_DIR}/ratings-cache.json`;

function loadRatingsCache(): Map<string, OmdbRatings> {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      console.log(`Loaded ${Object.keys(data).length} cached ratings from file`);
      return new Map(Object.entries(data));
    }
  } catch (err) {
    console.error("Failed to load ratings cache:", err);
  }
  return new Map();
}

function saveRatingsCache(cache: Map<string, OmdbRatings>): void {
  try {
    const data = Object.fromEntries(cache);
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save ratings cache:", err);
  }
}

const ratingsCache = loadRatingsCache();

async function fetchRtAudienceScore(title: string): Promise<number | null> {
  try {
    const url = `https://rotten-tomatoes-api.ue.r.appspot.com/movie/${encodeURIComponent(title)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = (await response.json()) as {
      audienceScore?: number;
    };
    
    return data.audienceScore ?? null;
  } catch {
    return null;
  }
}

// Cache for TMDB person images (name -> image URL)
const personImageCache = new Map<string, string | null>();

async function fetchPersonImage(name: string): Promise<string | null> {
  if (personImageCache.has(name)) {
    return personImageCache.get(name)!;
  }

  const tmdbKey = getTmdbApiKey();
  if (!tmdbKey) return null;

  try {
    const url = `https://api.themoviedb.org/3/search/person?api_key=${tmdbKey}&query=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results?: { profile_path?: string | null }[];
    };

    const profilePath = data.results?.[0]?.profile_path;
    // w92 is a small size, good for avatars (~2-5KB per image)
    const imageUrl = profilePath ? `https://image.tmdb.org/t/p/w92${profilePath}` : null;
    
    personImageCache.set(name, imageUrl);
    return imageUrl;
  } catch {
    personImageCache.set(name, null);
    return null;
  }
}

async function fetchOmdbRatings(title: string, year: number): Promise<OmdbRatings> {
  const cacheKey = `${title}-${year}`;
  if (ratingsCache.has(cacheKey)) {
    const cached = ratingsCache.get(cacheKey)!;
    console.log(`Cache HIT for: ${title} (${year})`);
    return cached;
  }
  console.log(`Cache MISS for: ${title} (${year})`);
  

  const ratings: OmdbRatings = {
    imdbRating: null,
    rtCriticRating: null,
    rtAudienceRating: null,
    imdbId: null,
    contentRating: null,
    director: null,
    directorImage: null,
    cast: [],
  };

  const omdbKey = getOmdbApiKey();
  let actorNames: string[] = [];
  
  // Fetch OMDB data (IMDB + RT Critics + metadata)
  if (omdbKey) {
    try {
      const url = `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&apikey=${omdbKey}`;
      console.log(`Fetching OMDB for: ${title} (${year})`);
      const response = await fetch(url);
      const data = (await response.json()) as {
        imdbRating?: string;
        imdbID?: string;
        Ratings?: { Source: string; Value: string }[];
        Response?: string;
        Error?: string;
        Rated?: string;
        Director?: string;
        Actors?: string;
      };

      if (data.Response === "False") {
        console.log(`OMDB: No results for ${title} - ${data.Error}`);
      } else {
        if (data.imdbRating && data.imdbRating !== "N/A") {
          ratings.imdbRating = parseFloat(data.imdbRating);
        }
        
        if (data.imdbID) {
          ratings.imdbId = data.imdbID;
        }

        if (data.Rated && data.Rated !== "N/A") {
          ratings.contentRating = data.Rated;
        }

        if (data.Director && data.Director !== "N/A") {
          ratings.director = data.Director.split(",")[0].trim(); // Take first director
        }

        if (data.Actors && data.Actors !== "N/A") {
          actorNames = data.Actors.split(",").map(a => a.trim()).slice(0, 4); // Top 4 actors
        }

        if (data.Ratings) {
          for (const rating of data.Ratings) {
            if (rating.Source === "Rotten Tomatoes") {
              ratings.rtCriticRating = parseInt(rating.Value);
            }
          }
        }
        console.log(`OMDB ratings for ${title}: IMDB=${ratings.imdbRating}, RT=${ratings.rtCriticRating}, ID=${ratings.imdbId}`);
      }
    } catch (error) {
      console.error(`Failed to fetch OMDB ratings for ${title}:`, error);
    }
  } else {
    console.log("OMDB API key not set, skipping ratings lookup");
  }

  // Fetch RT Audience score from free API
  ratings.rtAudienceRating = await fetchRtAudienceScore(title);

  // Fetch headshots from TMDB (in parallel for speed)
  const tmdbKey = getTmdbApiKey();
  if (tmdbKey) {
    const imagePromises: Promise<void>[] = [];

    // Fetch director image
    if (ratings.director) {
      imagePromises.push(
        fetchPersonImage(ratings.director).then(img => {
          ratings.directorImage = img;
        })
      );
    }

    // Fetch cast images
    for (const actorName of actorNames) {
      imagePromises.push(
        fetchPersonImage(actorName).then(img => {
          ratings.cast.push({ name: actorName, image: img });
        })
      );
    }

    await Promise.all(imagePromises);
  } else {
    // No TMDB key, just store names without images
    ratings.cast = actorNames.map(name => ({ name, image: null }));
  }

  ratingsCache.set(cacheKey, ratings);
  
  // Save cache to file periodically (every 10 new entries)
  if (ratingsCache.size % 10 === 0) {
    saveRatingsCache(ratingsCache);
  }
  
  return ratings;
}

async function plexRequest<T>(endpoint: string): Promise<T> {
  const plexUrl = getPlexUrl();
  const plexToken = getPlexToken();
  const url = `${plexUrl}${endpoint}`;
  
  console.log(`Fetching: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "X-Plex-Token": plexToken,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Plex API error: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (err) {
    console.error("Fetch error details:", err);
    throw err;
  }
}

export async function getMovieLibrarySections(): Promise<{ key: string; title: string }[]> {
  const data = await plexRequest<{
    MediaContainer: { Directory: { key: string; title: string; type: string }[] };
  }>("/library/sections");

  return data.MediaContainer.Directory.filter((d) => d.type === "movie").map((d) => ({
    key: d.key,
    title: d.title,
  }));
}

export async function getAllMovies(sectionKey?: string): Promise<Movie[]> {
  const plexUrl = getPlexUrl();
  const plexToken = getPlexToken();
  
  let sections: { key: string }[];

  if (sectionKey) {
    sections = [{ key: sectionKey }];
  } else {
    sections = await getMovieLibrarySections();
  }

  const allMovies: Movie[] = [];

  for (const section of sections) {
    const data = await plexRequest<{
      MediaContainer: { Metadata: PlexMovie[] };
    }>(`/library/sections/${section.key}/all?type=1`);

    const movies = data.MediaContainer.Metadata || [];

    for (const movie of movies) {
      const runtimeMinutes = Math.round(movie.duration / 60000);
      const year = movie.year || new Date().getFullYear();

      allMovies.push({
        id: movie.ratingKey,
        title: movie.title,
        year,
        decade: getDecade(year),
        genres: movie.Genre?.map((g) => g.tag) || [],
        runtime: runtimeMinutes,
        runtimeBlock: getRuntimeBlock(runtimeMinutes),
        imdbRating: null,
        rtCriticRating: null,
        rtAudienceRating: null,
        imdbId: null,
        poster: movie.thumb ? `${plexUrl}${movie.thumb}?X-Plex-Token=${plexToken}` : null,
        summary: movie.summary || null,
        watched: (movie.viewCount || 0) > 0,
        contentRating: null,
        director: null,
        directorImage: null,
        cast: [],
      });
    }
  }

  return allMovies;
}

export async function enrichMovieWithRatings(movie: Movie): Promise<Movie> {
  const ratings = await fetchOmdbRatings(movie.title, movie.year);
  return {
    ...movie,
    ...ratings,
  };
}

export async function getAvailableGenres(sectionKey?: string): Promise<string[]> {
  let sections: { key: string }[];

  if (sectionKey) {
    sections = [{ key: sectionKey }];
  } else {
    sections = await getMovieLibrarySections();
  }

  const genreSet = new Set<string>();

  for (const section of sections) {
    const data = await plexRequest<{
      MediaContainer: { Directory: { title: string }[] };
    }>(`/library/sections/${section.key}/genre`);

    for (const genre of data.MediaContainer.Directory || []) {
      genreSet.add(genre.title);
    }
  }

  return Array.from(genreSet).sort();
}
