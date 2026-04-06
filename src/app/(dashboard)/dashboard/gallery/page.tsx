import { redirect } from 'next/navigation'

export default function GalleryPage() {
  redirect('/dashboard/my-story?tab=photos')
}
