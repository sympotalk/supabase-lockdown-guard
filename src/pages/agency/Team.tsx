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

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

export default function AgencyTeam() {
  const { role, userId } = useUser();
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agencyId, setAgencyId] = useState<string>("");
  const [agencyName, setAgencyName] = useState<string>("");
  
  // All agency users (Owner & Staff) can invite and manage members
  const canInvite = ['agency_owner', 'staff', 'master'].includes(role || '');

  useEffect(() => {
    loadAgencyInfo();
    loadInvites();
    loadTeamMembers();
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

      // Load invites from account_provisioning - explicitly select email field
      const { data: invitesData, error: invitesError } = await supabase
        .from("account_provisioning")
        .select("id, email, role, is_active, is_used, created_at, expires_at")
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

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.agency_id) return;

      // Load all team members for this agency
      const { data: membersData, error } = await supabase
        .from("user_roles")
        .select("user_id, role, profiles(email, full_name)")
        .eq("agency_id", roleData.agency_id);

      if (error) {
        console.error("[Team] Failed to load members:", error);
        return;
      }

      const formattedMembers: TeamMember[] = (membersData || []).map((m: any) => ({
        id: m.user_id,
        email: m.profiles?.email || "N/A",
        name: m.profiles?.full_name || null,
        role: m.role,
        status: "활성",
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("[Team] Failed to load members:", error);
    }
  };

  const generateInviteLink = async () => {
    if (!agencyId) {
      toast.error("에이전시 정보를 불러올 수 없습니다.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("invite_member", {
        p_agency_id: agencyId,
        p_email: `invite_${Date.now()}@link.sympohub.com`, // dummy email
        p_role: "staff",
      });

      if (error) {
        console.error("[Team] Invite link error:", error);
        toast.error("초대 링크 생성 실패", {
          description: error.message,
        });
        return;
      }

      const result = data as any;

      if (result?.status === "error") {
        toast.error(result.message);
        return;
      }

      // Extract token from result
      const token = result?.token || result?.invite_token;
      if (!token) {
        toast.error("초대 토큰을 생성할 수 없습니다.");
        return;
      }

      const inviteUrl = `https://sympohub.com/invite?token=${token}`;
      await navigator.clipboard.writeText(inviteUrl);

      toast.success("초대 링크가 복사되었습니다.", {
        description: "이 링크를 팀원에게 전달하세요.",
      });

      // Reload invites
      loadInvites();
    } catch (error: any) {
      console.error("[Team] Invite link exception:", error);
      toast.error("초대 링크 생성 실패", {
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!agencyId) {
      toast.error("에이전시 정보를 확인할 수 없습니다.");
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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "수락됨":
        return "bg-green-100 text-green-700";
      case "대기중":
        return "bg-gray-100 text-gray-700";
      case "취소됨":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold">팀원 초대</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              에이전시 팀원을 초대하고 역할을 관리합니다
            </p>
          </div>
          <Button 
            onClick={generateInviteLink}
            disabled={submitting || !agencyId}
            className="px-5"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {submitting ? "생성 중..." : "초대 링크 생성"}
          </Button>
        </div>

        {/* Current Team Members */}
        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              현재 팀원
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              에이전시에 등록된 모든 팀원입니다
            </p>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 팀원이 없습니다.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>권한</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="text-[13px] font-mono">
                          {member.email}
                        </TableCell>
                        <TableCell className="text-[13px]">
                          {member.name || "-"}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={member.role} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invite Logs */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold mb-3 text-foreground">최근 초대 로그</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">최근 초대 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {invites.slice(0, 3).map((log) => (
                <li key={log.id} className="text-sm text-foreground flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">링크 발급됨</span>
                  <span className="text-muted-foreground text-xs">
                    ({format(new Date(log.created_at), "MM월 dd일 HH:mm")})
                  </span>
                  <Badge variant={getStatusVariant(getInviteStatus(log))} className="ml-auto">
                    {getInviteStatus(log)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
