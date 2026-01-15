import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVotingResults, getSession, getSimilarMovies, type SimpleMovie } from "../api";
import type { Movie, VotingResults } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  PartyPopper, 
  ThumbsDown, 
  ChevronDown, 
  ChevronUp,
  Star,
  Clock,
  Calendar,
  Frown,
  User,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Title case for keywords (handles hyphens: "son-in-law" -> "Son-In-Law")
function toTitleCase(str: string): string {
  return str.replace(/\b\w+/g, word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

// Rating bar component
function RatingBar({ label, value, max, color }: { 
  label: string; 
  value: number | null; 
  max: number; 
  color: string;
}) {
  if (value === null) return null;
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{max === 10 ? '' : '%'}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MovieCardProps {
  movie: Movie;
  compact?: boolean;
}

function MovieCard({ movie, compact }: MovieCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similar, setSimilar] = useState<SimpleMovie[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const handleToggleSimilar = async () => {
    if (showSimilar) {
      setShowSimilar(false);
      return;
    }
    
    if (similar.length === 0) {
      setLoadingSimilar(true);
      try {
        const data = await getSimilarMovies(movie.title, movie.year);
        setSimilar(data);
      } catch (err) {
        console.error("Failed to load similar movies:", err);
      } finally {
        setLoadingSimilar(false);
      }
    }
    setShowSimilar(true);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="w-12 h-18 object-cover rounded" />
        ) : (
          <div className="w-12 h-18 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">?</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{movie.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{movie.year}</span>
            {movie.contentRating && <Badge variant="outline" className="text-[10px] px-1 py-0">{movie.contentRating}</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {movie.imdbRating && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3 w-3 text-yellow-500" />
              {movie.imdbRating}
            </div>
          )}
          {movie.rtCriticRating && (
            <div className="text-xs text-red-500">{movie.rtCriticRating}% RT</div>
          )}
        </div>
      </div>
    );
  }

  const hasRatings = movie.imdbRating || movie.rtCriticRating || movie.rtAudienceRating || movie.tmdbRating;

  return (
    <Card className="overflow-hidden">
      {/* Backdrop image */}
      {movie.backdrop && (
        <div className="relative h-80 w-full">
          <img 
            src={movie.backdrop} 
            alt="" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
        </div>
      )}
      <CardContent className={movie.backdrop ? "-mt-32 relative z-10" : "pt-4"}>
        <div className="flex gap-4">
          {movie.poster ? (
            <img 
              src={movie.poster} 
              alt={movie.title} 
              className={cn(
                "w-28 h-42 object-cover rounded-lg shadow flex-shrink-0",
                movie.backdrop && "ring-2 ring-card"
              )} 
            />
          ) : (
            <div className="w-28 h-42 bg-muted rounded-lg flex items-center justify-center text-muted-foreground flex-shrink-0">No Poster</div>
          )}
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <h3 className="text-lg font-bold">{movie.title}</h3>
              {movie.collection && (
                <p className="text-xs text-muted-foreground italic">Part of {movie.collection}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {movie.year}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRuntime(movie.runtime)}
                </span>
                {movie.contentRating && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {movie.contentRating}
                  </Badge>
                )}
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1">
              {movie.genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Keywords */}
            {movie.keywords && movie.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {movie.keywords.slice(0, 6).map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-[10px] font-normal">
                    {toTitleCase(keyword)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ratings */}
            {hasRatings && (
              <div className="space-y-1.5">
                <RatingBar label="IMDB" value={movie.imdbRating} max={10} color="bg-yellow-500" />
                <RatingBar 
                  label={movie.tmdbVoteCount ? `TMDB (${movie.tmdbVoteCount.toLocaleString()})` : "TMDB"} 
                  value={movie.tmdbRating} 
                  max={10} 
                  color="bg-sky-500" 
                />
                <RatingBar label="RT Critics" value={movie.rtCriticRating} max={100} color="bg-red-500" />
                <RatingBar label="RT Audience" value={movie.rtAudienceRating} max={100} color="bg-red-400" />
              </div>
            )}

            {/* Director */}
            {movie.director && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Director:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={movie.directorImage || undefined} />
                    <AvatarFallback className="text-[8px]">
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{movie.director}</span>
                </div>
              </div>
            )}

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Cast:</span>
                <div className="flex flex-wrap gap-2">
                  {movie.cast.slice(0, 4).map((actor) => (
                    <div key={actor.name} className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={actor.image || undefined} />
                        <AvatarFallback className="text-[8px]">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{actor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {movie.summary && (
              <div>
                <p className={cn(
                  "text-sm text-muted-foreground",
                  !expanded && "line-clamp-2"
                )}>
                  {movie.summary}
                </p>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
                >
                  {expanded ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Similar Movies Section */}
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={handleToggleSimilar}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Similar Movies In Library
            </span>
            {loadingSimilar ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              showSimilar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {showSimilar && similar.length > 0 && (
            <div className="mt-3 space-y-2">
              {similar.map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                  {rec.poster ? (
                    <img src={rec.poster} alt={rec.title} className="w-10 h-14 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{rec.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{rec.year}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {rec.imdbRating && (
                      <span className="flex items-center gap-0.5" title="IMDB">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {rec.imdbRating}
                      </span>
                    )}
                    {rec.tmdbRating && (
                      <span className="flex items-center gap-0.5" title="TMDB">
                        <Star className="h-3 w-3 text-sky-500" />
                        {rec.tmdbRating}
                      </span>
                    )}
                    {rec.rtRating && (
                      <span className="flex items-center gap-0.5" title="Rotten Tomatoes">
                        <Star className="h-3 w-3 text-red-500" />
                        {rec.rtRating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {showSimilar && similar.length === 0 && !loadingSimilar && (
            <p className="mt-2 text-xs text-muted-foreground text-center">No similar movies found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CollapsibleSectionProps {
  title: string;
  movies: Movie[];
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, movies, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (movies.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
      >
        <span className="font-medium text-muted-foreground">{title} ({movies.length})</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isOpen && (
        <div className="space-y-2 pl-2">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} compact />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinalResults() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<VotingResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchResults = useCallback(async () => {
    if (!code) return;

    try {
      const sessionData = await getSession(code);

      if (!sessionData.allVotingComplete) {
        navigate(`/session/${code}/voting`);
        return;
      }

      const votingResults = await getVotingResults(code);
      setResults(votingResults);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
      setLoading(false);
    }
  }, [code, navigate]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-foreground font-medium">Loading results...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
            <Button className="w-full mt-4" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results) return null;

  const userNames = results.users || [];
  const user1Name = userNames[0]?.name || "Player 1";
  const user2Name = userNames[1]?.name || "Player 2";
  const isSolo = userNames.length === 1;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          FlickPick
        </h1>
        <p className="text-muted-foreground mt-2">Results are in!</p>
      </div>

      {/* Matches Section */}
      {results.bothYes.length > 0 ? (
        <Card className="border-green-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-500">
              <PartyPopper className="h-5 w-5" />
              {isSolo ? "Your Picks" : "You Both Want to Watch"} ({results.bothYes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.bothYes.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center space-y-4">
            <Frown className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">No matches found</p>
            <p className="text-muted-foreground">
              {isSolo 
                ? "You didn't select any movies. Try again with different preferences!"
                : "You two have very different tastes! Try again with different preferences."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rejected Movies */}
      {!isSolo && (results.user1No.length > 0 || results.user2No.length > 0 || results.bothNo.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <ThumbsDown className="h-4 w-4" />
            Rejected Movies
          </h3>
          
          <CollapsibleSection 
            title={`${user1Name} said no`} 
            movies={results.user1No} 
          />
          <CollapsibleSection 
            title={`${user2Name} said no`} 
            movies={results.user2No} 
          />
          <CollapsibleSection 
            title="Both said no" 
            movies={results.bothNo} 
          />
        </div>
      )}

      {/* Solo rejected */}
      {isSolo && results.user1No.length > 0 && (
        <CollapsibleSection 
          title="Movies you passed on" 
          movies={results.user1No} 
        />
      )}

      <Button className="w-full" onClick={() => navigate("/")}>
        Start New Session
      </Button>
    </div>
  );
}
