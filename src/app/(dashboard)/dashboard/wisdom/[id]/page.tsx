import { redirect } from 'next/navigation'

export default async function WisdomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/my-story?openWisdom=${id}`)
}
