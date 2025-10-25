import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Users } from "lucide-react";

interface Summary {
  agencies: number;
  events: number;
  participants: number;
}

interface ActivityLog {
  title: string;
  created_at: string;
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary>({ agencies: 0, events: 0, participants: 0 });
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    console.log("[MasterDashboard] Loading summary...");

    // Parallel queries for counts
    const [
      { count: agencyCount },
      { count: eventCount },
      { count: participantCount },
      { data: logs }
    ] = await Promise.all([
      supabase.from("agencies").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("participants").select("*", { count: "exact", head: true }),
      supabase
        .from("activity_logs")
        .select("title, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    setSummary({
      agencies: agencyCount ?? 0,
      events: eventCount ?? 0,
      participants: participantCount ?? 0,
    });
    setRecentLogs(logs ?? []);
    
    console.log("[MasterDashboard] Summary loaded:", { agencyCount, eventCount, participantCount });
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SympoHub Master Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">전체 시스템 현황 및 주요 활동 요약</p>
        </div>
        <Button onClick={() => navigate("/master/agencies")}>
          에이전시 관리로 이동
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 에이전시</p>
                <h3 className="text-2xl font-bold mt-2">{summary.agencies}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 행사</p>
                <h3 className="text-2xl font-bold mt-2">{summary.events}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체 참가자</p>
                <h3 className="text-2xl font-bold mt-2">{summary.participants}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent System Logs */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">최근 시스템 로그</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">최근 활동 내역이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((log, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-xs text-muted-foreground/60 min-w-[140px]">
                    {new Date(log.created_at).toLocaleString("ko-KR")}
                  </span>
                  <span>—</span>
                  <span>{log.title}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
