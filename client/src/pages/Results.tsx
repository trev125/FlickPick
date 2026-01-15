import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResult, getSession, reroll } from "../api";
import type { Movie, SessionInfo, MatchedCriteria } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Shuffle, Plus, ExternalLink, Frown, Popcorn, PartyPopper, Star, ChevronDown, ChevronUp, ShieldAlert, Calendar, Clock, Film, Clapperboard, Leaf, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "Scanning your Plex library...",
  "Comparing preferences...",
  "Finding the perfect match...",
  "Checking ratings...",
  "Almost there...",
];

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function getImdbUrl(imdbId: string | null, title: string, year: number): string {
  if (imdbId) {
    return `https://www.imdb.com/title/${imdbId}/`;
  }
  return `https://www.imdb.com/find/?q=${encodeURIComponent(title + " " + year)}`;
}

function getRtUrl(title: string): string {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
  return `https://www.rottentomatoes.com/m/${slug}`;
}

export default function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLast, setIsLast] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [expandDescription, setExpandDescription] = useState(false);
  const [matchedCriteria, setMatchedCriteria] = useState<MatchedCriteria | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [rerolling, setRerolling] = useState(false);

  const userId = code ? localStorage.getItem(`flickpick_userId_${code}`) || "" : "";

  useEffect(() => {
    if (!loading) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const fetchResults = useCallback(async () => {
    if (!code || rerolling) return;

    try {
      const sessionData = await getSession(code);
      setSession(sessionData);

      if (sessionData.submittedCount < 2) {
        setLoading(false);
        return;
      }

      const result = await getResult(code);
      setMovie(result.result);
      setTotalMatches(result.totalMatches);
      setCurrentIndex(result.currentIndex);
      setIsLast(result.isLast);
      setMatchedCriteria(result.matchedCriteria);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [code, rerolling]);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  const handleReroll = async () => {
    if (!code || rerolling) return;
    
    // If already on the last movie, show the end screen
    if (isLast) {
      setShowEndScreen(true);
      return;
    }
    
    setRerolling(true);
    try {
      const response = await reroll(code);
      setMovie(response.result);
      setIsLast(response.isLast);
      setCurrentIndex((prev) => prev + 1);
      setExpandDescription(false);
      
      // If we just moved to the last movie and tried to go further, show end screen
      if (response.isLast && currentIndex + 1 >= totalMatches - 1) {
        // Don't show end screen yet - let them see the last movie first
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pick different movie");
    } finally {
      setRerolling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-foreground font-medium">{loadingMessage}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This may take a moment for large libraries
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session && session.submittedCount < 2) {
    const otherUser = session.users.find((u) => u.id !== userId);
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">
              Waiting for {otherUser?.name || "other player"} to submit preferences...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-destructive text-center">{error}</p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/session/${code}`)}
            >
              Back to Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Frown className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold mt-4">No Matches Found</h2>
            <p className="text-muted-foreground">
              Your preferences didn't overlap. Try being less picky next time!
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show "end of list" only after user has explicitly clicked "Different Pick" on the last movie
  if (showEndScreen && totalMatches > 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
          <p className="text-muted-foreground mt-2">That's all folks!</p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4 py-12">
            <Popcorn className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-4">
              You've seen all {totalMatches} matches!
            </h2>
            <p className="text-muted-foreground">
              You've cycled through every movie that matched both of your preferences.
              Time to start a new session or just pick one!
            </p>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => navigate("/")}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>
    );
  }

  const hasRatings = movie.imdbRating || movie.rtCriticRating || movie.rtAudienceRating;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          FlickPick
        </h1>
        <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
          <PartyPopper className="h-4 w-4 text-primary" />
          You should watch...
        </p>
      </div>

      <Card className={cn("transition-all", rerolling && "opacity-50 scale-[0.98]")}>
        <CardContent className="pt-6 text-center space-y-4">
          {movie.poster ? (
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-48 h-72 object-cover rounded-lg mx-auto shadow-lg"
            />
          ) : (
            <div className="w-48 h-72 bg-secondary rounded-lg mx-auto flex items-center justify-center text-muted-foreground">
              No Poster
            </div>
          )}

          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {movie.title}
          </h2>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-muted-foreground">{movie.year}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{formatRuntime(movie.runtime)}</span>
            {movie.contentRating && (
              <>
                <span className="text-muted-foreground">•</span>
                <a
                  href={movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/parentalguide/` : getImdbUrl(movie.imdbId, movie.title, movie.year)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="cursor-pointer hover:bg-secondary inline-flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {movie.contentRating}
                  </Badge>
                </a>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1">
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>

          {/* Rating Comparison Bars */}
          {hasRatings && (
            <div className="space-y-3 text-left">
              {movie.imdbRating && (
                <a
                  href={getImdbUrl(movie.imdbId, movie.title, movie.year)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      IMDB
                    </span>
                    <span className="font-medium">{movie.imdbRating}/10</span>
                  </div>
                  <Progress value={movie.imdbRating} max={10} indicatorClassName="bg-yellow-500" />
                </a>
              )}
              {movie.rtCriticRating && (
                <a
                  href={getRtUrl(movie.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                      <Leaf className="h-3.5 w-3.5 text-red-500" />
                      Critics
                    </span>
                    <span className="font-medium">{movie.rtCriticRating}%</span>
                  </div>
                  <Progress value={movie.rtCriticRating} max={100} indicatorClassName="bg-red-500" />
                </a>
              )}
              {movie.rtAudienceRating && (
                <a
                  href={getRtUrl(movie.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                      <Popcorn className="h-3.5 w-3.5 text-primary" />
                      Audience
                    </span>
                    <span className="font-medium">{movie.rtAudienceRating}%</span>
                  </div>
                  <Progress value={movie.rtAudienceRating} max={100} />
                </a>
              )}
            </div>
          )}

          {!hasRatings && (
            <div className="flex flex-col gap-2 items-center">
              <a
                href={getImdbUrl(movie.imdbId, movie.title, movie.year)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-sm"
              >
                View on IMDB <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={getRtUrl(movie.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-sm"
              >
                View on Rotten Tomatoes <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Director & Cast */}
          {(movie.director || movie.cast.length > 0) && (
            <div className="pt-2 border-t border-border">
              {movie.director && (
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-10 w-10">
                    {movie.directorImage && <AvatarImage src={movie.directorImage} alt={movie.director} />}
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <Clapperboard className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">Director</p>
                    <p className="text-sm font-medium">{movie.director}</p>
                  </div>
                </div>
              )}
              {movie.cast.length > 0 && (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground mb-2">Cast</p>
                  <div className="flex flex-wrap gap-3">
                    {movie.cast.map((actor) => (
                      <div key={actor.name} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {actor.image && <AvatarImage src={actor.image} alt={actor.name} />}
                          <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                            {actor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{actor.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {movie.summary && (
            <div className="text-left pt-2 border-t border-border">
              <p 
                className={cn(
                  "text-sm text-muted-foreground leading-relaxed",
                  !expandDescription && "line-clamp-4"
                )}
              >
                {movie.summary}
              </p>
              {movie.summary.length > 200 && (
                <button
                  onClick={() => setExpandDescription(!expandDescription)}
                  className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                >
                  {expandDescription ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preference Match Breakdown */}
      {matchedCriteria && movie && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Why This Movie?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Genres */}
            <div className="flex items-start gap-2 text-sm">
              <Film className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">Genres:</span>
              {matchedCriteria.genresSkipped ? (
                <span className="text-muted-foreground italic">Any</span>
              ) : (
                <span className="flex flex-wrap gap-1">
                  {matchedCriteria.genres.slice(0, 4).map((genre, idx) => {
                    const isMatch = movie.genres.includes(genre);
                    return (
                      <span
                        key={genre}
                        className={cn(isMatch && "text-primary font-medium")}
                      >
                        {genre}{idx < Math.min(matchedCriteria.genres.length, 4) - 1 ? "," : ""}
                      </span>
                    );
                  })}
                </span>
              )}
            </div>

            {/* Era */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Era:</span>
              {matchedCriteria.yearSkipped ? (
                <span className="text-muted-foreground italic">Any</span>
              ) : matchedCriteria.yearRange ? (
                <span>
                  {matchedCriteria.yearRange.min} - {matchedCriteria.yearRange.max}
                  <span className="text-primary font-medium ml-1">({movie.year})</span>
                </span>
              ) : null}
            </div>

            {/* Runtime */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Length:</span>
              {matchedCriteria.runtimeSkipped ? (
                <span className="text-muted-foreground italic">Any</span>
              ) : matchedCriteria.runtimeRange ? (
                <span>
                  {formatRuntime(matchedCriteria.runtimeRange.min)} - {formatRuntime(matchedCriteria.runtimeRange.max)}
                  <span className="text-primary font-medium ml-1">({formatRuntime(movie.runtime)})</span>
                </span>
              ) : null}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Min Rating:</span>
              {matchedCriteria.ratingSkipped ? (
                <span className="text-muted-foreground italic">Any</span>
              ) : matchedCriteria.minImdbRating ? (
                <span>
                  {matchedCriteria.minImdbRating}+
                  {movie.imdbRating && <span className="text-primary font-medium ml-1">({movie.imdbRating})</span>}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Showing {currentIndex + 1} of {totalMatches} matching movie{totalMatches !== 1 ? "s" : ""}
      </p>

      <div className="flex gap-3">
        {totalMatches > 1 && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleReroll}
            disabled={rerolling}
          >
            {rerolling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            {rerolling ? "Picking..." : "Different Pick"}
          </Button>
        )}
        <Button className="flex-1" onClick={() => navigate("/")}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>
    </div>
  );
}
