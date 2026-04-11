'use server';

import { createSupabaseServer } from '@/lib/supabaseServer';
import { sendOrderEmail } from '@/lib/email';

export async function confirmPaymentServerAction(formData: FormData) {
  try {
    const transactionId = formData.get('transactionId') as string;
    const total = Number(formData.get('total'));
    let items: any[] = [];

    try {
      items = JSON.parse(formData.get('items') as string || '[]');
    } catch {
      return { success: false, error: "Invalid cart data" };
    }

    if (!transactionId?.trim() || !items?.length || !total) {
      return { success: false, error: "Invalid data provided" };
    }

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Idempotency
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('transaction_id', transactionId.trim())
      .maybeSingle();

    if (existing) return { success: true };

    // Stock deduction
    for (const item of items) {
      let success = false;

      if (item.color) {
        const { data, error } = await supabase.rpc('decrement_color_stock', {
          p_product_id: item.id,
          p_color: item.color,
          p_qty: item.qty,
        });
        success = data === true;
        if (error) console.error("Color stock error:", error);
      } else {
        const { data, error } = await supabase.rpc('decrement_stock', {
          p_product_id: item.id,
          p_qty: item.qty,
        });
        success = data === true;
        if (error) console.error("Stock error:", error);
      }

      if (!success) {
        return { success: false, error: `Not enough stock for ${item.name}` };
      }
    }

    // Create order
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({
        order_number: `ORD-${Date.now()}`,
        user_id: user.id,
        user_email: user.email,
        total,
        status: 'PENDING_PAYMENT_CONFIRMATION',
        items,
        transaction_id: transactionId.trim(),
      })
      .select()
      .single();

    if (error || !newOrder) {
      console.error("Order insert error:", error);
      return { success: false, error: "Failed to create order" };
    }

    // Clear cart
    await supabase.from('carts').delete().eq('user_id', user.id);

    // ==================== RELIABLE EMAIL SENDING ====================
    try {
      await Promise.allSettled([
        sendOrderEmail(
          "ziwarajewels@gmail.com",
          `New Order #${newOrder.order_number}`,
          `<h2>New Order Received</h2><p>Order ID: ${newOrder.order_number}</p><p>Transaction: ${transactionId}</p><p>Total: ₹${total}</p>`
        ),
        sendOrderEmail(
          user.email!,
          `Order Placed - Ziwara #${newOrder.order_number}`,
          `<h2>Thank you!</h2><p>Your order #${newOrder.order_number} has been placed.</p><p>Status: Waiting for confirmation</p>`
        )
      ]);
      console.log(`✅ Emails triggered for order ${newOrder.order_number}`);
    } catch (emailErr) {
      console.error(`⚠️ Non-critical email failure for order ${newOrder.order_number}:`, emailErr);
    }
    // =================================================================

    return { success: true };

  } catch (err: any) {
    console.error("confirmPaymentServerAction error:", err);
    return { success: false, error: "Server error occurred" };
  }
}

export async function confirmOrderServerAction(orderId: string) {
  try {
    const supabase = await createSupabaseServer();
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return { success: false, error: "Order not found" };

    let recipientEmail = order.user_email;
    if (!recipientEmail && order.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
      recipientEmail = userData?.user?.email || "ziwarajewels@gmail.com";
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'CONFIRMED' })
      .eq('id', orderId);

    if (error) {
      console.error("Status update error:", error);
      return { success: false };
    }

    // ==================== RELIABLE EMAIL SENDING ====================
    try {
      await sendOrderEmail(
        recipientEmail,
        `Your Ziwara Order #${order.order_number} is Confirmed`,
        `<h2>Order Confirmed!</h2><p>Your order has been confirmed.</p><p>It will reach you within 3 days.</p><p>For queries: ziwarajewels@gmail.com</p>`
      );
      console.log(`✅ Confirmation email sent for order ${order.order_number}`);
    } catch (emailErr) {
      console.error(`⚠️ Confirmation email failed for order ${order.order_number}:`, emailErr);
    }
    // =================================================================

    return { success: true };
  } catch (err) {
    console.error("CONFIRM ORDER ERROR:", err);
    return { success: false };
  }
}