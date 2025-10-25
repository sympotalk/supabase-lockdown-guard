import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const events = [
  {
    id: 1,
    name: "2025 글로벌 테크 컨퍼런스",
    date: "2025-03-15 ~ 2025-03-17",
    location: "코엑스 컨벤션 센터",
    participants: 245,
    status: "active" as const,
  },
  {
    id: 2,
    name: "스타트업 네트워킹 데이",
    date: "2025-03-20",
    location: "강남 스타트업 캠퍼스",
    participants: 180,
    status: "pending" as const,
  },
  {
    id: 3,
    name: "AI 혁신 포럼",
    date: "2025-04-05 ~ 2025-04-06",
    location: "서울드래곤시티호텔",
    participants: 320,
    status: "active" as const,
  },
  {
    id: 4,
    name: "디자인 씽킹 워크샵",
    date: "2025-04-12",
    location: "한국디자인진흥원",
    participants: 95,
    status: "completed" as const,
  },
];

export default function Events() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">행사 관리</h1>
            <p className="mt-2 text-muted-foreground">
              모든 행사를 관리하고 새로운 행사를 등록하세요
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            새 행사 등록
          </Button>
        </div>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="행사명으로 검색..."
                  className="pl-10 h-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                필터
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">No</TableHead>
                    <TableHead className="font-semibold">행사명</TableHead>
                    <TableHead className="font-semibold">일자</TableHead>
                    <TableHead className="font-semibold">장소</TableHead>
                    <TableHead className="font-semibold">참가자</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{event.id}</TableCell>
                      <TableCell className="font-semibold">{event.name}</TableCell>
                      <TableCell>{event.date}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell>{event.participants}명</TableCell>
                      <TableCell>
                        <StatusBadge status={event.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            <DropdownMenuItem>상세 보기</DropdownMenuItem>
                            <DropdownMenuItem>수정</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
