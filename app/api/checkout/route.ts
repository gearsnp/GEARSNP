import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sendAdminOrderNotification } from '@/lib/email';
import { createClient } from "@supabase/supabase-js";

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

    // Fetch authoritative prices from the database
    const productIds = [...new Set(items.map((i: { product_id: string }) => i.product_id))];
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, base_price, is_active")
      .in("id", productIds);

    if (productsError || !products) {
      return NextResponse.json({ error: "Failed to verify products" }, { status: 500 });
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Compute subtotal using server-side prices
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_active) {
        return NextResponse.json({ error: `Product not found: ${item.product_id}` }, { status: 400 });
      }
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unit_price = Number(product.base_price);
      subtotal += unit_price * qty;
      resolvedItems.push({ ...item, product_name: product.name, unit_price, quantity: qty });
    }

    const shipping_fee = subtotal >= 5000 ? 0 : 150;
    const discount_amount = 0;
    const total = subtotal + shipping_fee - discount_amount;

    const { data: { user } } = await supabase.auth.getUser();

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

    const orderItems = resolvedItems.map(item => ({
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
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    await supabase.from('deliveries').insert({
      order_id: order.id,
      status: 'pending',
    });

    sendAdminOrderNotification({
      orderNumber: order.order_number,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerEmail: customer_email || null,
      shippingAddress: shipping_address,
      city,
      items: orderItems.map(i => ({
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
