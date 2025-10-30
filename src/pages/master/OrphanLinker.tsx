import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Link2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/pd/Spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface OrphanUser {
  user_id: string;
  email: string;
  display_name: string;
  phone: string;
  created_at: string;
  status: string;
}

interface Agency {
  id: string;
  name: string;
}

export default function OrphanLinker() {
  const { toast } = useToast();
  const { role } = useUser();
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAgencies, setSelectedAgencies] = useState<Record<string, string>>({});
  const [linkingUsers, setLinkingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role === "master") {
      loadData();
    }
  }, [role]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (role === "master") {
        loadOrphans(search);
      }
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [search, role]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrphans(), loadAgencies()]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrphans = async (searchTerm: string = "") => {
    try {
      const { data, error } = await supabase.rpc("list_orphan_users", {
        p_search: searchTerm || null,
      });

      if (error) throw error;
      setOrphans(data || []);
    } catch (error: any) {
      console.error("Failed to load orphans:", error);
      toast({
        title: "데이터 로드 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAgencies(data || []);
    } catch (error: any) {
      console.error("Failed to load agencies:", error);
    }
  };

  const handleLink = async (userId: string) => {
    const agencyId = selectedAgencies[userId];
    
    if (!agencyId) {
      toast({
        title: "에이전시를 선택하세요",
        variant: "destructive",
      });
      return;
    }

    setLinkingUsers(prev => new Set(prev).add(userId));

    try {
      const { data, error } = await supabase.rpc("link_user_to_agency", {
        p_user_id: userId,
        p_agency_id: agencyId,
        p_role: "staff",
      });

      if (error) throw error;

      const result = data as { status: string; message?: string };
      
      if (result.status === "success") {
        toast({
          title: "✅ 연결 완료",
          description: "사용자 권한이 적용되었습니다.",
        });

        // Remove from list with highlight effect
        setOrphans(prev => prev.filter(o => o.user_id !== userId));
        setSelectedAgencies(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      } else {
        throw new Error(result.message || "연결 실패");
      }
    } catch (error: any) {
      toast({
        title: "❌ 연결 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLinkingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unlinked":
        return <Badge variant="destructive">미연결</Badge>;
      case "missing_agency":
        return <Badge variant="outline">에이전시 없음</Badge>;
      default:
        return <Badge variant="secondary">알 수 없음</Badge>;
    }
  };

  if (role !== "master") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            MASTER 전용 페이지입니다. 접근 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orphan Recovery Tool</h1>
          <p className="text-muted-foreground mt-2">
            에이전시에 연결되지 않은 사용자를 검색하고 복구합니다.
          </p>
        </div>
        <Button 
          onClick={loadData} 
          variant="outline" 
          size="sm" 
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* Warning Banner */}
      {orphans.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{orphans.length}명의 미연결 사용자</strong>가 발견되었습니다.
            적절한 에이전시를 선택하여 연결하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이메일/이름/연락처로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>에이전시 선택</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-muted-foreground">로딩 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : orphans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {search 
                        ? "결과가 없습니다. 조건을 변경해보세요."
                        : "모든 사용자가 에이전시에 연결되어 있습니다."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orphans.map((orphan) => (
                <TableRow 
                  key={orphan.user_id}
                  className={linkingUsers.has(orphan.user_id) ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">{orphan.email}</TableCell>
                  <TableCell>{orphan.display_name || "-"}</TableCell>
                  <TableCell>{orphan.phone || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(orphan.created_at), "yyyy-MM-dd")}
                  </TableCell>
                  <TableCell>{getStatusBadge(orphan.status)}</TableCell>
                  <TableCell>
                    <Select
                      value={selectedAgencies[orphan.user_id] || ""}
                      onValueChange={(value) =>
                        setSelectedAgencies(prev => ({ ...prev, [orphan.user_id]: value }))
                      }
                      disabled={linkingUsers.has(orphan.user_id)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="에이전시 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleLink(orphan.user_id)}
                      disabled={!selectedAgencies[orphan.user_id] || linkingUsers.has(orphan.user_id)}
                    >
                      {linkingUsers.has(orphan.user_id) ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          연결 중...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          연결하기
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
