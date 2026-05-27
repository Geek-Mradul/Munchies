import { Router } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
const MAX_CART_ITEMS = 7;

function getCartItemCount(items: Array<{ quantity: number }>) {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}



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
            const itemId = String(req.body?.itemId ?? "");
            const quantity = Number(req.body?.quantity ?? 0);

            if (!itemId || !Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    error: "Valid item and quantity are required",
                });
            }

            const item = await prisma.item.findFirst({
                where: {
                    id: itemId,
                    storeId,
                },
                select: {
                    id: true,
                    stockQuantity: true,
                },
            });

            if (!item) {
                return res.status(404).json({
                    error: "Item not found",
                });
            }

            if (item.stockQuantity <= 0) {
                return res.status(400).json({
                    error: "Item is sold out",
                });
            }

            let cart = await prisma.cart.findUnique({
                where: {
                    userId_storeId: {
                        userId: req.user!.userId,
                        storeId,
                    },
                },
                include: {
                    items: true,
                },
            });

            // create cart if missing
            if (!cart) {
                cart = await prisma.cart.create({
                    data: {
                        userId: req.user!.userId,
                        storeId,
                    },
                    include: {
                        items: true,
                    },
                });
            }

            const existingCartItem = cart.items.find(
                (cartItem) => cartItem.itemId === itemId
            );

            const currentCartItems = getCartItemCount(cart.items);
            const nextQuantity = (existingCartItem?.quantity ?? 0) + quantity;

            if (nextQuantity > item.stockQuantity) {
                return res.status(400).json({
                    error: "Not enough stock available",
                });
            }

            if (currentCartItems + quantity > MAX_CART_ITEMS) {
                return res.status(400).json({
                    error: "A cart can contain at most 7 items",
                });
            }

            // item already in cart
            if (existingCartItem) {
                const updated =
                    await prisma.cartItem.update({
                        where: {
                            id: existingCartItem.id,
                        },
                        data: {
                            quantity: nextQuantity,
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
            const quantity = Number(req.body?.quantity ?? 0);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    error: "Quantity must be a positive whole number",
                });
            }

            const cartItem = await prisma.cartItem.findUnique({
                where: {
                    id: itemId,
                },
                include: {
                    cart: {
                        include: {
                            items: true,
                        },
                    },
                    item: true,
                },
            });

            if (!cartItem) {
                return res.status(404).json({
                    error: "Cart item not found",
                });
            }

            if (cartItem.cart.userId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            if (quantity > cartItem.item.stockQuantity) {
                return res.status(400).json({
                    error: "Not enough stock available",
                });
            }

            const nextTotalItems =
                getCartItemCount(cartItem.cart.items) - cartItem.quantity + quantity;

            if (nextTotalItems > MAX_CART_ITEMS) {
                return res.status(400).json({
                    error: "A cart can contain at most 7 items",
                });
            }

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