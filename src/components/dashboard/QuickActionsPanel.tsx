import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlayCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logSys, errorSys } from "@/lib/consoleLogger";

interface Playbook {
  key: string;
  name: string;
  icon: string;
}

const playbooks: Playbook[] = [
  { key: 'rt_reconnect', name: 'Realtime 재연결', icon: '🔄' },
  { key: 'fn_rollback', name: '함수 롤백', icon: '⏮️' },
  { key: 'queue_quarantine', name: '큐 격리', icon: '⏸️' }
];

export function QuickActionsPanel() {
  const [executing, setExecuting] = useState<string | null>(null);
  const { toast } = useToast();

  const executePlaybook = async (playbookKey: string) => {
    setExecuting(playbookKey);
    
    try {
      logSys(`Executing playbook: ${playbookKey}`);
      
      const { data, error } = await supabase
        .rpc('ops_execute' as any, {
          _playbook_key: playbookKey,
          _trigger: 'manual',
          _payload: { executed_by: 'user' }
        });

      if (error) throw error;

      toast({
        title: "작업 실행됨",
        description: `${playbooks.find(p => p.key === playbookKey)?.name} 작업이 시작되었습니다.`,
      });

      // Trigger edge function to actually run the playbook
      const { error: funcError } = await supabase.functions.invoke('ops-runner', {
        body: { exec_id: data }
      });

      if (funcError) {
        errorSys("Failed to invoke ops-runner", funcError);
      }

    } catch (error) {
      errorSys(`Failed to execute playbook: ${playbookKey}`, error);
      
      toast({
        title: "실행 실패",
        description: error instanceof Error ? error.message : "작업 실행에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>즉시 조치</CardTitle>
      </CardHeader>
      <CardContent>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full" disabled={executing !== null}>
              {executing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  실행 중...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  작업 실행
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {playbooks.map((playbook) => (
              <DropdownMenuItem
                key={playbook.key}
                onClick={() => executePlaybook(playbook.key)}
                disabled={executing !== null}
              >
                <span className="mr-2">{playbook.icon}</span>
                {playbook.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-xs text-muted-foreground mt-3">
          시스템 이상 시 수동으로 복구 작업을 실행할 수 있습니다.
          모든 작업은 10분 내 중복 실행이 차단됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
