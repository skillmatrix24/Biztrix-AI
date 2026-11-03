"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  ShoppingBag, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Star, 
  ArrowRight,
  Loader2, 
  ShieldAlert, 
  UserPlus, 
  CheckCircle2, 
  Eye, 
  ImageIcon, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  ArrowLeft, 
  ChevronRight, 
  Zap, 
  Info, 
  BadgeCheck, 
  Send, 
  User, 
  Smartphone, 
  Mail, 
  Check,
  Share2,
  Copy,
  Flame,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Phone,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, getCurrencySymbol } from "@/lib/utils";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { createStorefrontOrder } from "@/app/actions/storefront-actions";
import { trackStorefrontEvent } from "@/lib/storefront-tracking";
import { StorefrontSeoData } from "@/lib/storefront-seo";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
}

interface ShopClientProps {
  initialBusiness: any;
  businessId: string | null;
  initialProductId?: string | null;
  initialSeoData?: StorefrontSeoData | null;
}

const LOCAL_STORAGE_KEY_CUSTOMER = "biztrix_checkout_customer";

export function ShopClient({ 
  initialBusiness, 
  businessId,
  initialProductId,
  initialSeoData
}: ShopClientProps) {
  const firestore = useFirestore();

  // 1. Fetch Store Configuration Node
  const websiteRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId, 'websites', 'main') : null
  , [firestore, businessId]);
  const { data: websiteData } = useDoc<any>(websiteRef);

  // 2. Fetch Real-time Catalog Node
  const productsQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, 'businesses', businessId, 'products') : null
  , [firestore, businessId]);
  const { data: dbProducts } = useCollection<any>(productsQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // UI & Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProductId || null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout Process State
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "success">("cart");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  // Load saved customer info from localStorage for 1-click returning shopper experience
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOMER);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomerInfo(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          phone: parsed.phone || prev.phone,
          email: parsed.email || prev.email,
          address: parsed.address || prev.address,
        }));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Sync initialProductId if passed from deep-linking
  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  const categories = useMemo(() => {
    const base = ["All"];
    if (!dbProducts) return base;
    const fromProducts = Array.from(new Set(dbProducts.filter((p: any) => p.showOnWebsite && !p.isArchived && p.category).map((p: any) => p.category)));
    return [...base, ...fromProducts];
  }, [dbProducts]);

  const filteredProducts = useMemo(() => {
    const list = dbProducts || [];
    return list.filter((p: any) => {
      if (!p.showOnWebsite || p.isArchived) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || (p.category === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [dbProducts, searchQuery, selectedCategory]);

  const viewingProduct = useMemo(() => {
    if (!selectedProductId || !dbProducts) return null;
    return dbProducts.find((p: any) => p.id === selectedProductId && p.showOnWebsite && !p.isArchived);
  }, [selectedProductId, dbProducts]);

  // Track product view when product modal opens
  useEffect(() => {
    if (viewingProduct && businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "product_view",
        data: {
          id: viewingProduct.id,
          name: viewingProduct.name,
          price: viewingProduct.onlinePrice || viewingProduct.price || 0,
          currency: initialBusiness?.currency || "INR",
          category: viewingProduct.category || "General"
        }
      });
    }
  }, [viewingProduct, businessId, initialBusiness?.currency]);

  // Phase 9: Track initial storefront view on mount
  useEffect(() => {
    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "storefront_view",
        data: {
          storeName: websiteData?.storeName || initialBusiness?.name || "Storefront",
          currency: initialBusiness?.currency || "INR"
        }
      });
    }
  }, [businessId, websiteData?.storeName, initialBusiness?.name, initialBusiness?.currency]);

  // Phase 9: Debounced search telemetry
  useEffect(() => {
    const query = searchQuery.trim();
    if (!businessId || query.length < 2) return;
    const timer = setTimeout(() => {
      trackStorefrontEvent({
        businessId,
        eventName: "search",
        data: {
          query,
          resultsCount: filteredProducts.length
        }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, businessId, filteredProducts.length]);

  // --- CART LOGIC ---
  const addToCart = (product: any, openDrawer = false) => {
    const price = product.onlinePrice || product.price || 0;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: price, 
        quantity: 1, 
        image: product.images?.[0],
        sku: product.sku
      }];
    });

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "add_to_cart",
        data: {
          id: product.id,
          name: product.name,
          price,
          quantity: 1,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    toast({ title: "Added to Bag", description: `${product.name} is in your cart.` });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  // Instant "Buy Now" conversion flow: adds product and immediately advances to checkout info
  const handleBuyNow = (product: any) => {
    addToCart(product, false);
    setCheckoutStep("info");
    setIsCartOpen(true);
    setSelectedProductId(null);

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "begin_checkout",
        data: {
          totalPrice: product.onlinePrice || product.price || 0,
          totalItems: 1,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (businessId && item && delta < 0 && item.quantity + delta <= 0) {
      trackStorefrontEvent({
        businessId,
        eventName: "remove_from_cart",
        data: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartStats = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { totalItems, totalPrice };
  }, [cart]);

  // Track begin_checkout
  const handleProceedToInfo = () => {
    setCheckoutStep("info");
    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "begin_checkout",
        data: {
          totalItems: cartStats.totalItems,
          totalPrice: cartStats.totalPrice,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }
  };

  // --- SOCIAL SHARING ENGINE ---
  const handleShareStore = async () => {
    const storeName = websiteData?.storeName || initialBusiness?.name || "Online Store";
    const shareUrl = window.location.href.split('?')[0];
    const shareText = `Check out ${storeName} for genuine products and direct ordering!`;

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "product_share",
        data: {
          context: "store_share",
          storeName,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Store Link Copied", description: "Share this link with your friends and customers." });
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank');
    }
  };

  const handleShareProduct = async (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const storeName = websiteData?.storeName || initialBusiness?.name || "Store";
    const price = product.onlinePrice || product.price || 0;
    const cur = getCurrencySymbol(initialBusiness?.currency);
    const currentOrigin = window.location.origin;
    const path = window.location.pathname;
    const productUrl = `${currentOrigin}${path}?pId=${encodeURIComponent(product.id)}`;
    const shareText = `*${product.name}* at ${storeName} for only ${cur}${price.toLocaleString()}! Order online:`;

    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "product_share",
        data: {
          id: product.id,
          name: product.name,
          price,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | ${storeName}`,
          text: `${product.name} (${cur}${price.toLocaleString()})`,
          url: productUrl
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      toast({ title: "Product Link Copied", description: `${product.name} link copied to clipboard!` });
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`, '_blank');
    }
  };

  // --- ORDER EXECUTION ---
  const handlePlaceOrder = async () => {
    if (!businessId || cart.length === 0 || !customerInfo.name || !customerInfo.phone) {
      toast({ variant: "destructive", title: "Form Incomplete", description: "Please provide your name and phone number." });
      return;
    }

    // Save info in localStorage for future frictionless repeat purchases
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOMER, JSON.stringify(customerInfo));
    } catch {
      // Ignore
    }

    setIsPlacingOrder(true);
    try {
      // 1. Create Internal Order Node (Secure Server-side Validation)
      const result = await createStorefrontOrder({
        businessId,
        customerData: customerInfo,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }))
      });

      if (!result.success) {
        toast({ 
          variant: "destructive", 
          title: "Order Failed", 
          description: result.error || "Please try again." 
        });
        setIsPlacingOrder(false);
        return;
      }

      const bizOrderId = result.orderId!;

      // 2. Initiate Payment Node (Razorpay Order Initiation)
      const payRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          orderId: bizOrderId,
          name: customerInfo.name,
          phone: customerInfo.phone
        })
      });

      const payData = await payRes.json();
      if (!payData.success) {
        toast({ variant: "destructive", title: "Payment System Offline", description: payData.message });
        setIsPlacingOrder(false);
        return;
      }

      // 3. Launch Razorpay Checkout
      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: websiteData?.storeName || initialBusiness.name,
        description: `Order ${bizOrderId}`,
        order_id: payData.orderId,
        handler: async (response: any) => {
          // 4. Secure Verification Handshake
          setIsPlacingOrder(true);
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                businessId,
                orderId: bizOrderId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setConfirmedOrderId(bizOrderId);
              setCheckoutStep("success");
              
              if (businessId) {
                trackStorefrontEvent({
                  businessId,
                  eventName: "purchase",
                  data: {
                    orderId: bizOrderId,
                    amount: cartStats.totalPrice,
                    currency: initialBusiness?.currency || "INR"
                  }
                });
              }

              setCart([]); 
              toast({ title: "Payment Successful", description: "Order has been confirmed." });
            } else {
              toast({ variant: "destructive", title: "Verification Failed", description: verifyData.message });
            }
          } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "Verification Error" });
          } finally {
            setIsPlacingOrder(false);
          }
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false);
            toast({ title: "Payment Pending", description: "The order is saved. You can pay later." });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Network Error" });
      setIsPlacingOrder(false);
    }
  };

  const handleCheckoutWhatsApp = () => {
    if (!initialBusiness || cart.length === 0) return;
    
    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "whatsapp_order_click",
        data: {
          context: "cart_checkout",
          totalItems: cartStats.totalItems,
          totalPrice: cartStats.totalPrice,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    let message = `*NAMASTE! NEW ORDER REQUEST*\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    
    cart.forEach(item => {
      message += `• ${item.name} (x${item.quantity}) - ${getCurrencySymbol(initialBusiness.currency)}${(item.price * item.quantity).toLocaleString()}\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Total Items:* ${cartStats.totalItems}\n`;
    message += `*Grand Total:* ${getCurrencySymbol(initialBusiness.currency)}${cartStats.totalPrice.toLocaleString()}\n\n`;
    if (customerInfo.name) {
      message += `*Customer:* ${customerInfo.name}\n`;
      message += `*Phone:* ${customerInfo.phone}\n`;
      if (customerInfo.address) message += `*Delivery Address:* ${customerInfo.address}\n\n`;
    }
    message += `Kripya mera order confirm karein.`;

    const url = `https://wa.me/${initialBusiness.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleOrderOnWhatsAppDirect = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (businessId) {
      trackStorefrontEvent({
        businessId,
        eventName: "whatsapp_order_click",
        data: {
          context: "direct_product",
          id: product.id,
          name: product.name,
          price: product.onlinePrice || product.price || 0,
          currency: initialBusiness?.currency || "INR"
        }
      });
    }

    const price = product.onlinePrice || product.price || 0;
    const cur = getCurrencySymbol(initialBusiness.currency);
    const message = `*NAMASTE! PRODUCT INQUIRY*\n━━━━━━━━━━━━━━━━\n🏠 *Item:* ${product.name}\n💰 *Price:* ${cur}${price.toLocaleString()}\n📌 *SKU:* ${product.sku || 'N/A'}\n\nKripya is product ke availability aur delivery details confirm karein.`;
    const url = `https://wa.me/${initialBusiness.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const primaryColor = websiteData?.primaryColor || initialSeoData?.primaryColor || "#0C83B3";
  const currencySymbol = getCurrencySymbol(initialBusiness?.currency);
  const whatsappOrderEnabled = websiteData?.whatsappOrderEnabled ?? initialSeoData?.whatsappOrderEnabled ?? true;
  const showDiscount = websiteData?.showDiscount ?? initialSeoData?.showDiscount ?? true;

  if (!initialBusiness) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <ShieldAlert className="h-12 w-12 text-red-600 mb-6" />
        <h1 className="text-2xl font-black text-slate-900 uppercase">Invalid Store Node</h1>
        <p className="text-muted-foreground mt-2 max-w-xs mx-auto">The requested business node could not be located in the registry or is not published.</p>
        <Button asChild variant="outline" className="mt-8 rounded-xl font-bold uppercase text-xs">
          <Link href="/">Back to Platform</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body text-left">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ backgroundColor: primaryColor }}>
              {initialBusiness.name?.charAt(0)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-black text-slate-900 leading-none uppercase tracking-tight">{websiteData?.storeName || initialBusiness.name}</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Official Store
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Storefront Share Button */}
             <Button 
               variant="ghost" 
               size="icon" 
               className="h-11 w-11 rounded-full bg-muted/20 text-slate-700 hover:bg-muted/40"
               title="Share Store"
               onClick={handleShareStore}
             >
               <Share2 className="h-4 w-4" />
             </Button>

             {/* Shopping Bag Drawer */}
             <Sheet open={isCartOpen} onOpenChange={(open) => { setIsCartOpen(open); if (!open) setCheckoutStep("cart"); }}>
               <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full bg-muted/20 text-slate-900 hover:bg-muted/40">
                    <ShoppingCart className="h-5 w-5" />
                    {cartStats.totalItems > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 bg-red-600 text-white border-2 border-white text-[10px] font-black flex items-center justify-center">
                        {cartStats.totalItems}
                      </Badge>
                    )}
                  </Button>
               </SheetTrigger>
               <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-none shadow-2xl bg-white text-left">
                  <SheetHeader className="p-6 bg-slate-900 text-white shrink-0 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <ShoppingCart className="h-6 w-6 text-accent" />
                         <SheetTitle className="text-white text-xl font-black uppercase tracking-tight">
                           {checkoutStep === 'info' ? 'Delivery & Contact' : checkoutStep === 'success' ? 'Order Confirmed' : 'Shopping Bag'}
                         </SheetTitle>
                      </div>
                      {checkoutStep === 'info' && (
                        <button onClick={() => setCheckoutStep("cart")} className="h-8 px-2.5 text-[9px] font-black uppercase text-accent border border-accent/20 rounded-lg hover:bg-accent/10">
                          Back to Bag
                        </button>
                      )}
                    </div>
                    <SheetDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Direct Secure Checkout</SheetDescription>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {checkoutStep === 'success' ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in zoom-in-95">
                          <div className="h-24 w-24 rounded-[2.5rem] bg-emerald-50 flex items-center justify-center border-4 border-white shadow-xl shadow-emerald-200/50">
                             <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                          </div>
                          <div className="space-y-3">
                             <h3 className="text-2xl font-black text-slate-900 uppercase">Order Confirmed!</h3>
                             <p className="text-sm text-muted-foreground font-medium px-4">Thank you for your order. We are preparing your items for delivery.</p>
                          </div>
                          <Card className="w-full bg-slate-50 border-none p-6 rounded-[2rem] shadow-inner text-left">
                             <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Confirmation Order ID</p>
                             <p className="text-lg font-mono font-black text-primary">{confirmedOrderId}</p>
                          </Card>
                          <SheetClose asChild>
                            <Button className="w-full h-14 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl">Continue Shopping</Button>
                          </SheetClose>
                       </div>
                    ) : checkoutStep === 'info' ? (
                      <ScrollArea className="flex-1 p-8">
                        <div className="space-y-8 pb-10">
                          <div className="space-y-6">
                             <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-primary" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Customer Identity</h4>
                             </div>
                             <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Name *</Label>
                                  <Input 
                                    value={customerInfo.name} 
                                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                                    placeholder="e.g. Priya Patel" 
                                    className="h-12 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-sm" 
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp Mobile *</Label>
                                  <div className="relative">
                                     <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                     <Input 
                                       value={customerInfo.phone} 
                                       onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value.replace(/\D/g, '')})}
                                       placeholder="9876543210" 
                                       className="h-12 pl-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold font-mono text-sm" 
                                     />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Address</Label>
                                  <div className="relative">
                                     <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                     <Input 
                                       value={customerInfo.email} 
                                       onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                                       placeholder="customer@example.com" 
                                       className="h-12 pl-11 rounded-xl bg-muted/20 border-none shadow-inner font-bold text-sm" 
                                     />
                                  </div>
                                </div>
                             </div>
                          </div>

                          <Separator />

                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Delivery Address</h4>
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Full Postal Address</Label>
                                <Textarea 
                                  value={customerInfo.address} 
                                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                                  placeholder="Flat / House No, Building, Landmark, Locality, Pincode..." 
                                  className="min-h-[100px] rounded-2xl bg-muted/20 border-none shadow-inner p-4 text-xs font-medium leading-relaxed" 
                                />
                             </div>
                          </div>
                        </div>
                      </ScrollArea>
                    ) : cart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-30">
                        <ShoppingBag className="h-16 w-16" />
                        <p className="text-sm font-black uppercase tracking-widest leading-relaxed">Your bag is empty.<br/>Browse our catalog to add items.</p>
                      </div>
                    ) : (
                      <ScrollArea className="flex-1 p-6">
                        <div className="space-y-4">
                          {cart.map((item) => (
                            <div key={item.id} className="flex gap-4 group p-3 rounded-2xl bg-muted/10 border text-left">
                               <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                                  {item.image ? (
                                    <img src={item.image} className="h-full w-full object-cover" alt={item.name} />
                                  ) : <ImageIcon className="h-full w-full p-4 opacity-20" />}
                               </div>
                               <div className="flex-1 min-w-0 space-y-2 text-left">
                                  <div className="flex justify-between items-start gap-2">
                                     <h4 className="text-xs font-black uppercase text-slate-900 leading-tight line-clamp-1">{item.name}</h4>
                                     <button onClick={() => updateCartQty(item.id, -item.quantity)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                                       <Trash2 className="h-3.5 w-3.5" />
                                     </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                        <button onClick={() => updateCartQty(item.id, -1)} className="h-6 w-6 rounded-md hover:bg-muted/30 flex items-center justify-center">
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                                        <button onClick={() => updateCartQty(item.id, 1)} className="h-6 w-6 rounded-md hover:bg-muted/30 flex items-center justify-center">
                                          <Plus className="h-3 w-3" />
                                        </button>
                                     </div>
                                     <span className="text-xs font-black text-primary">{currencySymbol}{(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-6 bg-slate-50 border-t space-y-4 shrink-0">
                       <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                            <span>Items Subtotal</span>
                            <span>{currencySymbol}{cartStats.totalPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-base font-black text-slate-900 uppercase">
                            <span>Estimated Total</span>
                            <span>{currencySymbol}{cartStats.totalPrice.toLocaleString()}</span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-2.5">
                          {checkoutStep === 'cart' ? (
                            <>
                              <Button 
                                onClick={handleProceedToInfo}
                                className="w-full h-14 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
                                style={{ backgroundColor: primaryColor }}
                              >
                                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                              {whatsappOrderEnabled && (
                                <Button 
                                  variant="outline"
                                  onClick={handleCheckoutWhatsApp}
                                  className="w-full h-11 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-bold uppercase text-[10px] tracking-widest gap-2 rounded-xl"
                                >
                                  <MessageCircle className="h-4 w-4" /> Order via WhatsApp
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button 
                              onClick={handlePlaceOrder}
                              disabled={isPlacingOrder || !customerInfo.name || !customerInfo.phone}
                              className="w-full h-14 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {isPlacingOrder ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Zap className="h-5 w-5 mr-2 fill-current" />}
                              Pay & Place Order ({currencySymbol}{cartStats.totalPrice.toLocaleString()})
                            </Button>
                          )}
                       </div>
                    </div>
                  )}
               </SheetContent>
             </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden py-14 px-4 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <ShoppingBag className="h-52 w-52 text-white" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <Badge className="bg-white/20 text-white border-none py-1 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
            ✨ Verified Merchant Catalog
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            {websiteData?.storeName || initialBusiness.name}
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto font-medium">
            {websiteData?.seoDescription || "Browse our authentic catalog and place direct orders with secure online payment or WhatsApp."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-black uppercase rounded-xl h-9 px-4 gap-2"
              onClick={handleShareStore}
            >
              <Share2 className="h-3.5 w-3.5" /> Share Store
            </Button>
          </div>
        </div>
      </section>

      {/* Search and Category Filter Card */}
      <section className="max-w-7xl mx-auto px-4 -mt-8">
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white border">
          <CardContent className="p-6 md:p-8 space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
              <Input 
                placeholder="Search products by name or category..." 
                className="h-14 pl-12 pr-4 bg-muted/20 border-none rounded-2xl text-sm shadow-inner font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <Button 
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                  className={cn(
                    "rounded-full h-9 px-5 text-[10px] font-black uppercase tracking-wider transition-all",
                    selectedCategory === cat ? "shadow-md text-white" : "bg-white border-slate-200 text-slate-700"
                  )}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Products Grid Section */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8 px-2 text-left">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            Our Catalog <span className="text-muted-foreground font-bold text-xs opacity-50">({filteredProducts.length} Products)</span>
          </h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 space-y-4 opacity-40">
            <ShoppingBag className="h-16 w-16 mx-auto" />
            <p className="text-lg font-bold uppercase tracking-widest">No products match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p: any) => {
              const basePrice = p.price || 0;
              const onlinePrice = p.onlinePrice !== undefined && p.onlinePrice !== null ? p.onlinePrice : basePrice;
              const hasDiscount = onlinePrice < basePrice;
              const discountPercent = hasDiscount && basePrice > 0 ? Math.round(((basePrice - onlinePrice) / basePrice) * 100) : 0;
              const isLowStock = p.stock > 0 && p.stock <= (p.minThreshold || 2);
              const isOutOfStock = p.stock <= 0;

              return (
                <Card 
                  key={p.id} 
                  className="group border-none shadow-sm hover:shadow-2xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-white ring-1 ring-slate-100 flex flex-col border text-left"
                >
                  {/* Image Container with Badges */}
                  <div 
                    className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer" 
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <img 
                      src={p.images?.[0] || DEFAULT_STOREFRONT_IMAGE} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Stock Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      {isOutOfStock ? (
                        <Badge className="bg-slate-900 text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md">
                          Waitlist Only
                        </Badge>
                      ) : isLowStock ? (
                        <Badge className="bg-amber-500 text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Only {p.stock} Left
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md">
                          In Stock
                        </Badge>
                      )}
                    </div>

                    {/* Marketing Badges (Featured / Best-Seller) */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                      {p.isFeatured && (
                        <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md flex items-center gap-1" style={{ backgroundColor: primaryColor }}>
                          <Star className="h-2.5 w-2.5 fill-current" /> Featured
                        </Badge>
                      )}
                      {p.isBestSeller && (
                        <Badge className="bg-orange-600 text-white border-none text-[8px] font-black uppercase px-2 py-0.5 shadow-md flex items-center gap-1">
                          <Flame className="h-2.5 w-2.5 fill-current" /> Best Seller
                        </Badge>
                      )}
                    </div>

                    {/* Quick Share Button on Card */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm text-slate-700 hover:bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Share Product"
                      onClick={(e) => handleShareProduct(p, e)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Card Content & Pricing */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between text-left space-y-3">
                    <div className="cursor-pointer space-y-1.5" onClick={() => setSelectedProductId(p.id)}>
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                        {p.category || 'General'} {p.sku ? `• ${p.sku}` : ''}
                      </p>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight leading-tight min-h-[2.5rem]">
                        {p.name}
                      </h3>
                      
                      {/* Price & Discount Display */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg font-black" style={{ color: primaryColor }}>
                          {currencySymbol}{onlinePrice.toLocaleString()}
                        </span>
                        {hasDiscount && showDiscount && (
                          <span className="text-xs text-muted-foreground line-through font-bold">
                            {currencySymbol}{basePrice.toLocaleString()}
                          </span>
                        )}
                        {hasDiscount && showDiscount && discountPercent > 0 && (
                          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-black px-1.5 py-0">
                            {discountPercent}% OFF
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Conversion CTAs */}
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          className="w-full text-white font-black rounded-xl h-10 uppercase text-[9px] tracking-wider gap-1.5 shadow-sm active:scale-95 transition-all"
                          style={{ backgroundColor: primaryColor }}
                          disabled={isOutOfStock}
                          onClick={() => addToCart(p)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                        <Button 
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl h-10 uppercase text-[9px] tracking-wider gap-1.5 shadow-sm active:scale-95 transition-all"
                          disabled={isOutOfStock}
                          onClick={() => handleBuyNow(p)}
                        >
                          <Zap className="h-3.5 w-3.5 fill-current" /> Buy Now
                        </Button>
                      </div>

                      {whatsappOrderEnabled && (
                        <Button 
                          variant="outline"
                          className="w-full h-8 text-[8px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200 rounded-lg gap-1.5"
                          onClick={(e) => handleOrderOnWhatsAppDirect(p, e)}
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp Order
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Brand Trust Section */}
      <section className="bg-slate-900 py-20 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
          <div className="space-y-6 text-left">
            <Badge className="bg-white/10 text-white border-white/20 py-1.5 px-4 rounded-full text-[9px] font-black uppercase tracking-widest">
              Direct Consumer Guarantee
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black leading-tight uppercase tracking-tight">
              Genuine Products. <br />
              <span className="text-accent">Direct from the merchant.</span>
            </h2>
            <div className="grid gap-3 pt-2">
              {[
                { title: "Safe Digital Payments", desc: "Transactions verified securely via authorized payment gateways.", icon: Zap },
                { title: "Verified Identity Node", desc: "Every order is confirmed directly to your mobile phone via WhatsApp / SMS.", icon: BadgeCheck },
                { title: "Live Stock Availability", desc: "Real-time inventory levels ensure prompt fulfillment.", icon: Package }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 text-left">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-accent">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl text-slate-900 border text-left space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-md font-black text-lg" style={{ backgroundColor: primaryColor }}>
                {initialBusiness.name?.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">About Merchant</p>
                <p className="text-base font-black uppercase">{initialBusiness.name}</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span>{initialBusiness.address || "Official Business Location"}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>{initialBusiness.phone}</span>
              </p>
              {initialBusiness.email && (
                <p className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span>{initialBusiness.email}</span>
                </p>
              )}
            </div>
            <Button 
              className="w-full h-12 rounded-xl text-white font-black uppercase text-[10px] tracking-widest"
              style={{ backgroundColor: primaryColor }}
              onClick={handleShareStore}
            >
              <Share2 className="h-4 w-4 mr-2" /> Share Storefront
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12 text-left">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md" style={{ backgroundColor: primaryColor }}>
              {initialBusiness.name?.charAt(0)}
            </div>
            <span className="font-black text-sm text-slate-900 uppercase">{initialBusiness.name}</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            © {new Date().getFullYear()} {initialBusiness.name}. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* --- PRODUCT DETAIL OVERLAY SHEET --- */}
      <Sheet open={!!selectedProductId} onOpenChange={(o) => !o && setSelectedProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col border-none shadow-2xl bg-white text-left">
           {viewingProduct ? (
             <>
               <SheetHeader className="p-8 bg-slate-900 text-white shrink-0 relative text-left">
                  <div className="flex justify-between items-start mb-6">
                    <Badge variant="outline" className="bg-white/10 text-accent border-white/20 uppercase text-[9px] font-black px-3 py-1">
                      SKU: {viewingProduct.sku || viewingProduct.id.slice(-6).toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                        title="Share Product"
                        onClick={(e) => handleShareProduct(viewingProduct, e)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <SheetClose className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20">
                        <X className="h-5 w-5" />
                      </SheetClose>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 relative z-10 text-left">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-primary font-black text-2xl shrink-0 shadow-xl">
                      {viewingProduct.name?.charAt(0)}
                    </div>
                    <div className="space-y-1 text-left min-w-0">
                      <SheetTitle className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                        {viewingProduct.name}
                      </SheetTitle>
                      <p className="text-accent text-[10px] font-bold uppercase tracking-[0.2em]">
                        {viewingProduct.category || 'General'}
                      </p>
                    </div>
                  </div>
               </SheetHeader>

               <ScrollArea className="flex-1">
                 <div className="p-8 space-y-8 text-left">
                    {/* Main Image */}
                    <div className="aspect-[1.5/1] rounded-[2rem] overflow-hidden bg-muted border border-slate-100 shadow-inner">
                       <img 
                        src={viewingProduct.images?.[0] || DEFAULT_STOREFRONT_IMAGE} 
                        className="h-full w-full object-cover" 
                        alt={viewingProduct.name} 
                       />
                    </div>

                    {/* Price and Stock Stats */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col justify-center text-left">
                          <p className="text-[9px] font-black uppercase text-primary/70 tracking-widest">Online Price</p>
                          <p className="text-2xl font-black text-primary mt-1">
                            {currencySymbol}{(viewingProduct.onlinePrice || viewingProduct.price).toLocaleString()}
                          </p>
                          {viewingProduct.onlinePrice && viewingProduct.onlinePrice < viewingProduct.price && showDiscount && (
                            <p className="text-xs text-muted-foreground line-through font-bold mt-0.5">
                              {currencySymbol}{viewingProduct.price.toLocaleString()}
                            </p>
                          )}
                       </div>
                       <div className="p-5 bg-muted/20 rounded-2xl border flex flex-col justify-center text-left">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Stock Availability</p>
                          <Badge className={cn(
                            "w-fit border-none text-[8px] font-black uppercase h-6 px-2.5 mt-2",
                            viewingProduct.stock > (viewingProduct.minThreshold || 2) ? "bg-emerald-100 text-emerald-800" :
                            viewingProduct.stock > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                          )}>
                             {viewingProduct.stock > 0 ? `${viewingProduct.stock} Units Available` : 'Waitlist Only'}
                          </Badge>
                       </div>
                    </div>

                    <Separator className="opacity-40" />

                    {/* Technical Description */}
                    <div className="space-y-3 text-left">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                         <Info className="h-4 w-4" /> Description & Specs
                       </h4>
                       <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed text-left whitespace-pre-line">
                         {viewingProduct.description || "Official product specifications are verified by merchant. Contact us via WhatsApp for instant inquiries."}
                       </p>
                    </div>

                    {/* Product Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                       <div className="p-3.5 rounded-xl bg-slate-50 border flex flex-col gap-1 text-left">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Product SKU</span>
                          <span className="text-xs font-mono font-black">{viewingProduct.sku || 'N/A'}</span>
                       </div>
                       <div className="p-3.5 rounded-xl bg-slate-50 border flex flex-col gap-1 text-left">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Category</span>
                          <span className="text-xs font-black uppercase">{viewingProduct.category || 'General'}</span>
                       </div>
                    </div>
                 </div>
               </ScrollArea>

               <SheetFooter className="p-6 bg-muted/10 border-t flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1 h-14 bg-primary text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                    disabled={viewingProduct.stock <= 0}
                    onClick={() => { addToCart(viewingProduct); setSelectedProductId(null); }}
                  >
                    <Plus className="h-4 w-4" /> Add to Bag
                  </Button>
                  <Button 
                    className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    disabled={viewingProduct.stock <= 0}
                    onClick={() => handleBuyNow(viewingProduct)}
                  >
                    <Zap className="h-4 w-4 fill-current" /> Buy Now
                  </Button>
                  {whatsappOrderEnabled && (
                    <Button 
                      variant="outline"
                      className="h-14 w-14 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-md active:scale-95 transition-all shrink-0"
                      title="Order on WhatsApp"
                      onClick={(e) => handleOrderOnWhatsAppDirect(viewingProduct, e)}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  )}
               </SheetFooter>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-30">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
             </div>
           )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const DEFAULT_STOREFRONT_IMAGE = "https://placehold.co/800x800/0C83B3/white?text=Biztrix+OS";
