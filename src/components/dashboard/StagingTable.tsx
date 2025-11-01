// [Phase 78-B.8] Staging validation results table component
import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface StagedParticipant {
  id: string;
  name: string;
  organization: string;
  phone: string;
  request_memo: string;
  validation_status: 'pending' | 'valid' | 'error' | 'warning';
  validation_message: string | null;
}

interface StagingTableProps {
  data: StagedParticipant[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function StagingTable({ data, selectedIds, onSelectionChange }: StagingTableProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'error' | 'warning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 400);
  
  // Filter and search data
  const filteredData = useMemo(() => {
    return data
      .filter(row => {
        if (statusFilter === 'all') return true;
        return row.validation_status === statusFilter;
      })
      .filter(row => {
        if (!debouncedSearch) return true;
        const query = debouncedSearch.toLowerCase();
        return (
          row.name?.toLowerCase().includes(query) ||
          row.phone?.toLowerCase().includes(query)
        );
      });
  }, [data, statusFilter, debouncedSearch]);
  
  // Toggle single row selection
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };
  
  // Toggle all error and warning rows
  const toggleAllIssues = () => {
    const issueIds = data
      .filter(row => row.validation_status === 'error' || row.validation_status === 'warning')
      .map(row => row.id);
    
    if (issueIds.every(id => selectedIds.includes(id))) {
      // Deselect all issues
      onSelectionChange(selectedIds.filter(id => !issueIds.includes(id)));
    } else {
      // Select all issues
      const newSelection = [...new Set([...selectedIds, ...issueIds])];
      onSelectionChange(newSelection);
    }
  };
  
  // Format validation message for error rows
  const formatValidationMessage = (status: string, message: string | null) => {
    if (!message) return '-';
    
    if (status === 'error') {
      return `⚠️ ${message}\n이 행은 반영되지 않습니다.`;
    }
    
    return message;
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3" />
            유효
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            오류
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="gap-1 bg-orange-100 text-orange-700 border-orange-300">
            <AlertTriangle className="h-3 w-3" />
            경고
          </Badge>
        );
      default:
        return <Badge variant="outline">대기</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="valid">유효</SelectItem>
              <SelectItem value="error">오류</SelectItem>
              <SelectItem value="warning">경고</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="이름/연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[240px]"
          />
        </div>
        
        {(data.some(row => row.validation_status === 'error') || data.some(row => row.validation_status === 'warning')) && (
          <button
            onClick={toggleAllIssues}
            className="text-sm text-destructive hover:underline"
          >
            {data
              .filter(row => row.validation_status === 'error' || row.validation_status === 'warning')
              .every(row => selectedIds.includes(row.id))
              ? '문제 행 선택 해제'
              : '모든 문제 행 선택'}
          </button>
        )}
      </div>
      
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[50px]">No.</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>연락처</TableHead>
                <TableHead className="max-w-[200px]">요청사항</TableHead>
                <TableHead className="w-[100px]">상태</TableHead>
                <TableHead className="max-w-[300px]">사유</TableHead>
                <TableHead className="w-[60px]">선택</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {debouncedSearch ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row, idx) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.organization}</TableCell>
                    <TableCell className="text-muted-foreground">{row.phone || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {row.request_memo || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.validation_status)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      {row.validation_message ? (
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-muted-foreground truncate block cursor-help">
                                {row.validation_message}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[400px] whitespace-pre-line">
                              <p className="text-sm">{formatValidationMessage(row.validation_status, row.validation_message)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(row.validation_status === 'error' || row.validation_status === 'warning') && (
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onCheckedChange={() => toggleSelection(row.id)}
                          aria-label={`선택: ${row.name}`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {filteredData.length > 0 && (
        <p className="text-sm text-muted-foreground text-right">
          총 {filteredData.length}건 표시 중
        </p>
      )}
    </div>
  );
}
