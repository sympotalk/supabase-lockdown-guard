import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/accounts/RoleBadge";
import { UserPlus, Users, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUser } from "@/context/UserContext";

interface InvitedUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  is_used: boolean;
  created_at: string;
  expires_at: string;
}

export default function AgencyTeam() {
  const { role, userId } = useUser();
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agencyId, setAgencyId] = useState<string>("");
  const [agencyName, setAgencyName] = useState<string>("");
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  
  // Only AGENCY_OWNER can invite users (STAFF can only view)
  const canInvite = role === 'agency_owner';

  useEffect(() => {
    loadAgencyInfo();
    loadInvites();
  }, []);

  const loadAgencyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[Team] No user found");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData?.agency_id) {
        console.warn("[Team] No agency_id found, skipping RPC calls");
        return;
      }

      const { data: agencyData } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", roleData.agency_id)
        .single();

      setAgencyId(roleData.agency_id);
      setAgencyName(agencyData?.name || "");
    } catch (error) {
      console.error("[Team] Failed to load agency info:", error);
    }
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[Team] No user found");
        setLoading(false);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData?.agency_id) {
        console.warn("[Team] No agency_id found, skipping invite load");
        setLoading(false);
        return;
      }

      // Load invites from account_provisioning
      const { data: invitesData, error: invitesError } = await supabase
        .from("account_provisioning")
        .select("*")
        .eq("agency_id", roleData.agency_id)
        .order("created_at", { ascending: false });

      if (invitesError) {
        console.error("[Team] Failed to load invites:", invitesError);
        toast.error("초대 내역을 불러오는데 실패했습니다.");
      } else {
        setInvites(invitesData || []);
      }
    } catch (error) {
      console.error("[Team] Failed to load invites:", error);
      toast.error("초대 내역을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canInvite) {
      toast.error("권한이 없습니다.", {
        description: "팀원 초대는 에이전시 관리자만 가능합니다.",
      });
      return;
    }

    if (!agencyId) {
      toast.error("에이전시 정보를 불러올 수 없습니다.");
      return;
    }

    if (!inviteEmail.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("invite_member", {
        p_agency_id: agencyId,
        p_email: inviteEmail.toLowerCase().trim(),
        p_role: inviteRole,
      });

      if (error) {
        console.error("[Team] Invite error:", error);
        toast.error("초대에 실패했습니다.", {
          description: error.message,
        });
        return;
      }

      const result = data as any;

      if (result?.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(result?.message || "초대가 발송되었습니다.");
      
      // Reset form
      setInviteEmail("");
      setInviteRole("staff");

      // Reload invites
      loadInvites();
    } catch (error: any) {
      console.error("[Team] Invite exception:", error);
      toast.error("초대에 실패했습니다.", {
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!canInvite) {
      toast.error("권한이 없습니다.");
      return;
    }

    try {
      const { error } = await supabase
        .from("account_provisioning")
        .update({ is_active: false })
        .eq("id", inviteId);

      if (error) {
        console.error("[Team] Delete invite error:", error);
        toast.error("초대 취소에 실패했습니다.");
        return;
      }

      toast.success("초대가 취소되었습니다.");
      loadInvites();
    } catch (error) {
      console.error("[Team] Delete invite exception:", error);
      toast.error("초대 취소에 실패했습니다.");
    }
  };

  const getInviteStatus = (invite: InvitedUser) => {
    if (!invite.is_active) return "취소됨";
    if (invite.is_used) return "수락됨";
    if (new Date(invite.expires_at) < new Date()) return "만료됨";
    return "대기중";
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "수락됨":
        return "default";
      case "대기중":
        return "secondary";
      case "취소됨":
      case "만료됨":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-[28px] font-bold">팀원 초대</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            에이전시 팀원을 초대하고 역할을 관리합니다
          </p>
        </div>

        {/* Invite Form */}
        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              새 팀원 초대
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canInvite ? (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">
                      이메일 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">
                      권한 <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={inviteRole}
                      onValueChange={setInviteRole}
                      disabled={submitting}
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="agency_owner">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting || !agencyId}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {submitting ? "초대 중..." : "초대하기"}
                </Button>
              </form>
            ) : (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium">안내:</span> 팀원 초대는 에이전시 관리자만 가능합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invites List */}
        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                초대 내역
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInvites}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                로딩 중...
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                초대 내역이 없습니다.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일</TableHead>
                      <TableHead>권한</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>생성일</TableHead>
                      {canInvite && <TableHead className="text-right">관리</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const status = getInviteStatus(invite);
                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="text-[13px] font-mono">
                            {invite.email}
                          </TableCell>
                          <TableCell>
                            <RoleBadge role={invite.role} />
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(status) as any}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[12px] text-muted-foreground">
                            {format(new Date(invite.created_at), "yyyy-MM-dd")}
                          </TableCell>
                          {canInvite && (
                            <TableCell className="text-right">
                              {status === "대기중" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInvite(invite.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
