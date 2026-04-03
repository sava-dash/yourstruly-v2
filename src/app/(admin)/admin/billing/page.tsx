'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/admin/Tabs';
import PlansTable from '@/components/admin/billing/PlansTable';
import SubscribersTable from '@/components/admin/billing/SubscribersTable';
import CouponsTable from '@/components/admin/billing/CouponsTable';
import StripeWebhookStatus from '@/components/admin/billing/StripeWebhookStatus';
import PlanForm from '@/components/admin/billing/PlanForm';
import CouponForm from '@/components/admin/billing/CouponForm';
import { Plus, CreditCard, Users, Tag, Webhook } from 'lucide-react';

export default function BillingPage() {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<null | any>(null);
  const [editingCoupon, setEditingCoupon] = useState<null | any>(null);

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setIsPlanModalOpen(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const handleClosePlanModal = () => {
    setEditingPlan(null);
    setIsPlanModalOpen(false);
  };

  const handleCloseCouponModal = () => {
    setEditingCoupon(null);
    setIsCouponModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2a1f1a]">Billing & Subscriptions</h1>
          <p className="text-[#2a1f1a]/60 mt-1">
            Manage pricing plans, subscriptions, and promotional codes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="glass p-1">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pricing Plans
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Stripe Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2a1f1a]">Pricing Plans</h2>
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>
          <PlansTable onEdit={handleEditPlan} />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2a1f1a]">Subscriber List</h2>
          </div>
          <SubscribersTable />
        </TabsContent>

        <TabsContent value="coupons" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2a1f1a]">Promo Codes</h2>
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Coupon
            </button>
          </div>
          <CouponsTable onEdit={handleEditCoupon} />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2a1f1a]">Stripe Webhook Status</h2>
          </div>
          <StripeWebhookStatus />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isPlanModalOpen && (
        <PlanForm
          plan={editingPlan}
          onClose={handleClosePlanModal}
        />
      )}

      {isCouponModalOpen && (
        <CouponForm
          coupon={editingCoupon}
          onClose={handleCloseCouponModal}
        />
      )}
    </div>
  );
}
