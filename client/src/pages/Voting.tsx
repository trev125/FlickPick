import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getResult, getSession, vote } from "../api";
import type { Movie, SessionInfo } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ThumbsUp, ThumbsDown, Star, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Rating bar component
function RatingBar({ label, value, max, color, icon }: { 
  label: string; 
  value: number | null; 
  max: number; 
  color: string;
  icon?: React.ReactNode;
}) {
  if (value === null) return null;
  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon}
          {label}
        </span>
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

export default function Voting() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Swipe/drag handling
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const minSwipeDistance = 100;

  const userId = code ? localStorage.getItem(`flickpick_userId_${code}`) || "" : "";

  const fetchData = useCallback(async () => {
    if (!code) return;

    try {
      const sessionData = await getSession(code);
      setSession(sessionData);

      // Check if all users have submitted preferences
      if (sessionData.submittedCount < sessionData.userCount || sessionData.userCount === 0) {
        setLoading(false);
        return;
      }

      // If voting is complete for all, go to final results
      if (sessionData.allVotingComplete) {
        navigate(`/session/${code}/final-results`);
        return;
      }

      // Get movies to vote on (only fetch once)
      if (movies.length === 0) {
        const result = await getResult(code);
        if (result.movies && result.movies.length > 0) {
          setMovies(result.movies);
        }
      }

      // Get current user's voting position
      const currentUser = sessionData.users.find(u => u.id === userId);
      if (currentUser) {
        setCurrentIndex(currentUser.votesCount);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, [code, userId, navigate, movies.length]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Reset description expanded state when movie changes
  useEffect(() => {
    setDescriptionExpanded(false);
  }, [currentIndex]);

  const handleVote = async (voteValue: boolean) => {
    if (!code || !userId || voting || currentIndex >= movies.length) return;

    const movie = movies[currentIndex];
    if (!movie) return;

    setVoting(true);
    try {
      const result = await vote(code, userId, movie.id, voteValue);
      
      if (result.votingComplete) {
        // User finished voting, refresh to check if all done
        await fetchData();
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setVoting(false);
      setDragOffset(0);
    }
  };

  // Drag handlers
  const handleDragStart = (clientX: number) => {
    if (voting) return;
    setIsDragging(true);
    dragStartX.current = clientX;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || dragStartX.current === null) return;
    const offset = clientX - dragStartX.current;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragOffset > minSwipeDistance) {
      handleVote(true); // Swipe right = Yes
    } else if (dragOffset < -minSwipeDistance) {
      handleVote(false); // Swipe left = No
    } else {
      setDragOffset(0);
    }
    
    dragStartX.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.targetTouches[0].clientX);
  const onTouchEnd = () => handleDragEnd();
  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handleDragStart(e.clientX); };
  const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => { if (isDragging) handleDragEnd(); };

  // Visual feedback - subtle blur increases with drag distance
  const isYesSwipe = dragOffset > minSwipeDistance;
  const isNoSwipe = dragOffset < -minSwipeDistance;
  const blurAmount = Math.min(Math.abs(dragOffset) / 50, 4); // Max 4px blur, gentler ramp

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
            <p className="mt-4 text-foreground font-medium">Loading movies...</p>
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

  // Check if current user has finished voting
  const currentUser = session?.users.find(u => u.id === userId);
  if (currentUser?.votingComplete && !session?.allVotingComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
          <p className="text-muted-foreground mt-2">You're done!</p>
        </div>
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <ThumbsUp className="h-16 w-16 mx-auto text-green-500" />
            <p className="text-lg font-medium">Waiting for others to finish...</p>
            <div className="space-y-2">
              {session?.users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                  <span>{u.name}</span>
                  <span className={u.votingComplete ? "text-green-500" : "text-yellow-500"}>
                    {u.votingComplete ? "Done" : `${u.votesCount}/${session.totalMovies}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const movie = movies[currentIndex];
  if (!movie) {
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
            <p className="mt-4 text-foreground font-medium">Loading movies...</p>
          </CardContent>
        </Card>
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
        <p className="text-muted-foreground mt-2">
          Would you watch this?
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Movie {currentIndex + 1} of {session?.totalMovies || movies.length}</span>
          <span>{Math.round(((currentIndex) / (session?.totalMovies || movies.length)) * 100)}%</span>
        </div>
        <Progress value={(currentIndex / (session?.totalMovies || movies.length)) * 100} />
      </div>

      {/* Movie Card with swipe container */}
      <div className="relative">
        {/* Wrapper that moves with the card but doesn't blur */}
        <div 
          className="relative"
          style={{ transform: `translateX(${dragOffset}px)` }}
        >
          {/* YES/NO overlay - moves with card but stays sharp */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity duration-150",
            isYesSwipe ? "opacity-100" : "opacity-0"
          )}>
            <div className="bg-green-500/90 text-white px-8 py-4 rounded-xl text-3xl font-bold rotate-[-15deg] shadow-lg">
              YES!
            </div>
          </div>
          <div className={cn(
            "absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity duration-150",
            isNoSwipe ? "opacity-100" : "opacity-0"
          )}>
            <div className="bg-red-500/90 text-white px-8 py-4 rounded-xl text-3xl font-bold rotate-[15deg] shadow-lg">
              NOPE
            </div>
          </div>

          <Card 
            ref={cardRef}
            className={cn(
              "cursor-grab active:cursor-grabbing select-none relative overflow-hidden",
              !isDragging && "transition-all duration-200",
              voting && "scale-[0.98]",
              isDragging && isYesSwipe && "ring-4 ring-green-500",
              isDragging && isNoSwipe && "ring-4 ring-red-500"
            )}
            style={{
              filter: isDragging ? `blur(${blurAmount}px)` : 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          >
          <CardContent className="pt-6 text-center space-y-3">
            {movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-40 h-60 object-cover rounded-lg mx-auto shadow-lg"
                draggable={false}
              />
            ) : (
              <div className="w-40 h-60 bg-secondary rounded-lg mx-auto flex items-center justify-center text-muted-foreground">
                No Poster
              </div>
            )}

            <h2 className="text-xl font-bold">{movie.title}</h2>

            {/* Basic info row */}
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
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

            {/* Genres */}
            <div className="flex flex-wrap justify-center gap-1">
              {movie.genres.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Rating bars */}
            {hasRatings && (
              <div className="space-y-2 pt-2">
                <RatingBar 
                  label="IMDB" 
                  value={movie.imdbRating} 
                  max={10} 
                  color="bg-yellow-500"
                  icon={<Star className="h-3 w-3" />}
                />
                <RatingBar 
                  label="RT Critics" 
                  value={movie.rtCriticRating} 
                  max={100} 
                  color="bg-red-500"
                />
                <RatingBar 
                  label="RT Audience" 
                  value={movie.rtAudienceRating} 
                  max={100} 
                  color="bg-red-400"
                />
              </div>
            )}

            {/* Expandable description */}
            {movie.summary && (
              <div className="text-left">
                <p className={cn(
                  "text-sm text-muted-foreground transition-all",
                  !descriptionExpanded && "line-clamp-2"
                )}>
                  {movie.summary}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDescriptionExpanded(!descriptionExpanded);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs text-primary hover:underline mt-1 flex items-center gap-0.5"
                >
                  {descriptionExpanded ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Swipe right for Yes, left for No
      </p>

      {/* Vote buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => handleVote(false)}
          disabled={voting}
        >
          <ThumbsDown className="h-5 w-5 mr-2" />
          Nope
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          onClick={() => handleVote(true)}
          disabled={voting}
        >
          <ThumbsUp className="h-5 w-5 mr-2" />
          Yes!
        </Button>
      </div>
    </div>
  );
}
