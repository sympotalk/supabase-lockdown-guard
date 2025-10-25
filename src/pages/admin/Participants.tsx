import { Plus, Search, Filter, Phone, MessageSquare, User } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const participants = [
  {
    id: 1,
    type: "일반",
    name: "김철수",
    company: "테크기업 A",
    phone: "010-1234-5678",
    roomType: "디럭스 더블",
    roomCredit: "1박",
    meal: "조식, 중식",
    requests: ["금연", "높은 층"],
  },
  {
    id: 2,
    type: "VIP",
    name: "이영희",
    company: "스타트업 B",
    phone: "010-2345-6789",
    roomType: "스위트",
    roomCredit: "2박",
    meal: "조식, 중식, 석식",
    requests: ["바다 전망"],
  },
  {
    id: 3,
    type: "일반",
    name: "박지민",
    company: "기업 C",
    phone: "010-3456-7890",
    roomType: "스탠다드",
    roomCredit: "1박",
    meal: "조식",
    requests: [],
  },
];

export default function Participants() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">참가자 관리</h1>
            <p className="mt-2 text-muted-foreground">
              행사 참가자 정보를 관리하고 숙박 정보를 확인하세요
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            참가자 추가
          </Button>
        </div>

        <div className="flex gap-6">
          <div className="flex-[65]">
            <Card className="transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="이름 또는 소속으로 검색..." className="pl-10 h-10" />
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    필터
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted hover:bg-muted">
                          <TableHead className="font-semibold">No</TableHead>
                          <TableHead className="font-semibold">구분</TableHead>
                          <TableHead className="font-semibold">성명</TableHead>
                          <TableHead className="font-semibold">소속</TableHead>
                          <TableHead className="font-semibold">연락처</TableHead>
                          <TableHead className="font-semibold">객실타입</TableHead>
                          <TableHead className="font-semibold">룸크레딧</TableHead>
                          <TableHead className="font-semibold">식사</TableHead>
                          <TableHead className="font-semibold">요청사항</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((participant) => (
                          <TableRow key={participant.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">{participant.id}</TableCell>
                            <TableCell>
                              <Badge
                                variant={participant.type === "VIP" ? "default" : "secondary"}
                                className={
                                  participant.type === "VIP"
                                    ? "rounded-xl bg-warning/10 text-warning border-0"
                                    : "rounded-xl border-0"
                                }
                              >
                                {participant.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{participant.name}</TableCell>
                            <TableCell>{participant.company}</TableCell>
                            <TableCell>{participant.phone}</TableCell>
                            <TableCell>{participant.roomType}</TableCell>
                            <TableCell>{participant.roomCredit}</TableCell>
                            <TableCell>{participant.meal}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {participant.requests.map((req, idx) => (
                                  <Badge key={idx} variant="outline" className="rounded-xl text-xs">
                                    {req}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-[35] space-y-6">
            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  담당자 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">성명</p>
                  <p className="mt-1 font-semibold">김철수</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">소속</p>
                  <p className="mt-1 font-semibold">테크기업 A</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">연락처</p>
                  <p className="mt-1 font-semibold">010-1234-5678</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Phone className="h-4 w-4" />
                    통화
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <MessageSquare className="h-4 w-4" />
                    문자
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">숙박 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start hover:bg-muted">
                  미숙박
                </Button>
                <Button variant="outline" className="w-full justify-start bg-primary/10 text-primary hover:bg-primary/20">
                  1일차 숙박
                </Button>
                <Button variant="outline" className="w-full justify-start hover:bg-muted">
                  2일차 숙박
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
