import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, joinSession } from "../api";
import type { SessionInfo } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check, Users, ClipboardList, Film } from "lucide-react";

function generateUserId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export default function Session() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [userId] = useState(() => {
    if (!code) return generateUserId();
    const storageKey = `flickpick_userId_${code}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;
    const newId = generateUserId();
    localStorage.setItem(storageKey, newId);
    return newId;
  });

  const [name, setName] = useState(() => {
    if (!code) return "";
    const storageKey = `flickpick_name_${code}`;
    return localStorage.getItem(storageKey) || localStorage.getItem("flickpick_name") || "";
  });

  const fetchSession = useCallback(async () => {
    if (!code) return;

    try {
      const data = await getSession(code);
      setSession(data);

      const isInSession = data.users.some((u) => u.id === userId);
      
      if (!isInSession && data.userCount < 2 && !joining) {
        if (!name) {
          setNeedsName(true);
          return;
        }
        
        setJoining(true);
        await joinSession(code, userId, name);
        const updated = await getSession(code);
        setSession(updated);
        setJoining(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session not found");
    }
  }, [code, userId, name, joining]);

  useEffect(() => {
    if (!needsName) {
      fetchSession();
      const interval = setInterval(fetchSession, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchSession, needsName]);

  const handleNameSubmit = () => {
    if (!nameInput.trim() || !code) return;
    const trimmedName = nameInput.trim();
    localStorage.setItem("flickpick_name", trimmedName);
    localStorage.setItem(`flickpick_name_${code}`, trimmedName);
    setName(trimmedName);
    setNeedsName(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/session/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (needsName) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlickPick
          </h1>
          <p className="text-muted-foreground mt-2">
            You've been invited to pick a movie!
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">What's your name?</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                autoFocus
              />
            </div>
            
            <Button
              className="w-full"
              onClick={handleNameSubmit}
              disabled={!nameInput.trim()}
            >
              Join Session
            </Button>
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
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
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
            <p className="mt-4 text-muted-foreground">Loading session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUser = session.users.find((u) => u.id === userId);
  const otherUser = session.users.find((u) => u.id !== userId);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          FlickPick
        </h1>
        <p className="text-muted-foreground mt-2">
          Waiting for your movie buddy
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Session Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4 text-center">
            <span className="text-3xl font-mono font-bold tracking-wider text-primary">
              {code}
            </span>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={copyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Invite Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Players ({session.userCount}/2)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className={`h-3 w-3 rounded-full ${currentUser.hasSubmitted ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              <span className="flex-1">{currentUser.name} (You)</span>
              {currentUser.hasSubmitted && (
                <span className="text-sm text-green-500 font-medium">Ready</span>
              )}
            </div>
          )}

          {otherUser ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className={`h-3 w-3 rounded-full ${otherUser.hasSubmitted ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              <span className="flex-1">{otherUser.name}</span>
              {otherUser.hasSubmitted && (
                <span className="text-sm text-green-500 font-medium">Ready</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">Waiting for player 2...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solo mode - 1 player can start alone */}
      {session.userCount === 1 && !currentUser?.hasSubmitted && (
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => navigate(`/session/${code}/preferences`)}
          >
            Play Solo
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Or share the code above and wait for a friend to join
          </p>
        </div>
      )}

      {/* Duo mode - 2 players */}
      {session.userCount === 2 && (
        <Button
          className="w-full"
          onClick={() => navigate(`/session/${code}/preferences`)}
          disabled={currentUser?.hasSubmitted}
        >
          {currentUser?.hasSubmitted ? "Waiting for other player..." : "Set My Preferences"}
        </Button>
      )}

      {/* Start voting when all have submitted */}
      {session.submittedCount >= 1 && session.submittedCount === session.userCount && (
        <Button
          className="w-full"
          onClick={() => navigate(`/session/${code}/voting`)}
        >
          <Film className="h-4 w-4" />
          Start Voting
        </Button>
      )}
    </div>
  );
}
