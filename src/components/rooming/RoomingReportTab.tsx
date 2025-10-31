// [Phase 77-C] AI 룸핑 리포트 탭
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface RoomingReportTabProps {
  eventId: string;
}

export default function RoomingReportTab({ eventId }: RoomingReportTabProps) {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadReport();
  }, [eventId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('ai_rooming_report', {
        p_event_id: eventId
      });

      if (error) throw error;
      setReportData(data || []);
    } catch (error: any) {
      console.error('[Phase 77-C] 리포트 로드 실패:', error);
      toast.error('리포트 로드 실패', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFulfillment = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc('ai_update_request_fulfillment', {
        p_event_id: eventId
      });

      if (error) throw error;

      const result = data as { success: boolean; updated: number; event_id: string };

      toast.success('SmartBadge 동기화 완료', {
        description: `${result.updated}개의 요청사항이 이행 완료로 변경되었습니다.`
      });

      loadReport(); // 리포트 재로드
    } catch (error: any) {
      console.error('[Phase 77-C] 동기화 실패:', error);
      toast.error('동기화 실패', {
        description: error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast.warning('내보낼 데이터가 없습니다');
      return;
    }

    // CSV 헤더
    const headers = [
      '참가자명',
      '역할',
      '객실타입',
      '크레딧',
      '배정상태',
      '동반자',
      '요청사항',
      '매칭사유',
      '점수',
      '배정일시'
    ];

    // CSV 데이터 생성
    const csvData = reportData.map(row => [
      row.participant_name || '-',
      row.fixed_role || '-',
      row.room_type_name || '-',
      row.room_credit || '-',
      row.room_status || '-',
      row.companion_names || '없음',
      row.request_summary || '없음',
      row.match_reason || '-',
      row.match_score || '-',
      row.assigned_at ? format(new Date(row.assigned_at), 'yyyy-MM-dd HH:mm') : '-'
    ]);

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `rooming_report_${eventId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV 파일이 다운로드되었습니다');
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p>리포트를 생성하는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 컨트롤 바 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">AI 룸핑 리포트</h3>
              <p className="text-sm text-muted-foreground">
                총 {reportData.length}명의 참가자 배정 정보
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncFulfillment}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              SmartBadge 동기화
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              CSV 다운로드
            </Button>
          </div>
        </div>
      </Card>

      {/* 리포트 테이블 */}
      {reportData.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">
            아직 배정된 참가자가 없습니다
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            AI 자동 배정을 실행하거나 수동으로 참가자를 배정해보세요
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">참가자명</TableHead>
                  <TableHead className="w-20">역할</TableHead>
                  <TableHead className="w-32">객실타입</TableHead>
                  <TableHead className="w-24 text-right">크레딧</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-24">동반자</TableHead>
                  <TableHead className="w-48">요청사항</TableHead>
                  <TableHead className="w-40">매칭사유</TableHead>
                  <TableHead className="w-16 text-center">점수</TableHead>
                  <TableHead className="w-32">배정일시</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, idx) => (
                  <TableRow key={row.participant_id || idx}>
                    <TableCell className="font-medium">
                      {row.participant_name || '-'}
                    </TableCell>
                    <TableCell>
                      {row.fixed_role && (
                        <Badge variant="outline" className="text-xs">
                          {row.fixed_role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{row.room_type_name || '-'}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.room_credit ? `${Number(row.room_credit).toLocaleString()}원` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.room_status === '자동배정' ? 'default' :
                          row.room_status === '수동배정' ? 'secondary' :
                          row.room_status === '동반배정' ? 'outline' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {row.room_status || '대기'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.companion_names !== '없음' ? (
                        <span className="text-blue-600">{row.companion_names}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.request_summary}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.match_reason || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.match_score ? (
                        <Badge 
                          variant={row.match_score >= 80 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {row.match_score}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.assigned_at ? format(new Date(row.assigned_at), 'MM-dd HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
