import { redirect } from 'next/navigation'

export default function MemoriesPage() {
  redirect('/dashboard/my-story?tab=memories')
}
