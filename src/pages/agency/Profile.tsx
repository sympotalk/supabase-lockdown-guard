import { useState } from "react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ProfileCard } from "@/components/agency/ProfileCard";
import { EditProfileModal } from "@/components/agency/EditProfileModal";

// Mock Data
const initialMockAgency = {
  name: "절호의기획",
  owner: "홍길동",
  email: "master@zeolho.com",
  phone: "010-1234-5678",
  address: "서울특별시 강남구 테헤란로 123",
  created_at: "2024-11-15",
};

export default function Profile() {
  const [mockAgency, setMockAgency] = useState(initialMockAgency);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleSaveProfile = (data: any) => {
    setMockAgency({
      ...mockAgency,
      ...data,
    });
  };

  return (
    <AccountLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">에이전시 프로필</h1>
          <p className="mt-2 text-muted-foreground">
            에이전시의 기본 정보를 관리합니다
          </p>
        </div>

        <ProfileCard
          agency={mockAgency}
          onEdit={() => setIsEditModalOpen(true)}
        />

        <EditProfileModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          agency={mockAgency}
          onSave={handleSaveProfile}
        />
      </div>
    </AccountLayout>
  );
}
