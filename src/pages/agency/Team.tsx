import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { InviteModal } from "@/components/accounts/InviteModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/accounts/RoleBadge";
import { UserPlus, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUser } from "@/context/UserContext";

interface InvitedUser {
  id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function AgencyTeam() {
  const { role, userId } = useUser();
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string>("");
  const [agencyName, setAgencyName] = useState<string>("");
  
  // Only AGENCY_OWNER can invite users (STAFF can only view)
  const canInvite = role === 'agency_owner';

  useEffect(() => {
    loadAgencyInfo();
    loadInvites();
  }, []);

  const loadAgencyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.agency_id) return;

      const { data: agencyData } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", roleData.agency_id)
        .single();

      setAgencyId(roleData.agency_id);
      setAgencyName(agencyData?.name || "");
    } catch (error) {
      console.error("Failed to load agency info:", error);
    }
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.agency_id) return;

      const { data: agencyData } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", roleData.agency_id)
        .single();

      if (!agencyData?.name) return;

      type MasterUserRow = {
        id: string;
        email: string;
        role: string;
        created_at: string;
      };
      
      const result = await (supabase as any)
        .from("master_users")
        .select("id, email, role, created_at")
        .eq("agency", agencyData.name)
        .neq("role", "master")
        .order("created_at", { ascending: false });
      
      const masterUsersData: MasterUserRow[] = result?.data || [];

      const invitedUsers: InvitedUser[] = masterUsersData.map((item) => ({
        id: item.id || "",
        email: item.email || "",
        role: item.role || "staff",
        active: true,
        created_at: item.created_at || new Date().toISOString(),
      }));
      
      setInvites(invitedUsers);
    } catch (error) {
      console.error("Failed to load invites:", error);
      toast.error("초대 내역을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <AccountLayout>
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-[28px] font-bold">팀원 관리</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            에이전시 팀원을 초대하고 관리하세요
          </p>
        </div>

        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                팀원 초대
              </CardTitle>
              {canInvite && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  새 팀원 초대
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] text-muted-foreground mb-4">
              에이전시 팀원을 초대하여 함께 작업하세요
            </p>
            {!canInvite && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-medium">안내:</span> 팀원 초대는 에이전시 관리자만 가능합니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">초대 내역</CardTitle>
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
                      <TableHead>초대일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="text-[13px]">{invite.email}</TableCell>
                        <TableCell>
                          <RoleBadge role={invite.role} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={invite.active ? "default" : "secondary"}>
                            {invite.active ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">
                          {format(new Date(invite.created_at), "yyyy-MM-dd")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <InviteModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          agencyId={agencyId}
          onSuccess={loadInvites}
        />
      </div>
    </AccountLayout>
  );
}
