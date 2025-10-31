import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/pd/Spinner";
import { ArrowLeft, Building2, Calendar, Shield, Link as LinkIcon, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MasterLayout } from "@/components/layout/MasterLayout";

interface Agency {
  id: string;
  name: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

interface InviteRecord {
  id: string;
  email: string;
  invite_token: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

export default function AgencyView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setAgencyScope } = useUser();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    loadAgency();
    loadInvites();
  }, [id]);

  // [74-A.8] Realtime subscription for invite updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`agency_invites_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_provisioning',
          filter: `agency_id=eq.${id}`,
        },
        () => {
          console.log('[AgencyView] Invite update detected, refreshing...');
          loadInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // [74-A.8] Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadInvites();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // [3.14-MA.RESTORE.R2] Update document title with agency name
  useEffect(() => {
    if (agency?.name) {
      document.title = `SympoHub | ${agency.name}`;
    }
    return () => {
      document.title = "SympoHub";
    };
  }, [agency]);

  const loadAgency = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setAgency(data);
    } catch (error: any) {
      console.error("[AgencyView] Error loading agency:", error);
      toast({
        title: "오류",
        description: "에이전시 정보를 불러오지 못했습니다.",
        variant: "destructive",
      });
      navigate("/master/agencies");
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("account_provisioning")
        .select("id, email, invite_token, expires_at, is_used, created_at")
        .eq("agency_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error: any) {
      console.error("[AgencyView] Error loading invites:", error);
    }
  };

  const handleCreateInvite = async () => {
    if (!agency?.id) return;

    setCreatingInvite(true);
    try {
      const { data, error } = await supabase.rpc('create_agency_invite', {
        p_agency_id: agency.id,
        p_email: null,
        p_role: 'staff'
      });

      if (error) throw error;

      // [74-B.0-FIX] Use properly serialized invite_url from RPC
      const result = data as { token: string; invite_url: string; expires_at: string };
      const inviteUrl = result?.invite_url || `${window.location.origin}/invite?token=${result?.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      toast({
        title: "초대 링크가 생성되어 복사되었습니다",
        description: "링크를 공유하여 사용자를 초대하세요.",
      });

      // [74-A.8] Auto-refresh after creation
      setTimeout(() => loadInvites(), 500);
    } catch (error: any) {
      console.error("[AgencyView] Error creating invite:", error);
      toast({
        title: "초대 생성 중 오류가 발생했습니다",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingInvite(false);
    }
  };

  // [74-A.8] Get invite status with expiry check
  const getInviteStatus = (invite: InviteRecord): "active" | "used" | "expired" => {
    if (invite.is_used) return "used";
    if (new Date(invite.expires_at) < new Date()) return "expired";
    return "active";
  };

  // [74-A.8] Get status badge styling
  const getStatusBadgeProps = (status: "active" | "used" | "expired") => {
    switch (status) {
      case "active":
        return {
          variant: "default" as const,
          className: "bg-blue-50 text-blue-700 border-blue-200",
          label: "대기",
          icon: "🕓"
        };
      case "expired":
        return {
          variant: "destructive" as const,
          className: "bg-red-50 text-red-700 border-red-200",
          label: "만료",
          icon: "⏰"
        };
      case "used":
        return {
          variant: "secondary" as const,
          className: "bg-gray-50 text-gray-700 border-gray-200",
          label: "사용됨",
          icon: "✅"
        };
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "복사 완료",
      description: "초대 링크가 클립보드에 복사되었습니다.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">에이전시 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!agency) {
    return null;
  }

  return (
    <MasterLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/master/agencies")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{agency.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">에이전시 상세 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={agency.is_active ? "default" : "secondary"} className="text-sm">
              {agency.is_active ? "활성" : "비활성"}
            </Badge>
            <Button 
              onClick={handleCreateInvite} 
              disabled={creatingInvite}
              className="gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              {creatingInvite ? "생성 중..." : "초대 링크 생성"}
            </Button>
          </div>
        </div>

        {/* Agency Information Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                기본 정보
              </CardTitle>
              <CardDescription>에이전시 기본 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">에이전시명</p>
                <p className="text-base font-semibold text-foreground mt-1">{agency.name}</p>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                시스템 정보
              </CardTitle>
              <CardDescription>등록 및 상태 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  등록일
                </p>
                <p className="text-base text-foreground mt-1">
                  {new Date(agency.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">에이전시 ID</p>
                <p className="text-base font-mono text-foreground mt-1 text-xs">{agency.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>관리 작업</CardTitle>
            <CardDescription>에이전시 관리 및 접근 권한</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (!agency?.id) {
                    toast({
                      title: "오류",
                      description: "에이전시 ID를 찾을 수 없습니다.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (process.env.NODE_ENV !== "production") {
                    console.log("[AgencyView] Setting agency context:", agency.id);
                  }
                  setAgencyScope(agency.id);
                  navigate("/admin/dashboard");
                }}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                에이전시 대시보드 보기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invite History */}
        <Card>
          <CardHeader>
            <CardTitle>초대 이력</CardTitle>
            <CardDescription>생성된 초대 링크 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                초대 이력이 없습니다
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">이메일</TableHead>
                      <TableHead className="font-semibold">생성일</TableHead>
                      <TableHead className="font-semibold">만료일</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                      <TableHead className="font-semibold text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite, index) => {
                      const status = getInviteStatus(invite);
                      const badgeProps = getStatusBadgeProps(status);
                      const isRecent = index === 0 && new Date().getTime() - new Date(invite.created_at).getTime() < 5000;

                      return (
                        <TableRow 
                          key={invite.id} 
                          className={`hover:bg-muted/50 transition-all duration-300 ${
                            isRecent ? 'animate-in fade-in-0 slide-in-from-top-2 bg-blue-50/50' : ''
                          }`}
                        >
                          <TableCell className="font-medium">
                            {invite.email || <span className="text-muted-foreground italic">일반 초대 링크</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invite.created_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invite.expires_at), "yyyy-MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badgeProps.variant} className={badgeProps.className}>
                              <span className="mr-1">{badgeProps.icon}</span>
                              {badgeProps.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInviteLink(invite.invite_token)}
                              disabled={status !== "active"}
                              title={status === "active" ? "링크 복사" : "비활성 초대"}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
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
    </MasterLayout>
  );
}
