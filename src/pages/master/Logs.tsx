import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';

interface SystemLog {
  id: number;
  category: string;
  title: string;
  level: string;
  created_at: string;
}

export default function MasterSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs(data || []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">시스템 로그</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            로그 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-4">
                <Badge>{log.level}</Badge>
                <div className="flex-1">
                  <span className="font-medium">{log.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{log.category}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ko-KR')}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="p-6 text-center text-muted-foreground">로그가 없습니다</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
