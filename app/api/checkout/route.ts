import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sendAdminOrderNotification } from '@/lib/email';

// POST /api/checkout - Process checkout and create order
export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    const body = await request.json();

    const {
      items,
      customer_name,
      customer_phone,
      customer_email,
      shipping_address,
      city,
      delivery_zone,
      notes,
    } = body;

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (!customer_name || !customer_phone || !shipping_address || !city) {
      return NextResponse.json(
        { error: 'Missing required customer information' },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.unit_price * item.quantity;
    }

    const shipping_fee = subtotal >= 5000 ? 0 : 150; // Free shipping over NPR 5000
    const discount_amount = 0; // Apply discounts here
    const total = subtotal + shipping_fee - discount_amount;

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null,
        status: 'pending',
        payment_status: 'unpaid',
        subtotal,
        shipping_fee,
        discount_amount,
        total,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        shipping_address,
        city,
        delivery_zone: delivery_zone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: orderError.message },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = items.map((item: { product_id: string; product_name: string; quantity: number; unit_price: number; size?: string; color?: string }) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      size: item.size || null,
      color: item.color || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback order if items fail
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Create delivery record
    await supabase.from('deliveries').insert({
      order_id: order.id,
      status: 'pending',
    });

    // Notify admin (non-blocking)
    sendAdminOrderNotification({
      orderNumber: order.order_number,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerEmail: customer_email || null,
      shippingAddress: shipping_address,
      city,
      items: orderItems.map((i: { product_name: string; quantity: number; unit_price: number; size?: string | null }) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        size: i.size,
      })),
      subtotal,
      shippingFee: shipping_fee,
      discountAmount: discount_amount,
      total,
      notes: notes || null,
      createdAt: new Date().toLocaleString('en-NP'),
    }).catch(console.error);

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          total: order.total,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed. Please try again.' },
      { status: 500 }
    );
  }
}
