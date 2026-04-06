'use client'

import { useState, useEffect } from 'react'
import { Package, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import '@/styles/page-styles.css'

interface Order {
  id: string
  status: string
  total_cents: number
  created_at: string
  items: Record<string, unknown>[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    // Try photobook_orders first, then orders table
    const { data, error } = await supabase
      .from('photobook_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-[#2D5A3D]/5 transition-colors"
          >
            <ArrowLeft size={20} className="text-[#2D5A3D]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2B20]">Orders</h1>
            <p className="text-sm text-[#94A09A]">Track your purchases</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-[#94A09A]">Loading...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Package size={48} className="text-[#DDE3DF] mb-4" />
            <p className="text-lg font-medium text-[#1A2B20] mb-1">No orders yet</p>
            <p className="text-sm text-[#94A09A] mb-4">Your orders will appear here</p>
            <Link
              href="/dashboard/photobook/create"
              className="px-4 py-2 bg-[#2D5A3D] text-white text-sm font-medium rounded-lg hover:bg-[#1A2B20] transition-colors"
            >
              Create a Photobook
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-[#DDE3DF] shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#1A2B20]">
                    Order #{order.id.slice(0, 8)}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] capitalize">
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-[#94A09A]">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
