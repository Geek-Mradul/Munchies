import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

router.get(
    "/items",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const stores = await prisma.store.findMany({
                where: {
                    ownerId: req.user!.userId,
                },
                include: {
                    items: {
                        orderBy: {
                            name: "asc",
                        },
                    },
                },
            });

            res.json(stores);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch inventory",
            });
        }
    }
);

// CREATE ITEM
router.post(
    "/items",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { storeId, name, price, imageUrl, stockQuantity } =
                req.body;

            const store = await prisma.store.findFirst({
                where: {
                    id: storeId,
                    ownerId: req.user!.userId,
                },
            });

            if (!store) {
                return res.status(403).json({
                    error: "Store not found or unauthorized",
                });
            }

            const item = await prisma.item.create({
                data: {
                    storeId,
                    name,
                    price,
                    imageUrl,
                    stockQuantity,
                },
            });

            res.json(item);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to create item",
            });
        }
    }
);



// UPDATE ITEM
router.put(
    "/items/:id",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const itemId = String(req.params.id);

            const item = await prisma.item.findUnique({
                where: {
                    id: itemId,
                },
            });

            if (!item) {
                return res.status(404).json({
                    error: "Item not found",
                });
            }

            const store = await prisma.store.findUnique({
                where: { id: item.storeId },
            });

            if (!store || store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            const updatedItem = await prisma.item.update({
                where: {
                    id: itemId,
                },
                data: req.body,
            });

            res.json(updatedItem);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to update item",
            });
        }
    }
);



// DELETE ITEM
router.delete(
    "/items/:id",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const itemId = String(req.params.id);

            const item = await prisma.item.findUnique({
                where: {
                    id: itemId,
                },
            });

            if (!item) {
                return res.status(404).json({
                    error: "Item not found",
                });
            }

            const store = await prisma.store.findUnique({
                where: { id: item.storeId },
            });

            if (!store || store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            await prisma.item.delete({
                where: {
                    id: itemId,
                },
            });

            res.json({
                message: "Item deleted",
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to delete item",
            });
        }
    }
);

export default router;