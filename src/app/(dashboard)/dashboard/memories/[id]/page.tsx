import { redirect } from 'next/navigation'

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/my-story?openMemory=${id}`)
}
