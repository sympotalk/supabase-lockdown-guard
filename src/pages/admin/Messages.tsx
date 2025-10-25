import { Plus, Send, FileText, Clock } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const messageTemplates = [
  {
    id: 1,
    name: "행사 안내",
    content: "안녕하세요. [행사명] 행사 안내 드립니다...",
    lastUsed: "2025-03-10",
  },
  {
    id: 2,
    name: "숙박 확정",
    content: "[참가자명]님의 숙박이 확정되었습니다...",
    lastUsed: "2025-03-12",
  },
  {
    id: 3,
    name: "일정 변경 공지",
    content: "행사 일정 변경 안내드립니다...",
    lastUsed: "2025-03-08",
  },
];

const messageLogs = [
  {
    id: 1,
    recipient: "김철수",
    phone: "010-1234-5678",
    content: "행사 안내 메시지",
    status: "발송 완료",
    timestamp: "2025-03-13 14:30",
  },
  {
    id: 2,
    recipient: "이영희",
    phone: "010-2345-6789",
    content: "숙박 확정 안내",
    status: "발송 완료",
    timestamp: "2025-03-13 14:35",
  },
  {
    id: 3,
    recipient: "박지민",
    phone: "010-3456-7890",
    content: "일정 변경 공지",
    status: "실패",
    timestamp: "2025-03-13 14:40",
  },
];

export default function Messages() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">문자·알림 발송</h1>
          <p className="mt-2 text-muted-foreground">
            참가자에게 문자 메시지와 알림을 발송하세요
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                메시지 작성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipients">수신자</Label>
                <Input id="recipients" placeholder="참가자 선택 또는 번호 입력" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">제목</Label>
                <Input id="subject" placeholder="메시지 제목" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">메시지 내용</Label>
                <Textarea
                  id="message"
                  placeholder="메시지 내용을 입력하세요..."
                  className="min-h-[200px]"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>0 / 2000자</span>
                  <span>예상 발송 건수: 0건</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  발송하기
                </Button>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  임시저장
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                템플릿 목록
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messageTemplates.map((template) => (
                <div
                  key={template.id}
                  className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <p className="font-semibold">{template.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {template.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    최근 사용: {template.lastUsed}
                  </p>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                템플릿 추가
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              발송 로그
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>수신자</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.id}</TableCell>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell>{log.phone}</TableCell>
                    <TableCell>{log.content}</TableCell>
                    <TableCell>
                      <Badge
                        variant={log.status === "발송 완료" ? "default" : "destructive"}
                        className={
                          log.status === "발송 완료"
                            ? "bg-success/10 text-success"
                            : ""
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
