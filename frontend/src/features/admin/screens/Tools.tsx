"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import AdminShell from "../AdminShell";
import { Button, Card, EmptyState, FilterBar, Notice, PageHead, Stack, TableWrap } from "../ui";

type Group = "products" | "collections" | "placements";

/**
 * The danger zone.
 *
 * Deletions live on their own screen rather than scattered through the admin,
 * behind a typed confirmation, so nothing irreversible happens by muscle
 * memory on a list page.
 */
export default function Tools() {
  const utils = trpc.useUtils();
  const products = trpc.admin.listProducts.useQuery(undefined, { retry: false });
  const collections = trpc.admin.listSeries.useQuery(undefined, { retry: false });
  const placements = trpc.admin.listPlacements.useQuery(undefined, { retry: false });

  const deleteProduct = trpc.admin.deleteProduct.useMutation();
  const deleteSeries = trpc.admin.deleteSeries.useMutation();
  const deletePlacement = trpc.admin.deletePlacement.useMutation();

  const [group, setGroup] = useState<Group>("products");
  const [confirmText, setConfirmText] = useState("");
  const [target, setTarget] = useState<{ id: number; name: string } | null>(null);

  const databaseReady = Boolean(products.data) && !products.error && !collections.error && !placements.error;
  const busy = deleteProduct.isPending || deleteSeries.isPending || deletePlacement.isPending;

  const groups = useMemo(
    () => ({
      products: {
        label: "Products",
        items: (products.data ?? []).map(row => ({ id: row.id, name: row.name })),
        remove: (id: number) => deleteProduct.mutateAsync({ id }),
        after: () =>
          Promise.all([
            utils.admin.listProducts.invalidate(),
            utils.admin.listVariants.invalidate(),
            utils.admin.listPlacements.invalidate(),
            utils.commerce.getProducts.invalidate(),
          ]),
        warning: "Deleting a product also removes its variants, its options and any storefront placement pointing at it.",
      },
      collections: {
        label: "Collections",
        items: (collections.data ?? []).map(row => ({ id: row.id, name: row.name })),
        remove: (id: number) => deleteSeries.mutateAsync({ id }),
        after: () =>
          Promise.all([
            utils.admin.listSeries.invalidate(),
            utils.admin.listPlacements.invalidate(),
            utils.commerce.getSeries.invalidate(),
          ]),
        warning: "A collection with products still in it cannot be deleted. Move or delete those products first.",
      },
      placements: {
        label: "Storefront placements",
        items: (placements.data ?? []).map(row => ({ id: row.id, name: row.heading || row.slot })),
        remove: (id: number) => deletePlacement.mutateAsync({ id }),
        after: () => Promise.all([utils.admin.listPlacements.invalidate(), utils.commerce.getPlacements.invalidate()]),
        warning: "The storefront falls back to its built-in content wherever a placement is removed.",
      },
    }),
    [products.data, collections.data, placements.data, deleteProduct, deleteSeries, deletePlacement, utils],
  );

  const active = groups[group];

  const confirmAndDelete = async () => {
    if (!target || !databaseReady) return;
    if (confirmText !== target.name) {
      toast.error("Type the exact name to confirm");
      return;
    }
    try {
      await active.remove(target.id);
      await active.after();
      setTarget(null);
      setConfirmText("");
      toast.success("Record deleted");
    } catch (error) {
      toast.error("Record could not be deleted", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <AdminShell title="Danger zone" breadcrumb="Tools">
      <PageHead
        title="Danger zone"
        description="Permanent deletions, gathered in one place and behind a typed confirmation."
      />

      <Stack gap={16}>
        <Notice tone="error" title="Nothing here can be undone.">
          There is no trash and no restore. Export or note anything you might want back before deleting it.
        </Notice>

        {!databaseReady ? (
          <Notice tone="warning" title="The database is not connected.">
            These controls stay disabled until data storage is live.
          </Notice>
        ) : null}

        {target ? (
          <Card title={`Delete “${target.name}”?`}>
            <Stack gap={12}>
              <p className="sfa-help">{active.warning}</p>
              <label className="sfa-label" htmlFor="confirm-name">
                Type <strong>{target.name}</strong> to confirm
              </label>
              <input
                id="confirm-name"
                className="sfa-input"
                value={confirmText}
                autoComplete="off"
                onChange={event => setConfirmText(event.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="danger"
                  icon={Trash2}
                  disabled={busy || confirmText !== target.name}
                  onClick={() => void confirmAndDelete()}
                >
                  Delete permanently
                </Button>
                <Button
                  onClick={() => {
                    setTarget(null);
                    setConfirmText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Stack>
          </Card>
        ) : null}

        <Card flush title="Records">
          <div style={{ padding: "12px 16px 0" }}>
            <FilterBar
              value={group}
              onChange={next => {
                setGroup(next);
                setTarget(null);
                setConfirmText("");
              }}
              options={[
                { value: "products", label: "Products", count: groups.products.items.length },
                { value: "collections", label: "Collections", count: groups.collections.items.length },
                { value: "placements", label: "Placements", count: groups.placements.items.length },
              ]}
            />
          </div>

          {active.items.length === 0 ? (
            <EmptyState title="Nothing to delete here" icon={AlertTriangle} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{active.label}</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {active.items.map(item => (
                  <tr key={item.id}>
                    <td className="sfa-table__primary">{item.name}</td>
                    <td>
                      <div className="sfa-row-actions">
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          disabled={!databaseReady || busy}
                          onClick={() => {
                            setTarget(item);
                            setConfirmText("");
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      </Stack>
    </AdminShell>
  );
}
