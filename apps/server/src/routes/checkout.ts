import { Router, Response } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { memoryCache } from "../lib/cache";

import {
    requireAuth,
    AuthRequest,
} from "../middleware/auth";

const router = Router();
const MAX_CART_ITEMS = 7;

function getCartItemCount(items: Array<{ quantity: number }>) {
    return items.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
}

// Helper function to validate coupon details and calculate discount
async function validateCoupon(
    couponCode: string,
    storeId: string,
    userId: string,
    cartTotal: number
): Promise<
    | { valid: true; discountAmount: number; campaignId: string; couponCode: string }
    | { valid: false; error: string }
> {
    if (!couponCode || typeof couponCode !== "string") {
        return { valid: false, error: "Invalid coupon code" };
    }

    const uppercaseCode = couponCode.trim().toUpperCase();

    const campaign = await prisma.saleCampaign.findUnique({
        where: { code: uppercaseCode },
    });

    if (!campaign || campaign.storeId !== storeId) {
        return { valid: false, error: "Coupon is not valid for this store or does not exist" };
    }

    const now = new Date();
    if (!campaign.isActive || now < campaign.startDate || now > campaign.endDate) {
        return { valid: false, error: "Coupon has expired or is not active yet" };
    }

    if (cartTotal < campaign.minOrderValue) {
        return {
            valid: false,
            error: `Order total must be at least ₹${campaign.minOrderValue.toFixed(2)} to use this coupon`,
        };
    }

    if (campaign.globalLimit !== null && campaign.usedCount >= campaign.globalLimit) {
        return { valid: false, error: "Coupon usage limit has been reached" };
    }

    if (campaign.perUserLimit !== null) {
        const userUsageCount = await prisma.booking.count({
            where: {
                userId,
                campaignId: campaign.id,
                status: {
                    notIn: ["REJECTED", "CANCELLED"],
                },
            },
        });

        if (userUsageCount >= campaign.perUserLimit) {
            return {
                valid: false,
                error: `You can only use this coupon a maximum of ${campaign.perUserLimit} time(s)`,
            };
        }
    }

    let discountAmount = 0;
    if (campaign.discountType === "PERCENTAGE") {
        discountAmount = (cartTotal * campaign.discountValue) / 100;
    } else if (campaign.discountType === "FLAT") {
        discountAmount = campaign.discountValue;
    }

    // Discount cannot exceed the cart total
    discountAmount = Math.min(cartTotal, discountAmount);

    return {
        valid: true,
        discountAmount,
        campaignId: campaign.id,
        couponCode: campaign.code,
    };
}

// VALIDATE COUPON CODE
router.post(
    "/:storeId/validate-coupon",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            const storeId = String(req.params.storeId);
            const { couponCode } = req.body ?? {};

            if (!couponCode) {
                return res.status(400).json({
                    error: "couponCode is required",
                });
            }

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

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    error: "Cart is empty",
                });
            }

            const cartTotal = cart.items.reduce(
                (sum, cartItem) => sum + cartItem.item.price * cartItem.quantity,
                0
            );

            const validation = await validateCoupon(
                couponCode,
                storeId,
                req.user!.userId,
                cartTotal
            );

            if (!validation.valid) {
                return res.status(400).json({
                    error: validation.error,
                });
            }

            res.json({
                couponCode: validation.couponCode,
                discountAmount: validation.discountAmount,
                originalTotal: cartTotal,
                finalTotal: cartTotal - validation.discountAmount,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to validate coupon",
            });
        }
    }
);

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

            const { couponCode } = req.body ?? {};

            // Check block status (both global and store-specific)
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                include: {
                    storeBlocks: {
                        where: { storeId }
                    }
                }
            });

            if (!user) {
                return res.status(401).json({
                    error: "User not found",
                });
            }

            if (user.isBlocked) {
                return res.status(403).json({
                    error: "Your account is globally blocked from placing new orders due to uncollected orders or policy violations.",
                });
            }

            if (user.storeBlocks.length > 0) {
                return res.status(403).json({
                    error: "You are blocked from placing orders at this specific store by administrator controls.",
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
            const cartTotal =
                cart.items.reduce(
                    (sum, cartItem) =>
                        sum +
                        cartItem.item.price *
                        cartItem.quantity,
                    0
                );

            // Handle coupon validation if couponCode is provided
            let validationResult: any = null;
            if (couponCode && typeof couponCode === "string" && couponCode.trim() !== "") {
                const validation = await validateCoupon(
                    couponCode,
                    storeId,
                    req.user!.userId,
                    cartTotal
                );

                if (!validation.valid) {
                    return res.status(400).json({
                        error: validation.error,
                    });
                }

                validationResult = validation;
            }

            const discountApplied = validationResult ? validationResult.discountAmount : 0;
            const finalAmount = cartTotal - discountApplied;

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

            // execute entire checkout and state updates atomically inside transaction
            const booking = await prisma.$transaction(async (tx) => {
                // 1. Create booking
                const b = await tx.booking.create({
                    data: {
                        orderNumber,
                        userId: req.user!.userId,
                        storeId: storeId,
                        totalAmount: finalAmount,
                        status: "PLACED",
                        discountApplied: validationResult ? discountApplied : null,
                        appliedCouponCode: validationResult ? validationResult.couponCode : null,
                        campaignId: validationResult ? validationResult.campaignId : null,

                        items: {
                            create: cart.items.map((cartItem) => ({
                                itemId: cartItem.item.id,
                                quantity: cartItem.quantity,
                                unitPrice: cartItem.item.price,
                            })),
                        },
                    },
                    include: {
                        items: true,
                    },
                });

                // 2. Reduce inventory
                for (const cartItem of cart.items) {
                    await tx.item.update({
                        where: {
                            id: cartItem.item.id,
                        },
                        data: {
                            stockQuantity: {
                                decrement: cartItem.quantity,
                            },
                        },
                    });
                }

                // 3. Increment campaign usage count if applied
                if (validationResult) {
                    await tx.saleCampaign.update({
                        where: { id: validationResult.campaignId },
                        data: {
                            usedCount: { increment: 1 },
                        },
                    });
                }

                // 4. Clear cart
                await tx.cartItem.deleteMany({
                    where: {
                        cartId: cart.id,
                    },
                });

                return b;
            });

            memoryCache.invalidateStore(storeId);
            res.json({
                message: "Booking placed successfully",
                booking,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to place booking",
            });
        }
    }
);

export default router;