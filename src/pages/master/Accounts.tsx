import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export default function MasterAccounts() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, code, contact_name, contact_email, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgencies(data || []);
    } catch (err: any) {
      console.error('[MasterAccounts] Error loading agencies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">계정 관리</h1>
          <p className="text-muted-foreground">에이전시 계정 및 사용자 관리</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          에이전시 등록
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">오류 발생</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>에이전시 목록</CardTitle>
          <CardDescription>
            등록된 모든 에이전시 계정을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">에이전시명</th>
                  <th className="p-3 text-left font-medium">코드</th>
                  <th className="p-3 text-left font-medium">담당자</th>
                  <th className="p-3 text-left font-medium">연락처</th>
                  <th className="p-3 text-center font-medium">상태</th>
                  <th className="p-3 text-center font-medium">가입일</th>
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
                      <td className="p-3 text-muted-foreground">{agency.code || '-'}</td>
                      <td className="p-3">{agency.contact_name || '-'}</td>
                      <td className="p-3 text-muted-foreground">{agency.contact_email || '-'}</td>
                      <td className="p-3 text-center">
                        <Badge variant={agency.is_active ? 'default' : 'secondary'}>
                          {agency.is_active ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {new Date(agency.created_at).toLocaleDateString('ko-KR')}
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
