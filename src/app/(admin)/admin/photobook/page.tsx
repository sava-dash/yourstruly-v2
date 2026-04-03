import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  BookOpen, 
  Layout, 
  Palette, 
  DollarSign, 
  Printer,
  ArrowRight,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default async function PhotobookAdminPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  
  // Fetch stats
  const [productsResult, templatesResult, coversResult, pricingResult] = await Promise.all([
    supabase.from('photobook_products').select('*', { count: 'exact' }),
    supabase.from('photobook_templates').select('*', { count: 'exact' }),
    supabase.from('photobook_cover_designs').select('*', { count: 'exact' }),
    supabase.from('photobook_pricing').select('*', { count: 'exact' }),
  ]);

  const products = productsResult.data || [];
  const templates = templatesResult.data || [];
  const covers = coversResult.data || [];
  const enabledProducts = products.filter(p => p.is_enabled).length;
  const enabledTemplates = templates.filter(t => t.is_enabled).length;

  const sections = [
    {
      title: 'Products',
      description: 'Manage photobook sizes, bindings, and pricing',
      href: '/admin/photobook/products',
      icon: Package,
      stats: [
        { label: 'Total', value: products.length },
        { label: 'Enabled', value: enabledProducts },
      ],
      color: 'from-[#2D5A3D] to-[#4A7A66]',
    },
    {
      title: 'Layout Templates',
      description: 'Page layout templates for the editor',
      href: '/admin/photobook/templates',
      icon: Layout,
      stats: [
        { label: 'Total', value: templates.length },
        { label: 'Enabled', value: enabledTemplates },
      ],
      color: 'from-[#B8562E] to-[#D37F53]',
    },
    {
      title: 'Cover Designs',
      description: 'Front and back cover templates',
      href: '/admin/photobook/covers',
      icon: Palette,
      stats: [
        { label: 'Front', value: covers.filter(c => c.cover_type === 'front').length },
        { label: 'Back', value: covers.filter(c => c.cover_type === 'back').length },
      ],
      color: 'from-[#4A3552] to-[#5A4562]',
    },
    {
      title: 'Pricing',
      description: 'Markup, shipping rates, and discounts',
      href: '/admin/photobook/pricing',
      icon: DollarSign,
      stats: [
        { label: 'Rules', value: pricingResult.count || 0 },
        { label: 'Active', value: (pricingResult.data || []).filter(p => p.is_enabled).length },
      ],
      color: 'from-[#8DACAB] to-[#9DBCBD]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">Photobook Management</h1>
          <p className="text-[#2a1f1a]/60 mt-1">
            Configure products, templates, and pricing for photobook creation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-[#2D5A3D]" />
          <span className="text-sm text-[#2a1f1a]/60">Provider: Prodigi</span>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group glass p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${section.color} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-[#2a1f1a]/30 group-hover:text-[#2D5A3D] group-hover:translate-x-1 transition-all" />
              </div>
              
              <h3 className="text-lg font-semibold text-[#2a1f1a] mb-1">
                {section.title}
              </h3>
              <p className="text-sm text-[#2a1f1a]/60 mb-4">
                {section.description}
              </p>
              
              <div className="flex gap-4">
                {section.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-[#2a1f1a]">{stat.value}</p>
                    <p className="text-xs text-[#2a1f1a]/50">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Overview */}
      <div className="glass p-6">
        <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">Active Products</h2>
        <div className="space-y-3">
          {products.filter(p => p.is_enabled).slice(0, 5).map((product) => (
            <div 
              key={product.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#2D5A3D]" />
                <div>
                  <p className="font-medium text-[#2a1f1a]">{product.name}</p>
                  <p className="text-xs text-[#2a1f1a]/50">{product.size} • {product.binding}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#2a1f1a]">${product.base_price}</p>
                <p className="text-xs text-[#2a1f1a]/50">+${product.price_per_page}/page</p>
              </div>
            </div>
          ))}
          
          {products.length === 0 && (
            <div className="text-center py-8 text-[#2a1f1a]/40">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No products configured yet</p>
              <p className="text-sm">Run the migration to seed default data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
