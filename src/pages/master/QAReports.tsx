import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

type QAReport = {
  id: string;
  title: string;
  status: string;
  category: string;
  generated_at: string;
};

export default function MasterQAReports() {
  const [reports, setReports] = useState<QAReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const result = await supabase
        .from('qa_reports')
        .select('id, title, status, category, generated_at')
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);

      if (result.error) {
        console.error('[QAReports] Error:', result.error);
      } else if (result.data) {
        setReports(result.data.map((item: any) => ({
          id: item.id,
          title: item.title || 'QA Report',
          status: item.status || 'PASS',
          category: item.category || 'System',
          generated_at: item.generated_at
        })));
      }
    } catch (err) {
      console.error('[QAReports] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">QA 리포트</h1>
      {reports.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          리포트가 없습니다.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {reports.map((r) => (
            <div key={r.id} className="p-3 flex justify-between text-sm hover:bg-muted/30">
              <div className="flex flex-col">
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === 'PASS' ? 'default' : 'destructive'}>
                  {r.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(r.generated_at).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
