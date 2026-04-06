import { redirect } from 'next/navigation'

// Consolidated: subscription management lives at /dashboard/settings/subscription
export default function SubscriptionPage() {
  redirect('/dashboard/settings/subscription')
}
