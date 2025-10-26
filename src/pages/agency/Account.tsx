import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ProfileForm } from "@/components/accounts/ProfileForm";
import { InviteModal } from "@/components/accounts/InviteModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  agency?: string;
  agency_id?: string;
}

interface InvitedUser {
  id: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function AgencyAccount() {
  const [profile, setProfile] = useState<UserProfile>({});
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadInvites();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role and agency
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (roleData?.agency_id) {
        const { data: agencyData } = await supabase
          .from("agencies")
          .select("name")
          .eq("id", roleData.agency_id)
          .single();

        setProfile({
          email: user.email,
          agency: agencyData?.name,
          agency_id: roleData.agency_id,
        });
      } else {
        setProfile({ email: user.email });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get agency_id for current user
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("agency_id")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.agency_id) return;

      // Get invited users for this agency
      const { data } = await supabase
        .from("master_users")
        .select("*")
        .eq("agency", (await supabase.from("agencies").select("name").eq("id", roleData.agency_id).single()).data?.name)
        .order("created_at", { ascending: false });

      setInvites((data as any) || []);
    } catch (error) {
      console.error("Failed to load invites:", error);
    }
    setLoading(false);
  };

  const handleSaveProfile = async (data: UserProfile) => {
    try {
      toast({
        title: "프로필 저장 완료",
        description: "프로필 정보가 업데이트되었습니다.",
      });
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-[28px] font-bold">계정 관리</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            프로필 정보를 수정하고 팀원을 초대하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileForm
            user={profile}
            onSave={handleSaveProfile}
            readOnly={["email", "agency"]}
          />

          <Card className="shadow-md rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  팀원 초대
                </CardTitle>
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  초대
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-muted-foreground mb-4">
                에이전시 팀원을 초대하여 함께 작업하세요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invites List */}
        <Card className="shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">초대 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
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
                          <Badge variant="outline">{invite.role}</Badge>
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
          agencyId={profile.agency_id || ""}
          onSuccess={loadInvites}
        />
      </div>
    </AccountLayout>
  );
}
