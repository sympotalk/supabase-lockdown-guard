import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteModal } from "@/components/accounts/InviteModal";
import { AgencyCreateModal } from "@/components/accounts/AgencyCreateModal";
import { Users, Building2, Activity, Mail, Shield, UserPlus, Plus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface AccountSummary {
  total_agencies: number;
  active_agencies: number;
  total_users: number;
  recent_logins: number;
  checked_at: string;
}

interface AgencyUser {
  id: string;
  email: string;
  role: string;
  agency: string;
  agency_id: string;
  is_active: boolean;
  last_sign_in_at: string | null;
}

interface Agency {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  is_active: boolean;
  created_at: string;
}

export default function Accounts() {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [agencyCreateOpen, setAgencyCreateOpen] = useState(false);

  useEffect(() => {
    loadAccountData();
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    logSys("Loading agencies...");
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgencies((data as any) || []);
    } catch (error) {
      errorSys("Failed to load agencies:", error);
    }
  };

  const loadAccountData = async () => {
    setLoading(true);
    logSys("Loading master account summary and users...");

    try {
      // Load summary
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        "rpc_get_master_account_summary" as any
      );

      if (summaryError) throw summaryError;
      setSummary(summaryData);

      // Load users directly from master_users (no join)
      const { data: usersData, error: usersError } = await supabase
        .from("master_users")
        .select("id, email, role, agency, last_login, active")
        .order("last_login", { ascending: false, nullsFirst: false });

      if (usersError) {
        console.warn('[Accounts] Load skipped:', usersError.message);
        setUsers([]);
        return;
      }

      const enrichedUsers: AgencyUser[] = (usersData || []).map((u: any) => ({
        id: u.id,
        email: u.email || "Unknown",
        role: u.role || "staff",
        agency: u.agency || "Unknown",
        agency_id: "",
        is_active: u.active ?? true,
        last_sign_in_at: u.last_login || null,
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.warn('[Accounts] Error loading account data:', error);
      setUsers([]);
    }

    setLoading(false);
  };

  const getRoleBadge = (role: string) => {
    const config = {
      master: { variant: "default" as const, label: "Master" },
      agency_owner: { variant: "secondary" as const, label: "Owner" },
      admin: { variant: "outline" as const, label: "Admin" },
      staff: { variant: "outline" as const, label: "Staff" },
    }[role] || { variant: "outline" as const, label: role };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold">계정 관리</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            전체 시스템 사용자 및 에이전시 계정 관리
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setAgencyCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            에이전시 등록
          </Button>
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            사용자 초대
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">총 에이전시</p>
                  <p className="text-[24px] font-bold">{summary.total_agencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">활성 에이전시</p>
                  <p className="text-[24px] font-bold">{summary.active_agencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">총 사용자</p>
                  <p className="text-[24px] font-bold">{summary.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[12px] text-muted-foreground">24시간 로그인</p>
                  <p className="text-[24px] font-bold">{summary.recent_logins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agencies Management */}
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[16px]">에이전시 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 에이전시가 없습니다.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>에이전시명</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className="text-[14px] font-medium">
                        {agency.name}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {agency.contact_name || "-"}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {agency.contact_email || "-"}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {format(new Date(agency.created_at), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={agency.is_active ? "default" : "secondary"}>
                          {agency.is_active ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[16px]">전체 사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>에이전시</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>최근 로그인</TableHead>
                  <TableHead className="w-[100px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      사용자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[14px]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-[14px]">{user.agency}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {user.last_sign_in_at
                          ? format(new Date(user.last_sign_in_at), "yyyy-MM-dd HH:mm")
                          : "미접속"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          수정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        agencyId=""
        isMaster={true}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        onSuccess={loadAccountData}
      />
      <AgencyCreateModal
        open={agencyCreateOpen}
        onOpenChange={setAgencyCreateOpen}
        onSuccess={loadAgencies}
      />
    </div>
  );
}
