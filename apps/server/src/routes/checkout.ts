import { Router, Response } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";

import {
    requireAuth,
    AuthRequest,
} from "../middleware/auth";

const router = Router();



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

            // calculate total
            const totalAmount =
                cart.items.reduce(
                    (sum, cartItem) =>
                        sum +
                        cartItem.item.price *
                        cartItem.quantity,
                    0
                );

            // create booking
            const booking =
                await prisma.booking.create({
                    data: {
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