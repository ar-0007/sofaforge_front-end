import React, { useEffect } from "react";
import { toast } from "sonner";
import { getAccountEmptyStateMessage } from "@/lib/accountUi";
import StoreLayout from "@/components/StoreLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function Account() {
  const { user, isAuthenticated } = useAuth();
  const ordersQuery = trpc.commerce.getOrders.useQuery(undefined, { enabled: isAuthenticated });
  const configsQuery = trpc.commerce.getConfiguratorSaves.useQuery(undefined, { enabled: isAuthenticated });
  const orders = ordersQuery.data ?? [];
  const configs = configsQuery.data ?? [];

  useEffect(() => {
    if (ordersQuery.isError) toast.error("Order history is temporarily unavailable", { description: "Please try again shortly." });
  }, [ordersQuery.isError]);

  useEffect(() => {
    if (configsQuery.isError) toast.error("Saved designs are temporarily unavailable", { description: "Your account data could not be loaded." });
  }, [configsQuery.isError]);

  useEffect(() => {
    if (isAuthenticated && ordersQuery.isSuccess && orders.length === 0) {
      const message = getAccountEmptyStateMessage("orders");
      toast.info(message.title, { description: message.description });
    }
  }, [isAuthenticated, ordersQuery.isSuccess, orders.length]);

  useEffect(() => {
    if (isAuthenticated && configsQuery.isSuccess && configs.length === 0) {
      const message = getAccountEmptyStateMessage("configurations");
      toast.info(message.title, { description: message.description });
    }
  }, [isAuthenticated, configsQuery.isSuccess, configs.length]);

  if (!isAuthenticated) {
    return (
      <StoreLayout>
        <div className="max-w-md mx-auto px-6 py-32 text-center space-y-6">
          <h1 className="font-serif text-3xl font-light">Customer Account</h1>
          <p className="text-sm text-muted-foreground">Please sign in to view your order history and saved custom sofa configurations.</p>
          <Button asChild className="bg-[#1C1A17] text-white rounded-none w-full py-3">
            <a href="/api/oauth/login" onClick={() => toast.info("Opening secure sign-in", { description: "You will return to your Sofa Co. account." })}>Sign In with Manus</a>
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        {/* Profile Header */}
        <div className="border-b border-[#E6E0D5] pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#8C7A6B] mb-1 block">Welcome back</span>
            <h1 className="font-serif text-3xl font-light">{user?.name || "Valued Patron"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <a href="/api/oauth/logout" onClick={() => toast.success("Signing you out", { description: "Your Sofa Co. account is being closed." })} className="text-xs font-semibold uppercase tracking-widest text-red-600 underline">
            Sign Out
          </a>
        </div>

        {/* Order History */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-light">Order History</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no active or past orders.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-[#E6E0D5] p-6 bg-white flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <p className="font-serif font-medium text-base">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs mt-2">Status: <span className="uppercase font-semibold text-[#8C7A6B]">{order.status}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg font-medium">${(order.totalAmount / 100).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Free White Glove Delivery</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Configurations */}
        <div className="space-y-6">
          <h2 className="font-serif text-2xl font-light">Saved Custom Configurations</h2>
          {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no saved custom configurations yet. Visit the Custom Studio to design your piece.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configs.map((c) => (
                <div key={c.id} className="border border-[#E6E0D5] p-6 bg-white space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif font-medium text-lg">Custom {c.shape}</h3>
                    <span className="font-serif text-lg font-medium">${(c.totalPrice / 100).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Fabric: {c.fabric} | Colour: {c.colour} | Size: {c.size}</p>
                  <p className="text-[10px] text-gray-400">Saved on {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
