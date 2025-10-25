import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Building2, Users, Link2, Copy, Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Mock Data
const mockAccount = {
  id: "master_001",
  role: "master",
  name: "SympoHub 본사",
  email: "admin@sympohub.com",
  createdAt: "2024-01-15",
};

const mockAgencies = [
  {
    id: "agency_001",
    name: "이벤트마스터 코리아",
    email: "contact@eventmaster.kr",
    userCount: 12,
    status: "active" as const,
    createdAt: "2024-02-01",
  },
  {
    id: "agency_002",
    name: "글로벌 컨퍼런스 솔루션",
    email: "info@globalconf.com",
    userCount: 8,
    status: "active" as const,
    createdAt: "2024-03-10",
  },
  {
    id: "agency_003",
    name: "스마트 이벤트 플래너",
    email: "hello@smartevent.co.kr",
    userCount: 5,
    status: "pending" as const,
    createdAt: "2024-04-05",
  },
];

const mockInvites = [
  {
    id: "inv_001",
    code: "AG-2025-XK7M",
    agencyName: "테스트 에이전시",
    expiresAt: "2025-12-31",
    status: "active" as const,
  },
  {
    id: "inv_002",
    code: "AG-2025-P9QR",
    agencyName: "신규 파트너사",
    expiresAt: "2025-12-31",
    status: "used" as const,
  },
];

export default function Account() {
  const { user, role } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");

  const handleGenerateInvite = () => {
    if (!newAgencyName.trim()) {
      toast.error("에이전시 이름을 입력해주세요");
      return;
    }

    const inviteCode = `AG-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inviteUrl = `${window.location.origin}/signup/${inviteCode}`;

    navigator.clipboard.writeText(inviteUrl);
    toast.success("초대 링크가 클립보드에 복사되었습니다", {
      description: inviteUrl,
    });

    setNewAgencyName("");
    setIsCreateDialogOpen(false);
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/signup/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("초대 링크가 복사되었습니다");
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">계정 관리</h1>
            <p className="mt-2 text-muted-foreground">
              마스터 계정 및 하위 에이전시를 관리합니다
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                에이전시 초대
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>에이전시 초대 링크 생성</DialogTitle>
                <DialogDescription>
                  새로운 에이전시를 초대하기 위한 링크를 생성합니다
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="agencyName">에이전시 이름</Label>
                  <Input
                    id="agencyName"
                    placeholder="예: 이벤트마스터 코리아"
                    value={newAgencyName}
                    onChange={(e) => setNewAgencyName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleGenerateInvite}>
                  <Link2 className="mr-2 h-4 w-4" />
                  링크 생성
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                마스터 계정 정보
              </CardTitle>
              <CardDescription>현재 로그인한 계정의 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>계정 유형</Label>
                <div>
                  <Badge variant="default" className="text-sm">
                    Master Account
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>조직명</Label>
                <p className="text-sm">SympoHub</p>
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <p className="text-sm text-muted-foreground">{user?.email || "admin@sympohub.com"}</p>
              </div>
              <div className="space-y-2">
                <Label>사용자 ID</Label>
                <p className="text-xs text-muted-foreground font-mono">{user?.id || "-"}</p>
              </div>
              <div className="space-y-2">
                <Label>가입일</Label>
                <p className="text-sm text-muted-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR") : "2024-01-15"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                통계
              </CardTitle>
              <CardDescription>하위 에이전시 현황</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">전체 에이전시</p>
                  <p className="text-2xl font-bold">{mockAgencies.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary/20" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">활성 사용자</p>
                  <p className="text-2xl font-bold">
                    {mockAgencies.reduce((sum, a) => sum + a.userCount, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>하위 에이전시 목록</CardTitle>
            <CardDescription>
              마스터 계정에 연결된 에이전시 목록입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">에이전시명</TableHead>
                    <TableHead className="font-semibold">이메일</TableHead>
                    <TableHead className="font-semibold">사용자</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold">가입일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAgencies.map((agency) => (
                    <TableRow key={agency.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agency.email}
                      </TableCell>
                      <TableCell>{agency.userCount}명</TableCell>
                      <TableCell>
                        {agency.status === "active" ? (
                          <Badge variant="default">활성</Badge>
                        ) : (
                          <Badge variant="secondary">대기</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {agency.createdAt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>초대 링크 관리</CardTitle>
            <CardDescription>
              생성된 초대 링크를 확인하고 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="font-semibold">초대 코드</TableHead>
                    <TableHead className="font-semibold">에이전시명</TableHead>
                    <TableHead className="font-semibold">만료일</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockInvites.map((invite) => (
                    <TableRow key={invite.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm font-medium">
                        {invite.code}
                      </TableCell>
                      <TableCell>{invite.agencyName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.expiresAt}
                      </TableCell>
                      <TableCell>
                        {invite.status === "active" ? (
                          <Badge variant="default">활성</Badge>
                        ) : (
                          <Badge variant="secondary">사용됨</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code)}
                          disabled={invite.status === "used"}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
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
