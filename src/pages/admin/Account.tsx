import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Users, Copy, Plus, RefreshCw } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { InviteModal } from "@/components/accounts/InviteModal";
import { supabase } from "@/integrations/supabase/client";
import { Spinner } from "@/components/pd/Spinner";

interface Agency {
  id: string;
  name: string;
  contact_email: string | null;
  created_at: string;
  is_active: boolean;
  member_count: number;
}

interface InviteRecord {
  id: string;
  email: string;
  invite_token: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export default function Account() {
  const { user, role, userId } = useUser();
  
  // Redirect non-master users to agency account page
  if (role !== "master") {
    return <Navigate to="/agency/account" replace />;
  }

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAgencies(), loadInvites()]);
    } catch (error) {
      console.error("Failed to load account data:", error);
      toast.error("데이터 로드 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const loadAgencies = async () => {
    try {
      // Get agencies with member counts
      const { data: agenciesData, error: agenciesError } = await supabase
        .from("agencies")
        .select("id, name, contact_email, created_at, is_active")
        .order("created_at", { ascending: false });

      if (agenciesError) throw agenciesError;

      // Get member counts for each agency
      const agenciesWithCounts = await Promise.all(
        (agenciesData || []).map(async (agency) => {
          const { count } = await supabase
            .from("agency_members")
            .select("*", { count: "exact", head: true })
            .eq("agency_id", agency.id);

          return {
            ...agency,
            member_count: count || 0,
          };
        })
      );

      setAgencies(agenciesWithCounts);
      
      // Calculate total users
      const total = agenciesWithCounts.reduce((sum, a) => sum + a.member_count, 0);
      setTotalUsers(total);
    } catch (error) {
      console.error("Failed to load agencies:", error);
    }
  };

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from("account_provisioning")
        .select("id, email, invite_token, expires_at, is_used, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error("Failed to load invites:", error);
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("초대 링크가 복사되었습니다");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">계정 관리</h1>
          <p className="mt-2 text-muted-foreground">
            마스터 계정 및 하위 에이전시를 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2"
            onClick={loadData}
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button size="lg" className="gap-2" onClick={() => setInviteModalOpen(true)}>
            <Plus className="h-5 w-5" />
            사용자 초대
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              마스터 계정 정보
            </CardTitle>
            <CardDescription>현재 로그인한 계정의 정보입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>계정 유형</Label>
              <div>
                <Badge variant="default" className="text-sm">
                  Master Account
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>조직명</Label>
              <p className="text-sm">SympoHub</p>
            </div>
            <div className="space-y-2">
              <Label>이메일</Label>
              <p className="text-sm text-muted-foreground">{user?.email || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label>사용자 ID</Label>
              <p className="text-xs text-muted-foreground font-mono">{userId || "-"}</p>
            </div>
            <div className="space-y-2">
              <Label>가입일</Label>
              <p className="text-sm text-muted-foreground">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              통계
            </CardTitle>
            <CardDescription>하위 에이전시 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">전체 에이전시</p>
                <p className="text-2xl font-bold">{agencies.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary/20" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">활성 사용자</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>하위 에이전시 목록</CardTitle>
          <CardDescription>
            마스터 계정에 연결된 에이전시 목록입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 에이전시가 없습니다
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">에이전시명</TableHead>
                    <TableHead className="font-semibold">이메일</TableHead>
                    <TableHead className="font-semibold">사용자</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold">가입일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency) => (
                    <TableRow key={agency.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agency.contact_email || "-"}
                      </TableCell>
                      <TableCell>{agency.member_count}명</TableCell>
                      <TableCell>
                        {agency.is_active ? (
                          <Badge variant="default">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(agency.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>초대 링크 관리</CardTitle>
          <CardDescription>
            생성된 초대 링크를 확인하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              생성된 초대 링크가 없습니다
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">이메일</TableHead>
                    <TableHead className="font-semibold">만료일</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold">생성일</TableHead>
                    <TableHead className="font-semibold">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        {invite.is_used ? (
                          <Badge variant="secondary">사용됨</Badge>
                        ) : new Date(invite.expires_at) < new Date() ? (
                          <Badge variant="destructive">만료됨</Badge>
                        ) : (
                          <Badge variant="default">활성</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.invite_token)}
                          disabled={invite.is_used || new Date(invite.expires_at) < new Date()}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
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
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        agencyId=""
        isMaster={true}
        agencies={agencies.map(a => ({ id: a.id, name: a.name }))}
        onSuccess={() => {
          loadInvites();
          toast.success("초대가 완료되었습니다");
        }}
      />
    </div>
  );
}
