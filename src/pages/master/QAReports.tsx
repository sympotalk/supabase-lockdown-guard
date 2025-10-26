import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface QAReport {
  id: string;
  title: string;
  status: string;
  category: string | null;
  summary: string | null;
  generated_at: string;
}

export default function MasterQAReports() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('qa_reports')
        .select('*')
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('[QAReports] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QA 리포트</h1>
        <p className="text-muted-foreground">시스템 품질 보증 결과</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            QA 리포트 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">생성된 리포트가 없습니다</div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{report.title}</h3>
                      <Badge variant={report.status === 'PASS' ? 'default' : 'destructive'}>{report.status}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(report.generated_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
