import { prisma } from "@/lib/prisma";
import { StorageProviderForm } from "../StorageProviderForm";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditStorageProviderPage({ params }: PageProps) {
  const { id } = await params;

  const provider = await prisma.storageProvider.findUnique({
    where: { id },
  });

  if (!provider) {
    notFound();
  }

  return (
    <StorageProviderForm
      initialData={{
        id: provider.id,
        providerCode: provider.providerCode,
        providerName: provider.providerName,
        config: provider.config as Record<string, unknown>,
        isDefault: provider.isDefault,
        isActive: provider.isActive,
      }}
    />
  );
}
