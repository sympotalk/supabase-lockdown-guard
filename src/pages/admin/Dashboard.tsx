import { Calendar, Users, Hotel, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

const recentEvents = [
  {
    id: 1,
    name: "2025 글로벌 테크 컨퍼런스",
    date: "2025-03-15",
    participants: 245,
    status: "active" as const,
  },
  {
    id: 2,
    name: "스타트업 네트워킹 데이",
    date: "2025-03-20",
    participants: 180,
    status: "pending" as const,
  },
  {
    id: 3,
    name: "AI 혁신 포럼",
    date: "2025-04-05",
    participants: 320,
    status: "active" as const,
  },
  {
    id: 4,
    name: "디자인 씽킹 워크샵",
    date: "2025-04-12",
    participants: 95,
    status: "completed" as const,
  },
];

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="mt-2 text-muted-foreground">
              SympoHub 행사 관리 플랫폼에 오신 것을 환영합니다
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Calendar className="h-5 w-5" />
            새 행사 등록
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="전체 행사"
            value={24}
            description="이번 달 진행 중"
            icon={Calendar}
            trend={{ value: "12%", isPositive: true }}
          />
          <StatCard
            title="총 참가자"
            value="3,847"
            description="전체 등록 인원"
            icon={Users}
            trend={{ value: "8.2%", isPositive: true }}
          />
          <StatCard
            title="숙박 이용률"
            value="87%"
            description="객실 배정 완료"
            icon={Hotel}
            trend={{ value: "5.1%", isPositive: true }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                최근 행사
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">행사명</TableHead>
                      <TableHead className="font-semibold">일자</TableHead>
                      <TableHead className="font-semibold">참가자</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((event) => (
                      <TableRow key={event.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell>{event.date}</TableCell>
                        <TableCell>{event.participants}명</TableCell>
                        <TableCell>
                          <StatusBadge status={event.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">빠른 작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Calendar className="h-5 w-5 text-primary" />
                새 행사 등록
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Users className="h-5 w-5 text-primary" />
                참가자 추가
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                <Hotel className="h-5 w-5 text-primary" />
                객실 배정
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
