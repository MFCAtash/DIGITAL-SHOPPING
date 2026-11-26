/** تایپهای مشترک بین فرانت و قرارداد OpenAPI (دستی و مربوط بهoperations موجود). */

export interface CategoryDto {
  slug: string;
  name: string;
}

export interface ImageDto {
  file: string;
  alt: string;
}

export interface VariantDto {
  sku: string;
  name: string;
  options: Record<string, string>;
  final_usd_cents: number | null;
  stock: number;
  is_active: boolean;
}

export interface ReviewDto {
  id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  author?: string;
  verified?: boolean;
}

export interface ReviewListDto {
  items: ReviewDto[];
  total: number;
  average: number;
  distribution: Record<string, number>;
}

export interface FacetValueDto {
  value: string;
  label: string;
  count: number;
}

export interface PriceBucketDto {
  label: string;
  min_usd: number | null;
  max_usd: number | null;
  count: number;
}

export interface FacetsDto {
  total: number;
  brands: FacetValueDto[];
  categories: FacetValueDto[];
  ram: FacetValueDto[];
  storage: FacetValueDto[];
  price: { min_usd: number | null; max_usd: number | null; toman_per_usd: number | null; buckets: PriceBucketDto[] };
  in_stock: number;
  on_sale: number;
}

export interface CouponDto {
  code: string;
  description: string;
  kind: string;
  discount_toman: number;
  min_subtotal_toman: number;
  max_discount_toman: number | null;
  valid_until: string | null;
}

export interface SuggestDto {
  items: { slug: string; name: string; brand: string; price_toman: number | null }[];
}

export interface PricePointDto {
  label: string;
  t: number;
  v: number;
}

export interface ProductDto {
  slug: string;
  brand: string;
  category: string;
  name: string;
  description: string;
  specs: Record<string, string>;
  price_usd_cents: number;
  final_usd_cents: number;
  discount_percent: number;
  price_toman: number | null;
  price_note: "from" | "approx" | "";
  price_checked_on: string | null;
  purchasable: boolean;
  in_stock: boolean;
  stock: number;
  images: ImageDto[];
  /** فاز ۶–۱۲: واریانت real در PDP */
  variants?: VariantDto[];
  reviews?: ReviewDto[];
}

export interface ProductListDto {
  count: number;
  items: ProductDto[];
}

export interface CartWarning {
  code: string;
  message: string;
}

export interface CartLine {
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  specs: Record<string, string>;
  discount_percent: number;
  old_toman: number | null;
  price_note: string;
  qty: number;
  max_qty: number;
  stock: number;
  unit_toman: number | null;
  unit_usd_cents: number | null;
  line_toman: number | null;
  warnings: CartWarning[];
}

export interface CartDto {
  lines: CartLine[];
  count: number;
  subtotal_toman: number;
  notices: { code: string; slug: string }[];
}

export interface UserDto {
  id: number;
  phone: string;
  name: string;
}

export interface AddressDto {
  id: number;
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  postal_code: string;
  street: string;
  plate: string;
  unit: string;
  is_default: boolean;
}

export interface AddressInput {
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  postal_code: string;
  street: string;
  plate?: string;
  unit?: string;
  is_default?: boolean;
}

export interface ShippingQuote {
  code: string;
  name: string;
  eta: string;
  cost_toman: number | null;
}

export interface OrderItemDto {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  qty: number;
  unit_toman: number;
}

export interface OrderDto {
  number: string;
  status: string;
  subtotal_toman: number;
  discount_toman: number;
  coupon_code: string;
  shipping_toman: number;
  tax_toman: number;
  total_toman: number;
  shipping_code: string;
  created_at: string;
  expires_at: string | null;
  items: OrderItemDto[];
  address: Record<string, string>;
  payment_status: string | null;
  /** فاز ۶–۱۲: اطلاعات ارسال */
  shipment?: {
    carrier: string;
    tracking_number: string;
    status: string;
    eta: string;
  } | null;
}

export interface OrderListDto {
  items: OrderDto[];
  next_cursor: string | null;
}

export interface ReturnDto {
  id: number;
  order_number: string;
  item_slug: string;
  reason: string;
  status: "requested" | "approved" | "rejected" | "refunded";
  created_at: string;
}

export interface NotificationDto {
  id: number;
  event: string;
  title: string;
  body: string;
  channel: string;
  read_at: string | null;
  created_at: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  fields?: Record<string, string>;
  retry_after?: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  retryAfter?: number;

  constructor(status: number, body: Partial<ApiErrorShape>) {
    super(body.message ?? "خطای ناشناخته");
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "unknown_error";
    this.fields = body.fields;
    this.retryAfter = body.retry_after;
  }
}
