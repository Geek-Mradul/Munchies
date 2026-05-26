import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();



// GET CART
router.get(
    "/:storeId",
    requireAuth,
    async (req: AuthRequest, res) => {
        try {
            const storeId = String(req.params.storeId);

            const cart = await prisma.cart.findUnique({
                where: {
                    userId_storeId: {
                        userId: req.user!.userId,
                        storeId,
                    },
                },
                include: {
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });

            res.json(cart);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch cart",
            });
        }
    }
);



// ADD ITEM TO CART
router.post(
    "/:storeId/add",
    requireAuth,
    async (req: AuthRequest, res) => {
        try {
            const storeId = String(req.params.storeId);
            const { itemId, quantity } = req.body;

            let cart = await prisma.cart.findUnique({
                where: {
                    userId_storeId: {
                        userId: req.user!.userId,
                        storeId,
                    },
                },
            });

            // create cart if missing
            if (!cart) {
                cart = await prisma.cart.create({
                    data: {
                        userId: req.user!.userId,
                        storeId,
                    },
                });
            }

            const existingCartItem =
                await prisma.cartItem.findUnique({
                    where: {
                        cartId_itemId: {
                            cartId: cart.id,
                            itemId,
                        },
                    },
                });

            // item already in cart
            if (existingCartItem) {
                const updated =
                    await prisma.cartItem.update({
                        where: {
                            id: existingCartItem.id,
                        },
                        data: {
                            quantity:
                                existingCartItem.quantity +
                                quantity,
                        },
                    });

                return res.json(updated);
            }

            // new cart item
            const cartItem =
                await prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        itemId,
                        quantity,
                    },
                });

            res.json(cartItem);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to add item",
            });
        }
    }
);



// UPDATE QUANTITY
router.put(
    "/item/:id",
    requireAuth,
    async (req: AuthRequest, res) => {
        try {
            const itemId = String(req.params.id);
            const { quantity } = req.body;

            const updated =
                await prisma.cartItem.update({
                    where: {
                        id: itemId,
                    },
                    data: {
                        quantity,
                    },
                });

            res.json(updated);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to update cart item",
            });
        }
    }
);



// DELETE CART ITEM
router.delete(
    "/item/:id",
    requireAuth,
    async (req: AuthRequest, res) => {
        try {
            const itemId = String(req.params.id);

            await prisma.cartItem.delete({
                where: {
                    id: itemId,
                },
            });

            res.json({
                message: "Item removed",
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