import { Plus, Search, Building2, Bed } from "lucide-react";
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
import { ModuleInsightBar } from "@/components/common/ModuleInsightBar";

const hotels = [
  {
    id: 1,
    name: "서울 그랜드 호텔",
    rooms: 120,
    assigned: 95,
    available: 25,
  },
  {
    id: 2,
    name: "롯데호텔",
    rooms: 80,
    assigned: 80,
    available: 0,
  },
  {
    id: 3,
    name: "JW 메리어트",
    rooms: 100,
    assigned: 72,
    available: 28,
  },
];

const roomAssignments = [
  {
    id: 1,
    participant: "김철수",
    hotel: "서울 그랜드 호텔",
    roomNumber: "1205",
    roomType: "디럭스 더블",
    checkIn: "2025-03-15",
    checkOut: "2025-03-16",
    status: "확정",
  },
  {
    id: 2,
    participant: "이영희",
    hotel: "롯데호텔",
    roomNumber: "2301",
    roomType: "스위트",
    checkIn: "2025-03-15",
    checkOut: "2025-03-17",
    status: "확정",
  },
  {
    id: 3,
    participant: "박지민",
    hotel: "JW 메리어트",
    roomNumber: "1804",
    roomType: "스탠다드",
    checkIn: "2025-03-15",
    checkOut: "2025-03-16",
    status: "미확정",
  },
];

export default function Rooming() {
  return (
    <div className="space-y-6">
        <ModuleInsightBar module="rooming" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">숙박 및 룸핑 관리</h1>
            <p className="mt-2 text-muted-foreground">
              호텔 객실 배정과 숙박 정보를 관리하세요
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="gap-2">
              <Building2 className="h-5 w-5" />
              호텔 자동등록
            </Button>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              객실 배정
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {hotels.map((hotel) => (
            <Card key={hotel.id} className="transition-shadow hover:shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  {hotel.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[15px] text-muted-foreground">전체 객실</span>
                    <span className="text-base font-semibold">{hotel.rooms}실</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[15px] text-muted-foreground">배정 완료</span>
                    <span className="text-base font-semibold text-primary">{hotel.assigned}실</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[15px] text-muted-foreground">잔여 객실</span>
                    <span className="text-base font-semibold text-success">{hotel.available}실</span>
                  </div>
                  <div className="pt-3">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(hotel.assigned / hotel.rooms) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bed className="h-5 w-5 text-primary" />
              객실 배정표
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="참가자 또는 호텔명으로 검색..." className="pl-10 h-10" />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">No</TableHead>
                    <TableHead className="font-semibold">참가자</TableHead>
                    <TableHead className="font-semibold">호텔명</TableHead>
                    <TableHead className="font-semibold">객실번호</TableHead>
                    <TableHead className="font-semibold">객실타입</TableHead>
                    <TableHead className="font-semibold">체크인</TableHead>
                    <TableHead className="font-semibold">체크아웃</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomAssignments.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{assignment.id}</TableCell>
                      <TableCell className="font-semibold">{assignment.participant}</TableCell>
                      <TableCell>{assignment.hotel}</TableCell>
                      <TableCell>{assignment.roomNumber}</TableCell>
                      <TableCell>{assignment.roomType}</TableCell>
                      <TableCell>{assignment.checkIn}</TableCell>
                      <TableCell>{assignment.checkOut}</TableCell>
                      <TableCell>
                        <Badge
                          variant={assignment.status === "확정" ? "default" : "secondary"}
                          className={
                            assignment.status === "확정"
                              ? "rounded-xl bg-success/10 text-success border-0"
                              : "rounded-xl bg-muted text-muted-foreground border-0"
                          }
                        >
                          {assignment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
