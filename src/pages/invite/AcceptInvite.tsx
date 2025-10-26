import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/pd/Spinner";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    loadInvite();
  }, [token]);

  async function loadInvite() {
    try {
      const { data, error: inviteError } = await supabase
        .from("user_invites")
        .select("*, agencies(name)")
        .eq("token", token)
        .single();

      if (inviteError || !data) {
        setError("Invitation not found or expired");
        setLoading(false);
        return;
      }

      if (data.status !== "pending") {
        setError(`Invitation has been ${data.status}`);
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("Invitation has expired");
        setLoading(false);
        return;
      }

      setInvite(data);
      setLoading(false);
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Failed to load invitation");
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!token) return;

    setAccepting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/invite/accept?token=${token}`;
        navigate(`/auth/login?return=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Call accept-invite edge function
      const { data, error: acceptError } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });

      if (acceptError) {
        throw acceptError;
      }

      if (data.error) {
        if (data.error.includes("Email mismatch")) {
          setError(
            `This invitation was sent to ${data.invited_email}. Please sign in with that email address.`
          );
        } else {
          setError(data.error);
        }
        setAccepting(false);
        return;
      }

      setSuccess(true);
      toast({
        title: "Invitation accepted",
        description: "You have been added to the agency successfully.",
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      setError(err.message || "Failed to accept invitation");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-10 w-10 text-destructive" />
              <div>
                <CardTitle>Invalid Invitation</CardTitle>
                <CardDescription>This invitation link is not valid</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/auth/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <div>
                <CardTitle>Invitation Accepted</CardTitle>
                <CardDescription>Welcome to the team!</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-10 w-10 text-primary" />
            <div>
              <CardTitle>Accept Invitation</CardTitle>
              <CardDescription>
                You've been invited to join an agency
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Agency:</span>
              <span className="font-medium">{(invite.agencies as any)?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{invite.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{invite.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">
                {new Date(invite.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/auth/login")}
            className="w-full"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
