import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/pd/Spinner";
import { ArrowLeft, Building2, Mail, Calendar, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Agency {
  id: string;
  name: string;
  contact_email: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export default function AgencyView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setAgencyScope } = useUser();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgency();
  }, [id]);

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
    <div className="min-h-screen w-full bg-background p-8">
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
          <Badge variant={agency.is_active ? "default" : "secondary"} className="text-sm">
            {agency.is_active ? "활성" : "비활성"}
          </Badge>
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
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  대표 이메일
                </p>
                <p className="text-base text-foreground mt-1">{agency.contact_email}</p>
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
      </div>
    </div>
  );
}
