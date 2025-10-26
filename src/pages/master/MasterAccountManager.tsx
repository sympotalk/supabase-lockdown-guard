import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/accounts/RoleBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Shield, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useUser } from "@/context/UserContext";
import { NewAccountModal } from "@/components/accounts/NewAccountModal";

interface UserProfile {
  id: string;
  email: string;
  role: string;
  agency_name?: string;
  agency_id?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active: boolean;
}

const roleOptions = [
  { value: "master", label: "마스터" },
  { value: "agency_owner", label: "에이전시 오너" },
  { value: "staff", label: "스태프" },
];

export default function MasterAccountManager() {
  const { role } = useUser();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [agencies, setAgencies] = useState<Array<{ id: string; name: string }>>([]);
  
  const canCreate = role === 'master';

  useEffect(() => {
    loadProfiles();
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("agencies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setAgencies(data || []);
    } catch (error: any) {
      console.error("[MasterAccount] Failed to load agencies:", error);
    }
  };

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const profiles: UserProfile[] = (data || []).map((item: any) => ({
        id: item.id,
        email: item.email,
        role: item.role || "staff",
        agency_name: item.agency_name,
        agency_id: item.agency_id,
        created_at: item.created_at,
        last_sign_in_at: item.last_sign_in_at,
        is_active: item.is_active !== false,
      }));
      
      setProfiles(profiles);
    } catch (error: any) {
      console.error("[MasterAccount] Failed to load profiles:", error);
      toast({
        title: "로딩 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (user: UserProfile) => {
    setSelectedUser(user);
    setEditRole(user.role || "staff");
    setEditDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await (supabase as any).rpc("fn_manage_user_account", {
        p_user_id: selectedUser.id,
        p_role: editRole,
        p_action: "update_role",
      });

      if (error) throw error;

      toast({
        title: "권한 변경 완료",
        description: `${selectedUser.email}의 권한이 변경되었습니다.`,
      });

      setEditDialogOpen(false);
      loadProfiles();
    } catch (error: any) {
      console.error("[MasterAccount] Failed to update role:", error);
      toast({
        title: "권한 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const { data, error } = await (supabase as any).rpc("fn_manage_user_account", {
        p_user_id: selectedUser.id,
        p_action: "delete",
      });

      if (error) throw error;

      toast({
        title: "계정 삭제 완료",
        description: `${selectedUser.email}의 계정이 삭제되었습니다.`,
      });

      setDeleteDialogOpen(false);
      loadProfiles();
    } catch (error: any) {
      console.error("[MasterAccount] Failed to delete user:", error);
      toast({
        title: "계정 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold">Master Account Manager</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            전체 계정 및 권한 관리
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              새 계정 생성
            </Button>
          )}
          <Button onClick={loadProfiles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Account List */}
      <Card className="shadow-md rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">전체 계정</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              계정이 없습니다.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이메일</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>에이전시</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>최근 로그인</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="text-[13px] font-medium">
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={profile.role} />
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {profile.agency_name || "-"}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {format(new Date(profile.created_at), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">
                        {profile.last_sign_in_at 
                          ? format(new Date(profile.last_sign_in_at), "yyyy-MM-dd HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRole(profile)}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            권한
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(profile)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Modal */}
      <NewAccountModal
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        agencies={agencies}
        onSuccess={loadProfiles}
      />

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>권한 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}의 권한을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">새 권한</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="권한 선택" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRole}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>계정 삭제 확인</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}의 계정을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
