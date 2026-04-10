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
    } catch (parseErr) {
      console.error("JSON Parse Error:", parseErr);
      return { success: false, error: "Invalid cart data" };
    }

    console.log("=== confirmPaymentServerAction START ===");
    console.log("Transaction ID:", transactionId);
    console.log("Total:", total);
    console.log("Items Count:", items.length);

    if (!transactionId?.trim() || !items?.length || !total) {
      return { success: false, error: "Invalid data provided" };
    }

    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth Error:", authError);
      return { success: false, error: "User not authenticated. Please login again." };
    }

    console.log("User authenticated:", user.id, user.email);

    // Idempotency check
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('transaction_id', transactionId.trim())
      .maybeSingle();

    if (existingOrder) {
      console.log("Order already exists with this transaction ID");
      return { success: true };
    }

    // ==================== STOCK DEDUCTION ====================
    for (const item of items) {
      let success = false;

      if (item.color) {
        const { data, error } = await supabase.rpc('decrement_color_stock', {
          p_product_id: item.id,
          p_color: item.color,
          p_qty: item.qty,
        });
        if (error) {
          console.error("COLOR STOCK ERROR:", error);
          return { success: false, error: `Stock update failed for ${item.name} (${item.color})` };
        }
        success = data;
      } else {
        const { data, error } = await supabase.rpc('decrement_stock', {
          p_product_id: item.id,
          p_qty: item.qty,
        });
        if (error) {
          console.error("SIMPLE STOCK ERROR:", error);
          return { success: false, error: `Stock update failed for ${item.name}` };
        }
        success = data;
      }

      if (!success) {
        return { success: false, error: `Not enough stock for ${item.name}` };
      }
    }
    // ========================================================

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
      console.error("ORDER INSERT ERROR:", error);
      return { success: false, error: "Failed to create order" };
    }

    console.log("Order created successfully:", newOrder.order_number);

    // Clear cart
    await supabase.from('carts').delete().eq('user_id', user.id);

    // Send emails (non-blocking)
    Promise.all([
      sendOrderEmail(
        "ziwarajewels@gmail.com",
        `New Order #${newOrder.order_number} - Please Confirm`,
        `<h2>New Order Received</h2><p><strong>Order ID:</strong> ${newOrder.order_number}</p><p><strong>Transaction ID:</strong> ${transactionId}</p><p><strong>Total:</strong> ₹${total}</p>`
      ),
      sendOrderEmail(
        user.email!,
        `Order Placed - Ziwara #${newOrder.order_number}`,
        `<h2>Thank you!</h2><p>Your order #${newOrder.order_number} has been placed.</p><p>Status: Waiting for Payment Confirmation (up to 12 hours)</p><p>For queries: ziwarajewels@gmail.com</p>`
      )
    ]).catch(err => console.error("Email failed:", err));

    return { success: true };

  } catch (err: any) {
    console.error("SERVER ACTION CRASH:", err);
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

    sendOrderEmail(
      recipientEmail,
      `Your Ziwara Order #${order.order_number} is Confirmed`,
      `<h2>Order Confirmed!</h2><p>Your order has been confirmed.</p><p>It will reach you within 3 days.</p><p>For queries: ziwarajewels@gmail.com</p>`
    ).catch(err => console.error("Email failed:", err));

    return { success: true };
  } catch (err) {
    console.error("CONFIRM ORDER ERROR:", err);
    return { success: false };
  }
}