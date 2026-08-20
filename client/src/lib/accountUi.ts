export function getAccountEmptyStateMessage(kind: "orders" | "configurations") {
  return kind === "orders"
    ? { title: "Your collection is waiting", description: "Your first order will appear here once it is placed." }
    : { title: "No saved designs yet", description: "Visit Custom Studio to create and save a piece." };
}
