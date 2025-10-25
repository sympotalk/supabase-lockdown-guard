import { Plus, FileText, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const forms = [
  {
    id: 1,
    name: "참가 신청서",
    type: "설문",
    responses: 245,
    status: "진행중",
    createdAt: "2025-03-01",
  },
  {
    id: 2,
    name: "행사 초청장",
    type: "초청장",
    responses: 180,
    status: "발송 완료",
    createdAt: "2025-03-05",
  },
  {
    id: 3,
    name: "만족도 조사",
    type: "설문",
    responses: 95,
    status: "완료",
    createdAt: "2025-03-10",
  },
];

export default function Forms() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">설문·초청장 관리</h1>
            <p className="mt-2 text-muted-foreground">
              설문을 생성하고 초청장을 발송하세요
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="gap-2" disabled>
              <Sparkles className="h-5 w-5" />
              AI 폼 생성 (준비중)
            </Button>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              새 폼 만들기
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                폼 목록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>폼 이름</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>응답 수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.id}</TableCell>
                      <TableCell className="font-semibold">{form.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{form.type}</Badge>
                      </TableCell>
                      <TableCell>{form.responses}건</TableCell>
                      <TableCell>
                        <Badge
                          variant={form.status === "진행중" ? "default" : "secondary"}
                          className={
                            form.status === "진행중"
                              ? "bg-primary/10 text-primary"
                              : form.status === "발송 완료"
                              ? "bg-success/10 text-success"
                              : ""
                          }
                        >
                          {form.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{form.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                폼 빌더
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formTitle">폼 제목</Label>
                <Input id="formTitle" placeholder="폼 제목 입력" />
              </div>

              <div className="space-y-2">
                <Label>문항 추가</Label>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    텍스트 입력
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    드롭다운
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    라디오 버튼
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    체크박스
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">미리보기</p>
                <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  문항을 추가하면
                  <br />
                  여기에 미리보기가 표시됩니다
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
