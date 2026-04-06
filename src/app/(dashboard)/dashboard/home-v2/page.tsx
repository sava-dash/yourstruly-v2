import { redirect } from 'next/navigation'

// Deprecated: home-v2 is now the default dashboard page
export default function HomeV2Page() {
  redirect('/dashboard')
}
