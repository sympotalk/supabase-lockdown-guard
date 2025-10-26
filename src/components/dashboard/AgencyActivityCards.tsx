import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, TrendingUp, Upload } from "lucide-react";

interface AgencyActivity {
  activeAgencies: number;
  recentEvents: number;
  totalParticipants: number;
  recentUploads: number;
}

interface TopAgency {
  id: string;
  name: string;
  activityCount: number;
}

export function AgencyActivityCards() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<AgencyActivity>({
    activeAgencies: 0,
    recentEvents: 0,
    totalParticipants: 0,
    recentUploads: 0
  });
  const [topAgencies, setTopAgencies] = useState<TopAgency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgencyActivity();
  }, []);

  const loadAgencyActivity = async () => {
    setLoading(true);
    console.log("[AgencyActivity] Loading activity data...");

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // B1: Active Agencies
      const { count: activeAgencies } = await supabase
        .from("agencies")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // B2: Recent Events (7 days)
      const { count: recentEvents } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // B3: Total Participants
      const { count: totalParticipants } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true });

      // B4: Recent Uploads (3 days)
      const { data: uploadData } = await supabase
        .from("activity_logs")
        .select("id")
        .eq("type", "upload")
        .gte("created_at", threeDaysAgo.toISOString());

      // B5: Top 3 Active Agencies
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name")
        .eq("is_active", true)
        .limit(10);

      if (agencies) {
        const agenciesWithActivity = await Promise.all(
          agencies.map(async (agency) => {
            const { count } = await supabase
              .from("activity_logs")
              .select("*", { count: "exact", head: true })
              .eq("agency_id", agency.id)
              .gte("created_at", sevenDaysAgo.toISOString());

            return {
              id: agency.id,
              name: agency.name,
              activityCount: count || 0
            };
          })
        );

        const sortedAgencies = agenciesWithActivity
          .sort((a, b) => b.activityCount - a.activityCount)
          .slice(0, 3);

        setTopAgencies(sortedAgencies);
      }

      setActivity({
        activeAgencies: activeAgencies ?? 0,
        recentEvents: recentEvents ?? 0,
        totalParticipants: totalParticipants ?? 0,
        recentUploads: uploadData?.length ?? 0
      });
    } catch (error) {
      console.error("[AgencyActivity] Error loading:", error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="shadow-md animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-md animate-pulse">
          <CardContent className="p-6">
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* B1: Active Agencies */}
        <Card className="shadow-md rounded-[16px]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-[14px] text-muted-foreground">활성 에이전시</p>
            </div>
            <p className="text-[28px] font-bold">{activity.activeAgencies}</p>
          </CardContent>
        </Card>

        {/* B2: Recent Events */}
        <Card className="shadow-md rounded-[16px]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-[14px] text-muted-foreground">신규 행사 (7일)</p>
            </div>
            <p className="text-[28px] font-bold">{activity.recentEvents}</p>
          </CardContent>
        </Card>

        {/* B3: Total Participants */}
        <Card className="shadow-md rounded-[16px]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-[14px] text-muted-foreground">전체 참가자</p>
            </div>
            <p className="text-[28px] font-bold">{activity.totalParticipants}</p>
          </CardContent>
        </Card>

        {/* B4: Recent Uploads */}
        <Card className="shadow-md rounded-[16px]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-[14px] text-muted-foreground">최근 업로드 (3일)</p>
            </div>
            <p className="text-[28px] font-bold">{activity.recentUploads}</p>
          </CardContent>
        </Card>
      </div>

      {/* B5: Top 3 Active Agencies Table */}
      <Card className="shadow-md rounded-[16px]">
        <CardContent className="p-6">
          <h3 className="text-[16px] font-semibold mb-4">최근 활동 에이전시 TOP 3</h3>
          {topAgencies.length === 0 ? (
            <p className="text-[14px] text-muted-foreground text-center py-4">활동 데이터가 없습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>순위</TableHead>
                  <TableHead>에이전시명</TableHead>
                  <TableHead className="text-right">활동 건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgencies.map((agency, idx) => (
                  <TableRow 
                    key={agency.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/master/agencies`)}
                  >
                    <TableCell className="font-medium">#{idx + 1}</TableCell>
                    <TableCell>{agency.name}</TableCell>
                    <TableCell className="text-right">{agency.activityCount}건</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
