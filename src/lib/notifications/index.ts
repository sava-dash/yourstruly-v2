/**
 * Notifications service — lightweight in-app notification CRUD for the
 * `notifications` table introduced in 20260414_notifications_table.sql.
 *
 * Used by the Memory of the Day cron + dashboard banner (F2). Push delivery
 * is intentionally not implemented yet — see the report notes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType =
  | 'memory-of-the-day'
  | 'weekly-story'
  | 'time-capsule'
  | string;

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
}

export async function createNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: CreateNotificationInput,
): Promise<{ id: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('notifications') as any)
    .insert({
      user_id: input.userId,
      type: input.type,
      payload: input.payload ?? {},
    })
    .select('id')
    .single();
  if (error) {
    console.error('[notifications] insert failed', error);
    return null;
  }
  return data as { id: string };
}

export async function hasNotificationForToday(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', startOfDay.toISOString())
    .limit(1);
  if (error) {
    console.error('[notifications] check failed', error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

export async function getTodaysNotifications(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<NotificationRow[]> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[notifications] list failed', error);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notifications') as any)
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error) {
    console.error('[notifications] mark read failed', error);
    return false;
  }
  return true;
}
