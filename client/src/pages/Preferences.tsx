import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFilters, submitPreferences } from "../api";
import type { FilterOptions, UserPreferences } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Film, Calendar, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_YEAR = 1920;
const MAX_YEAR = 2025;
const MIN_RUNTIME = 30;
const MAX_RUNTIME = 300;

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function Preferences() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minImdb, setMinImdb] = useState<number>(0);
  const [includeWatched, setIncludeWatched] = useState(false);

  const [yearRange, setYearRange] = useState([MIN_YEAR, MAX_YEAR]);
  const [runtimeRange, setRuntimeRange] = useState([MIN_RUNTIME, MAX_RUNTIME]);

  const [skipMood, setSkipMood] = useState(false);
  const [skipGenre, setSkipGenre] = useState(false);
  const [skipEra, setSkipEra] = useState(false);
  const [skipRuntime, setSkipRuntime] = useState(false);

  const userId = code ? localStorage.getItem(`flickpick_userId_${code}`) || "" : "";

  useEffect(() => {
    async function loadFilters() {
      try {
        const data = await getFilters();
        setFilters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load filters");
      } finally {
        setLoading(false);
      }
    }
    loadFilters();
  }, []);

  const toggleItem = (
    item: string,
    selected: string[],
    setSelected: (items: string[]) => void
  ) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const handleSubmit = async () => {
    if (!code) return;

    setSubmitting(true);
    setError("");

    const moodGenres = skipMood ? [] : selectedMoods.flatMap(
      (mood) => filters?.moodGenreMap[mood] || []
    );
    const genreList = skipGenre ? [] : selectedGenres;
    const allGenres = [...new Set([...genreList, ...moodGenres])];

    const preferences: UserPreferences = {
      genres: allGenres,
      yearRange: skipEra ? null : { min: yearRange[0], max: yearRange[1] },
      runtimeRange: skipRuntime ? null : { min: runtimeRange[0], max: runtimeRange[1] },
      minImdbRating: minImdb > 0 ? minImdb : null,
      minRtCriticRating: null,
      minRtAudienceRating: null,
      includeWatched,
    };

    try {
      const { allSubmitted } = await submitPreferences(code, userId, preferences);

      if (allSubmitted) {
        navigate(`/session/${code}/voting`);
      } else {
        navigate(`/session/${code}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setSubmitting(false);
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
          <CardContent className="pt-6 flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !filters) {
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFullYearRange = yearRange[0] === MIN_YEAR && yearRange[1] === MAX_YEAR;
  const isFullRuntimeRange = runtimeRange[0] === MIN_RUNTIME && runtimeRange[1] === MAX_RUNTIME;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          FlickPick
        </h1>
        <p className="text-muted-foreground mt-2">
          What are you in the mood for?
        </p>
      </div>

      {/* Mood */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Vibe Check
            </CardTitle>
            <Button
              variant={skipMood ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSkipMood(!skipMood);
                if (!skipMood) setSelectedMoods([]);
              }}
            >
              {skipMood ? "Skipped" : "Skip"}
            </Button>
          </div>
        </CardHeader>
        {!skipMood && (
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">What mood are you in tonight?</p>
            <div className="flex flex-wrap gap-2">
              {filters?.moods.map((mood) => (
                <Badge
                  key={mood}
                  variant={selectedMoods.includes(mood) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    selectedMoods.includes(mood) && "bg-primary"
                  )}
                  onClick={() => toggleItem(mood, selectedMoods, setSelectedMoods)}
                >
                  {mood}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Genres */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              Genres
            </CardTitle>
            <Button
              variant={skipGenre ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSkipGenre(!skipGenre);
                if (!skipGenre) setSelectedGenres([]);
              }}
            >
              {skipGenre ? "Skipped" : "Skip"}
            </Button>
          </div>
        </CardHeader>
        {!skipGenre && (
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Or pick specific genres</p>
            <div className="flex flex-wrap gap-2">
              {filters?.genres.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenres.includes(genre) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    selectedGenres.includes(genre) && "bg-primary"
                  )}
                  onClick={() => toggleItem(genre, selectedGenres, setSelectedGenres)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Era - Year Range Slider */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Era
            </CardTitle>
            <Button
              variant={skipEra ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSkipEra(!skipEra);
                if (!skipEra) setYearRange([MIN_YEAR, MAX_YEAR]);
              }}
            >
              {skipEra ? "Skipped" : "Skip"}
            </Button>
          </div>
        </CardHeader>
        {!skipEra && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">When was it made?</p>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium text-primary">
                <span>{yearRange[0]}</span>
                <span>{yearRange[1]}</span>
              </div>
              <Slider
                value={yearRange}
                onValueChange={setYearRange}
                min={MIN_YEAR}
                max={MAX_YEAR}
                step={5}
                className="w-full"
              />
              <p className="text-center text-sm text-muted-foreground">
                {isFullYearRange ? "Any year" : `${yearRange[0]} - ${yearRange[1]}`}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Runtime - Range Slider */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Length
            </CardTitle>
            <Button
              variant={skipRuntime ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSkipRuntime(!skipRuntime);
                if (!skipRuntime) setRuntimeRange([MIN_RUNTIME, MAX_RUNTIME]);
              }}
            >
              {skipRuntime ? "Skipped" : "Skip"}
            </Button>
          </div>
        </CardHeader>
        {!skipRuntime && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">How much time do you have?</p>
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium text-primary">
                <span>{formatRuntime(runtimeRange[0])}</span>
                <span>{formatRuntime(runtimeRange[1])}</span>
              </div>
              <Slider
                value={runtimeRange}
                onValueChange={setRuntimeRange}
                min={MIN_RUNTIME}
                max={MAX_RUNTIME}
                step={15}
                className="w-full"
              />
              <p className="text-center text-sm text-muted-foreground">
                {isFullRuntimeRange ? "Any length" : `${formatRuntime(runtimeRange[0])} - ${formatRuntime(runtimeRange[1])}`}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* IMDB Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            IMDB Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={[minImdb]}
            onValueChange={([val]) => setMinImdb(val)}
            min={0}
            max={9}
            step={0.5}
            className="w-full"
          />
          <p className="text-center text-sm text-muted-foreground">
            {minImdb === 0 ? "Any rating" : `${minImdb}+ minimum`}
          </p>
        </CardContent>
      </Card>

      {/* Include Watched */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="include-watched" className="cursor-pointer">
              Include movies I've already watched
            </Label>
            <Switch
              id="include-watched"
              checked={includeWatched}
              onCheckedChange={setIncludeWatched}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitting ? "Finding your match..." : "Find Our Movie"}
      </Button>
    </div>
  );
}
