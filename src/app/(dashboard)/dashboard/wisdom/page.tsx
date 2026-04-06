import { redirect } from 'next/navigation'

export default function WisdomPage() {
  redirect('/dashboard/my-story?tab=wisdom')
}
