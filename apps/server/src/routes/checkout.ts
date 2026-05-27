import { Router, Response } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";

import {
    requireAuth,
    AuthRequest,
} from "../middleware/auth";

const router = Router();
const MAX_CART_ITEMS = 7;

function getCartItemCount(items: Array<{ quantity: number }>) {
    return items.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
}



// CREATE BOOKING FROM CART
router.post(
    "/:storeId",
    requireAuth,
    async (
        req: AuthRequest,
        res: Response
    ) => {
        try {
            const storeId = Array.isArray(req.params.storeId)
                ? req.params.storeId[0]
                : req.params.storeId;

            if (!storeId) {
                return res.status(400).json({
                    error: "Store id is required",
                });
            }

            const cart =
                await prisma.cart.findUnique({
                    where: {
                        userId_storeId: {
                            userId:
                                req.user!.userId,
                            storeId:
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

            if (
                !cart ||
                cart.items.length === 0
            ) {
                return res.status(400).json({
                    error: "Cart is empty",
                });
            }

            const totalItems = getCartItemCount(cart.items);

            if (totalItems > MAX_CART_ITEMS) {
                return res.status(400).json({
                    error: "A cart can contain at most 7 items",
                });
            }

            for (const cartItem of cart.items) {
                if (cartItem.quantity <= 0) {
                    return res.status(400).json({
                        error: `Invalid quantity for ${cartItem.item.name}`,
                    });
                }

                if (cartItem.quantity > cartItem.item.stockQuantity) {
                    return res.status(400).json({
                        error: `${cartItem.item.name} does not have enough stock`,
                    });
                }
            }

            // calculate total
            const totalAmount =
                cart.items.reduce(
                    (sum, cartItem) =>
                        sum +
                        cartItem.item.price *
                        cartItem.quantity,
                    0
                );

            // Generate sequential order number A01 → A99 → B01 → ... → Z99
            const lastBooking = await prisma.booking.findFirst({
                orderBy: { createdAt: "desc" },
                select: { orderNumber: true },
            });

            let orderNumber = "A01";
            if (lastBooking?.orderNumber) {
                const letter = lastBooking.orderNumber.charAt(0);
                const num = parseInt(lastBooking.orderNumber.slice(1), 10);
                if (num < 99) {
                    orderNumber = `${letter}${String(num + 1).padStart(2, "0")}`;
                } else {
                    const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
                    orderNumber = nextLetter <= "Z" ? `${nextLetter}01` : "A01";
                }
            }

            // create booking
            const booking =
                await prisma.booking.create({
                    data: {
                        orderNumber,
                        userId:
                            req.user!.userId,
                        storeId:
                            storeId,
                        totalAmount,
                        status: "PLACED",

                        items: {
                            create:
                                cart.items.map(
                                    (cartItem) => ({
                                        itemId:
                                            cartItem.item.id,

                                        quantity:
                                            cartItem.quantity,

                                        unitPrice:
                                            cartItem.item.price,
                                    })
                                ),
                        },
                    },

                    include: {
                        items: true,
                    },
                });

            // reduce inventory
            for (const cartItem of cart.items) {
                await prisma.item.update({
                    where: {
                        id: cartItem.item.id,
                    },

                    data: {
                        stockQuantity: {
                            decrement:
                                cartItem.quantity,
                        },
                    },
                });
            }

            // clear cart
            await prisma.cartItem.deleteMany({
                where: {
                    cartId: cart.id,
                },
            });

            res.json({
                message:
                    "Booking placed successfully",
                booking,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    "Failed to place booking",
            });
        }
    }
);

export default router;