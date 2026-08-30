"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { cartItem, cartItems, cartValue } from "@/lib/analytics/items";
import { useTracking } from "@/lib/analytics/tracker";
import { trpc } from "@/lib/trpc";

/**
 * The bag. Opened from the header's cart button through the cart context's
 * `isOpen`/`setOpen`, so it is mounted once in the layout instead of living
 * inside the header.
 */
export function CartDrawer() {
  const { user } = useAuth();
  const { cart, removeFromCart, updateQuantity, isOpen, setOpen, totalItems, subtotal, clearCart } =
    useCart();
  const { track } = useTracking();
  const checkoutMutation = trpc.commerce.createOrder.useMutation();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    // The bag is read before the request because a success clears it, and the
    // purchase event still has to describe what was bought.
    const items = cartItems(cart);
    const value = cartValue(cart);
    track("begin_checkout", { value, items });
    try {
      const order = await checkoutMutation.mutateAsync({
        customerName: user?.name || "Valued Customer",
        customerEmail: user?.email || "customer@thesofaco.ca",
        shippingAddress: "1248 Queen Street West, Toronto, ON",
        itemsJson: JSON.stringify(cart),
        totalAmount: subtotal,
      });
      toast.success("Order placed successfully", {
        description: "Our artisan workshop is preparing your pieces.",
      });
      track("purchase", { value, items, orderId: String(order.orderId) });
      clearCart();
      setOpen(false);
    } catch {
      toast.error("Checkout failed", { description: "Please sign in or try again." });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="w-full border-l border-sand-300 bg-sand-100 p-0 sm:max-w-lg">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-sand-300 px-6 py-6 text-left">
            <SheetTitle className="font-display text-3xl font-medium tracking-[-0.03em] text-ink-900">
              Your bag{" "}
              <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-clay-500">
                ({totalItems})
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag size={38} strokeWidth={1} className="mb-5 text-clay-400" />
                <p className="font-display text-3xl text-ink-900">A quiet beginning.</p>
                <p className="mt-3 max-w-xs text-xs leading-5 text-ink-500">
                  Your bag is ready for a piece that feels like home.
                </p>
                <Link
                  href="/shop"
                  onClick={() => setOpen(false)}
                  className="mt-8 rounded-full bg-ink-900 px-7 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-sand-50 transition-colors hover:bg-clay-500"
                >
                  Explore the collection
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                <AnimatePresence initial={false}>
                  {cart.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 border-b border-sand-300 pb-5"
                    >
                      {item.image ? (
                        <OptimizedImage
                          src={item.image}
                          alt={item.name}
                          sizes="96px"
                          className="h-24 w-24 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-4">
                          <h4 className="font-display text-xl leading-none text-ink-900">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              track("remove_from_cart", {
                                value: cartValue([item]),
                                items: [cartItem(item)],
                                contentName: item.name,
                              });
                              removeFromCart(item.id);
                            }}
                            className="text-[10px] uppercase tracking-[0.16em] text-clay-500 transition-colors hover:text-clay-700"
                          >
                            Remove
                          </button>
                        </div>
                        {item.variantDetails ? (
                          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-500">
                            {item.variantDetails}
                          </p>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink-900">
                            ${(item.price / 100).toLocaleString()}
                          </span>
                          <div className="flex items-center rounded-full border border-sand-300">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              className="grid h-7 w-7 place-items-center text-ink-700"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus size={11} />
                            </button>
                            <span className="w-7 text-center text-xs text-ink-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              className="grid h-7 w-7 place-items-center text-ink-700"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {cart.length > 0 ? (
            <div className="border-t border-sand-300 px-6 py-6">
              <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
                <span>Subtotal</span>
                <span>${(subtotal / 100).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-500">
                Shipping and taxes are calculated at checkout.
              </p>
              <button
                type="button"
                disabled={checkoutMutation.isPending}
                onClick={handleCheckout}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-ink-900 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-sand-50 transition-colors hover:bg-clay-500 disabled:cursor-wait disabled:opacity-60"
              >
                {checkoutMutation.isPending ? "Preparing your order…" : "Proceed to checkout"}
                <ArrowRight size={15} />
              </button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
