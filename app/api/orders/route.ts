import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createClient } from "@supabase/supabase-js";
import { DELIVERY_RATES } from "@/lib/delivery-rates";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/orders - Fetch orders (admin sees all, users see their own)
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('orders')
      .select('*, order_items(*), deliveries(*)');

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order (guest checkout supported)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      city,
      address,
      landmark,
      order_note,
      items,
      promo_code,
    } = body;

    // Validate required fields
    if (!customer_name || !customer_phone || !city || !address || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate items structure — only accept productId, quantity, size, color from client
    const itemInputs: { productId: string; quantity: number; size?: string; color?: string }[] = [];
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
      }
      itemInputs.push({
        productId: item.productId,
        quantity: Math.floor(item.quantity),
        size: item.size || undefined,
        color: item.color || undefined,
      });
    }

    const supabase = await supabaseServer();
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Fetch authoritative product data from the database
    const productIds = [...new Set(itemInputs.map(i => i.productId))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, base_price, free_delivery, has_sizes, is_active")
      .in("id", productIds);

    if (productsError || !products) {
      return NextResponse.json({ error: "Failed to verify products" }, { status: 500 });
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    // Verify all products exist and are active
    for (const input of itemInputs) {
      const product = productMap.get(input.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${input.productId}` }, { status: 400 });
      }
      if (!product.is_active) {
        return NextResponse.json({ error: `Product is no longer available: ${product.name}` }, { status: 400 });
      }
    }

    // Compute subtotal using server-side prices
    let subtotal = 0;
    const resolvedItems: {
      productId: string;
      name: string;
      quantity: number;
      unit_price: number;
      size?: string;
      color?: string;
      image_url?: string;
    }[] = [];

    for (const input of itemInputs) {
      const product = productMap.get(input.productId)!;
      const unit_price = Number(product.base_price as number);
      subtotal += unit_price * input.quantity;
      resolvedItems.push({
        productId: input.productId,
        name: product.name as string,
        quantity: input.quantity,
        unit_price,
        size: input.size,
        color: input.color,
        image_url: items.find((i: { productId: string }) => i.productId === input.productId)?.image_url || null,
      });
    }

    // Compute delivery charge server-side from city rate
    const allFreeDelivery = resolvedItems.every(
      i => productMap.get(i.productId)?.free_delivery === true
    );
    let delivery_charge = 0;
    if (!allFreeDelivery) {
      const rate = DELIVERY_RATES.find(
        r => r.city.toUpperCase() === String(city).toUpperCase()
      );
      delivery_charge = rate?.rate ?? 150;
    }

    // Validate and compute promo discount server-side
    let promo_discount = 0;
    let validated_promo_code: string | null = null;
    if (promo_code && typeof promo_code === 'string' && promo_code.trim()) {
      const { data: promo } = await supabaseAdmin
        .from("promo_codes")
        .select("*")
        .ilike("code", promo_code.trim())
        .single();

      if (
        promo &&
        promo.is_active &&
        (!promo.starts_at || new Date(promo.starts_at) <= new Date()) &&
        (!promo.expires_at || new Date(promo.expires_at) >= new Date()) &&
        (promo.usage_limit === null || promo.used_count < promo.usage_limit) &&
        (!promo.min_order_amount || subtotal >= promo.min_order_amount)
      ) {
        if (promo.discount_type === "percentage") {
          promo_discount = subtotal * (promo.discount_value / 100);
          if (promo.max_discount_amount && promo_discount > promo.max_discount_amount) {
            promo_discount = promo.max_discount_amount;
          }
        } else {
          promo_discount = Math.min(promo.discount_value, subtotal);
        }
        promo_discount = Math.round(promo_discount * 100) / 100;
        validated_promo_code = promo.code;
      }
    }

    const total = subtotal - promo_discount + delivery_charge;

    const shipping_address = landmark
      ? `${address}, ${landmark}, ${city}`
      : `${address}, ${city}`;

    // Generate order number
    const { data: lastOrder } = await supabase
      .from("orders")
      .select("order_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let orderNumber = "1001";
    if (lastOrder?.order_number) {
      const lastNumber = parseInt(lastOrder.order_number);
      orderNumber = (lastNumber + 1).toString();
    }

    const orderNotes = validated_promo_code
      ? `${order_note ? order_note + ' | ' : ''}Promo: ${validated_promo_code}`
      : order_note;

    // Create order with server-computed totals
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name,
        customer_email,
        customer_phone,
        city,
        shipping_address,
        notes: orderNotes,
        payment_status: 'unpaid',
        status: 'pending',
        subtotal,
        shipping_fee: delivery_charge,
        discount_amount: promo_discount,
        total,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items with server-fetched prices
    const orderItems = resolvedItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      size: item.size || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      total_price: item.unit_price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items creation error:", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Decrease stock for each item
    for (const item of resolvedItems) {
      try {
        const product = productMap.get(item.productId)!;
        if (product.has_sizes && item.size) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("product_id", item.productId)
            .eq("size", item.size)
            .single();

          if (variant) {
            await supabase
              .from("product_variants")
              .update({ stock: Math.max(0, variant.stock - item.quantity) })
              .eq("product_id", item.productId)
              .eq("size", item.size);
          }
        } else {
          const { data: productData } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.productId)
            .single();

          if (productData) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, productData.stock - item.quantity) })
              .eq("id", item.productId);
          }
        }
      } catch (stockError) {
        console.error(`Failed to update stock for product ${item.productId}:`, stockError);
      }
    }

    // Increment promo code usage if one was validated
    if (validated_promo_code && promo_discount > 0) {
      try {
        const { data: currentPromo } = await supabaseAdmin
          .from('promo_codes')
          .select('used_count')
          .ilike('code', validated_promo_code)
          .single();

        if (currentPromo) {
          await supabaseAdmin
            .from('promo_codes')
            .update({ used_count: currentPromo.used_count + 1 })
            .ilike('code', validated_promo_code);
        }
      } catch (promoError) {
        console.error("Failed to increment promo code usage:", promoError);
      }
    }

    // Send order confirmation email
    if (customer_email) {
      try {
        await sendOrderConfirmationEmail({
          orderNumber: order.order_number,
          customerName: customer_name,
          customerEmail: customer_email,
          customerPhone: customer_phone,
          city,
          address,
          landmark,
          orderNote: order_note,
          items: resolvedItems.map(item => ({
            name: item.name,
            price: item.unit_price,
            quantity: item.quantity,
            size: item.size || null,
            image_url: item.image_url || null,
          })),
          subtotal,
          deliveryCharge: delivery_charge,
          discount: promo_discount,
          promoCode: validated_promo_code,
          total,
          createdAt: order.created_at,
        });
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
      },
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
