import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Link2, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface OrphanUser {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Agency {
  id: string;
  name: string;
}

export default function OrphanLinker() {
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load orphan users
      const { data: orphanData, error: orphanError } = await supabase.rpc("get_orphan_users");

      if (orphanError) throw orphanError;

      setOrphans((orphanData as OrphanUser[]) || []);

      // Load agencies
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (agencyError) throw agencyError;

      setAgencies(agencyData || []);
    } catch (error: any) {
      console.error("[OrphanLinker] Load error:", error);
      toast.error("데이터 로드에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (userId: string) => {
    if (!selectedAgency) {
      toast.error("에이전시를 선택해주세요");
      return;
    }

    setLinkingUserId(userId);

    try {
      const { data, error } = await supabase.rpc("link_orphan_user", {
        p_user_id: userId,
        p_agency_id: selectedAgency,
        p_role: "staff",
      });

      const result = data as any;

      if (error || result?.status === "error") {
        throw new Error(result?.message || "연결에 실패했습니다");
      }

      if (result?.already_linked) {
        toast.success("이미 연결된 계정입니다");
      } else {
        toast.success("사용자가 에이전시에 연결되었습니다");
      }

      // Reload data
      await loadData();
      setSelectedAgency("");
    } catch (error: any) {
      console.error("[OrphanLinker] Link error:", error);
      toast.error(error.message || "연결에 실패했습니다");
    } finally {
      setLinkingUserId(null);
    }
  };

  const filteredOrphans = orphans.filter((orphan) => {
    const term = searchTerm.toLowerCase();
    return (
      orphan.email.toLowerCase().includes(term) ||
      orphan.display_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold">Orphan 계정 복구</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            에이전시에 연결되지 않은 계정을 복구합니다
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {/* Warning Banner */}
      {orphans.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                {orphans.length}개의 Orphan 계정 발견
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              이 계정들은 에이전시에 연결되지 않았습니다. 아래에서 적절한 에이전시를 선택하여 연결해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">이메일 또는 이름</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="검색어 입력..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-64">
              <Label htmlFor="agency">연결할 에이전시</Label>
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger id="agency" className="mt-2">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orphan Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orphan 계정 목록</CardTitle>
          <CardDescription>
            총 {filteredOrphans.length}개의 계정
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : filteredOrphans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "검색 결과가 없습니다" : "연결되지 않은 계정이 없습니다"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이메일</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>최근 로그인</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrphans.map((orphan) => (
                    <TableRow key={orphan.user_id}>
                      <TableCell className="text-[13px] font-medium">
                        {orphan.email}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {orphan.display_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {format(new Date(orphan.created_at), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {orphan.last_sign_in_at ? (
                          format(new Date(orphan.last_sign_in_at), "yyyy-MM-dd HH:mm")
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            미로그인
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLink(orphan.user_id)}
                          disabled={!selectedAgency || linkingUserId === orphan.user_id}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          {linkingUserId === orphan.user_id ? "연결 중..." : "연결하기"}
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
    </div>
  );
}
