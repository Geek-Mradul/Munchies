import { Router, Response } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendEmail } from "../lib/email";

const router = Router();

// GET CUSTOMER BOOKING HISTORY
router.get(
    "/",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            const bookings = (await prisma.booking.findMany({
                where: {
                    userId: req.user!.userId,
                },
                include: {
                    store: true,
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            }) as unknown) as Array<{ createdAt: Date }>;

            bookings.sort(
                (left, right) =>
                    right.createdAt.getTime() - left.createdAt.getTime()
            );

            res.json(bookings);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch bookings",
            });
        }
    }
);

// REQUEST CANCELLATION
router.post(
    "/:id/cancel-request",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            const bookingId = String(req.params.id);

            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    store: {
                        include: {
                            owner: true,
                        },
                    },
                    user: true,
                },
            });

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found",
                });
            }

            if (booking.userId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            const eligibleStatuses = ["PLACED", "ACCEPTED", "READY"];
            if (!eligibleStatuses.includes(booking.status)) {
                return res.status(400).json({
                    error: `Cannot request cancellation for booking in ${booking.status} status`,
                });
            }

            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: "CANCEL_REQUESTED",
                    statusBeforeCancel: booking.status,
                },
                include: {
                    store: true,
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });

            // Send notification email to the store owner
            const storeOwnerEmail = booking.store.owner.email;
            const orderNumberText = booking.orderNumber || booking.id.slice(0, 8).toUpperCase();
            if (booking.store.owner.prefBookingNotifications) {
                sendEmail({
                    to: storeOwnerEmail,
                    subject: `Cancellation Request: Order #${orderNumberText}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #fffcf9;">
                            <h2 style="color: #ea580c; margin-top: 0; font-size: 22px; font-weight: 800; border-bottom: 2px solid #ffedd5; padding-bottom: 12px;">Munchies Booking Cancellation Request</h2>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Hello <strong>${booking.store.owner.firstName}</strong>,</p>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">A customer has requested cancellation for <strong>Order #${orderNumberText}</strong> at your store <strong>${booking.store.name}</strong>.</p>
                            
                            <div style="background-color: #fff; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #c2410c; font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</h3>
                                <table style="width: 100%; font-size: 14px; color: #4b5563; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: bold; width: 140px;">Customer Name:</td>
                                        <td style="padding: 4px 0;">${booking.user.firstName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: bold;">Customer Email:</td>
                                        <td style="padding: 4px 0;">${booking.user.email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: bold;">Order Total:</td>
                                        <td style="padding: 4px 0; font-weight: bold; color: #111827;">₹${booking.totalAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0; font-weight: bold;">Original Status:</td>
                                        <td style="padding: 4px 0;"><span style="background-color: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">${booking.status}</span></td>
                                    </tr>
                                </table>
                            </div>

                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Please open your <strong>Store Owner Dashboard</strong> to approve or reject this request.</p>
                            
                            <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 12px; color: #9ca3af; text-align: center;">
                                This is an automated notification from Munchies. Please do not reply directly to this email.
                            </div>
                        </div>
                    `,
                }).catch(err => console.error("[Nodemailer] Background send failed:", err));
            }

            res.json({
                message: "Cancellation request successfully submitted",
                booking: updatedBooking,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to submit cancellation request",
            });
        }
    }
);

// GET USER ANALYTICS
router.get(
    "/analytics",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user!.userId;

            // 1. Total Spending (sum of totalAmount for COMPLETED bookings)
            const completedBookings = await prisma.booking.findMany({
                where: {
                    userId,
                    status: "COMPLETED",
                },
                select: {
                    totalAmount: true,
                    createdAt: true,
                },
            });

            const totalSpending = completedBookings.reduce((sum, b) => sum + b.totalAmount, 0);

            // 2. Total Bookings (count of all bookings)
            const totalBookings = await prisma.booking.count({
                where: {
                    userId,
                },
            });

            // 3. Most frequently ordered store
            const storeCounts = await prisma.booking.groupBy({
                by: ["storeId"],
                where: {
                    userId,
                },
                _count: {
                    _all: true,
                },
            });

            let mostFrequentlyOrderedStore = null;
            if (storeCounts.length > 0) {
                storeCounts.sort((a, b) => b._count._all - a._count._all);
                const favoriteStoreId = storeCounts[0].storeId;

                const store = await prisma.store.findUnique({
                    where: { id: favoriteStoreId },
                    select: { id: true, name: true, hostel: true, roomNumber: true },
                });

                if (store) {
                    mostFrequentlyOrderedStore = {
                        id: store.id,
                        name: store.name,
                        hostel: store.hostel,
                        roomNumber: store.roomNumber,
                        ordersCount: storeCounts[0]._count._all,
                    };
                }
            }

            // 4. Most frequently ordered item
            const itemCounts = await prisma.bookingItem.groupBy({
                by: ["itemId"],
                where: {
                    booking: {
                        userId,
                        status: "COMPLETED",
                    },
                },
                _sum: {
                    quantity: true,
                },
            });

            let mostFrequentlyOrderedItem = null;
            if (itemCounts.length > 0) {
                itemCounts.sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0));
                const favoriteItemId = itemCounts[0].itemId;

                const item = await prisma.item.findUnique({
                    where: { id: favoriteItemId },
                    select: { id: true, name: true },
                });

                if (item) {
                    mostFrequentlyOrderedItem = {
                        id: item.id,
                        name: item.name,
                        totalQuantity: itemCounts[0]._sum.quantity ?? 0,
                    };
                }
            }

            // 5. Monthly spending breakdown (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            const bookingsLastSixMonths = completedBookings.filter(
                (b) => new Date(b.createdAt) >= sixMonthsAgo
            );

            const monthlySpendingBreakdown: { month: string; amount: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthName = d.toLocaleString("default", { month: "short", year: "2-digit" });
                monthlySpendingBreakdown.push({ month: monthName, amount: 0 });
            }

            bookingsLastSixMonths.forEach((b) => {
                const date = new Date(b.createdAt);
                const monthName = date.toLocaleString("default", { month: "short", year: "2-digit" });
                const index = monthlySpendingBreakdown.findIndex((m) => m.month === monthName);
                if (index !== -1) {
                    monthlySpendingBreakdown[index].amount += b.totalAmount;
                }
            });

            res.json({
                totalSpending,
                totalBookings,
                mostFrequentlyOrderedStore,
                mostFrequentlyOrderedItem,
                monthlySpendingBreakdown,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to generate user analytics",
            });
        }
    }
);

export default router;