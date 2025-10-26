import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Agency {
  id: string;
  name: string;
}

// [LOCKED][71-E.FIXSELECT.STABLE] Do not remove or inline this block without architect/QA approval.
export function DashboardHeader() {
  const { role, agencyScope, setAgencyScope } = useUser();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [currentAgencyName, setCurrentAgencyName] = useState<string>("");

  // [71-E.FIXSELECT] Debug log
  useEffect(() => {
    console.log('[71-E.FIXSELECT] DashboardHeader Select initialized', { value: agencyScope });
  }, [agencyScope]);

  useEffect(() => {
    const fetchAgencies = async () => {
      if (role === "master") {
        const { data } = await supabase
          .from("agency_summary")
          .select("id, name")
          .order("name");
        
        setAgencies(data || []);
      }
    };

    const fetchCurrentAgencyName = async () => {
      if (agencyScope) {
        const { data } = await supabase
          .from("agency_summary")
          .select("name")
          .eq("id", agencyScope)
          .single();
        
        if (data) {
          setCurrentAgencyName(data.name);
        }
      }
    };

    fetchAgencies();
    fetchCurrentAgencyName();
  }, [role, agencyScope]);

  const handleAgencyChange = (newAgencyId: string) => {
    const selectedAgency = agencies.find(a => a.id === newAgencyId);
    if (selectedAgency) {
      console.log(`[UserContext] Agency switched to: ${selectedAgency.name}`);
      setAgencyScope(newAgencyId);
      window.location.href = `/admin/dashboard?asAgency=${newAgencyId}`;
    }
  };

  const isMaster = role === "master";

  return (
    <div className="flex items-center justify-between mb-6 p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">
            {isMaster ? "마스터 관리 모드" : "에이전시 대시보드"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isMaster && agencyScope
              ? `현재 ${currentAgencyName} 컨텍스트에서 보고 있습니다.`
              : isMaster
              ? "전체 에이전시 현황을 관리합니다."
              : "내 행사 현황입니다."}
          </p>
        </div>
      </div>

      {isMaster && (
        <div className="flex items-center gap-3">
          {agencyScope && (
            <Badge variant="outline" className="gap-2">
              <Building2 className="h-3 w-3" />
              {currentAgencyName}
            </Badge>
          )}
          <Select 
            value={agencyScope || undefined} 
            onValueChange={(v) => handleAgencyChange(v || "")}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="에이전시 선택" />
            </SelectTrigger>
            <SelectContent>
            {agencies
              .filter((agency) => 
                typeof agency.id === "string" && 
                agency.id.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
              )
              .map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isMaster && currentAgencyName && (
        <Badge variant="secondary" className="gap-2">
          <Building2 className="h-3 w-3" />
          {currentAgencyName}
        </Badge>
      )}
    </div>
  );
}
