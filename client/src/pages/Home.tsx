import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSession } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [movieCount, setMovieCount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { code } = await createSession(movieCount);
      localStorage.setItem("flickpick_name", name);
      navigate(`/session/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!joinCode.trim()) {
      setError("Please enter a session code");
      return;
    }

    localStorage.setItem("flickpick_name", name);
    navigate(`/session/${joinCode.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          FlickPick
        </h1>
        <p className="text-muted-foreground mt-2">
          Can't decide what to watch? Let's fix that.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Get Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">What should we call you?</Label>
            <Input
              id="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Movies to choose from</Label>
              <span className="text-sm font-medium text-primary">{movieCount}</span>
            </div>
            <Slider
              value={[movieCount]}
              onValueChange={(v) => setMovieCount(v[0])}
              min={10}
              max={50}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              More movies = more options, but takes longer to vote through
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating..." : "Start New Session"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or join a friend
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Session Code</Label>
            <Input
              id="code"
              placeholder="ABC123"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-wider"
            />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleJoin}
            disabled={!joinCode.trim()}
          >
            Join Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
