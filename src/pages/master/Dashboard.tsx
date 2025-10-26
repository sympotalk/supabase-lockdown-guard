import { useMaster } from '@/hooks/useMaster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, Users, Activity } from 'lucide-react';
import { useEffect } from 'react';

export default function MasterDashboard() {
  const { agencies, loading, error } = useMaster();

  // Clear agency scope when entering master routes
  useEffect(() => {
    localStorage.removeItem('agency_scope');
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">오류 발생</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalAgencies = agencies.length;
  const activeAgencies = agencies.filter((a) => a.is_active).length;
  const totalEvents = agencies.reduce((sum, a) => sum + a.event_count, 0);
  const totalParticipants = agencies.reduce((sum, a) => sum + a.participant_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SympoHub Master Dashboard</h1>
        <p className="text-muted-foreground">전체 에이전시 현황 및 시스템 지표</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 에이전시</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgencies}</div>
            <p className="text-xs text-muted-foreground">
              활성: {activeAgencies}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 행사</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              전체 에이전시 합계
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 참가자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              전체 에이전시 합계
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">정상</div>
            <p className="text-xs text-muted-foreground">
              모든 서비스 가동 중
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>에이전시 현황</CardTitle>
          <CardDescription>
            전체 에이전시의 활동 현황을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">에이전시명</th>
                  <th className="p-3 text-center font-medium">코드</th>
                  <th className="p-3 text-center font-medium">행사</th>
                  <th className="p-3 text-center font-medium">참가자</th>
                  <th className="p-3 text-center font-medium">최근 활동</th>
                  <th className="p-3 text-center font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {agencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      등록된 에이전시가 없습니다
                    </td>
                  </tr>
                ) : (
                  agencies.map((agency) => (
                    <tr key={agency.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{agency.name}</td>
                      <td className="p-3 text-center text-muted-foreground">
                        {agency.code || '-'}
                      </td>
                      <td className="p-3 text-center">{agency.event_count}</td>
                      <td className="p-3 text-center">{agency.participant_count}</td>
                      <td className="p-3 text-center text-muted-foreground">
                        {agency.last_activity
                          ? new Date(agency.last_activity).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={agency.is_active ? 'default' : 'secondary'}>
                          {agency.is_active ? '활성' : '비활성'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

