import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createSession, verifyAdminPassword } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Lock, Unlock, Eye, EyeOff } from "lucide-react";

const ADMIN_KEY = "flickpick_admin";

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const [movieCount, setMovieCount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Admin auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem(ADMIN_KEY);
    if (savedPassword) {
      // Verify the saved password is still valid
      verifyAdminPassword(savedPassword).then(({ valid }) => {
        if (valid) {
          setIsAdmin(true);
          setAdminPassword(savedPassword);
        } else {
          localStorage.removeItem(ADMIN_KEY);
        }
      }).catch(() => {
        localStorage.removeItem(ADMIN_KEY);
      });
    }
  }, []);

  const handleAdminLogin = async () => {
    if (!adminPassword.trim()) {
      setError("Please enter the admin password");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const { valid } = await verifyAdminPassword(adminPassword);
      if (valid) {
        setIsAdmin(true);
        localStorage.setItem(ADMIN_KEY, adminPassword);
        setShowAdminInput(false);
      } else {
        setError("Invalid admin password");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify password");
    } finally {
      setVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminPassword("");
    localStorage.removeItem(ADMIN_KEY);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { code } = await createSession(movieCount, adminPassword);
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
          <CardTitle className="text-lg">Join a Session</CardTitle>
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

          {error && !showAdminInput && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={!joinCode.trim() || !name.trim()}
          >
            Join Session
          </Button>
        </CardContent>
      </Card>

      {/* Admin Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isAdmin ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Create New Session
            </span>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={handleAdminLogout}>
                Lock
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin ? (
            <>
              {!showAdminInput ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAdminInput(true)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Enter Admin Password
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="adminPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAdminInput(false);
                        setAdminPassword("");
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAdminLogin}
                      disabled={verifying}
                    >
                      {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Unlock
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
                disabled={loading || !name.trim()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating..." : "Start New Session"}
              </Button>

              {!name.trim() && (
                <p className="text-xs text-muted-foreground text-center">
                  Enter your name above to create a session
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
