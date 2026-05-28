import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { sendEmail } from "../lib/email";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname) || ".jpg";
        const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        callback(null, safeName);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
            callback(new Error("Only image uploads are allowed"));
            return;
        }

        callback(null, true);
    },
});

const bookingStatusTransitions: Record<
    BookingStatus,
    BookingStatus[]
> = {
    PLACED: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["READY", "REJECTED"],
    READY: ["COMPLETED"],
    REJECTED: [],
    COMPLETED: [],
    CANCEL_REQUESTED: ["CANCELLED", "PLACED", "ACCEPTED", "READY"],
    CANCELLED: [],
};

router.get(
    "/bookings",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const stores = await prisma.store.findMany({
                where: {
                    ownerId: req.user!.userId,
                },
                select: {
                    id: true,
                },
            });

            const ownedStoreIds = stores.map((store) => store.id);

            if (ownedStoreIds.length === 0) {
                return res.json([]);
            }

            const bookings = (await prisma.booking.findMany({
                where: {
                    storeId: {
                        in: ownedStoreIds,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            email: true,
                        },
                    },
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
                error: "Failed to fetch owner bookings",
            });
        }
    }
);

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

router.post(
    "/bookings/:id/status",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const bookingId = String(req.params.id);
            const { status } = req.body ?? {};

            if (!status || !Object.keys(bookingStatusTransitions).includes(status)) {
                return res.status(400).json({
                    error: "Valid booking status is required",
                });
            }

            const booking = await prisma.booking.findUnique({
                where: {
                    id: bookingId,
                },
                include: {
                    store: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found",
                });
            }

            if (booking.store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            const allowedStatuses = bookingStatusTransitions[booking.status];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    error: "Booking status transition is not allowed",
                });
            }

            const updatedBooking = await prisma.booking.update({
                where: {
                    id: bookingId,
                },
                data: {
                    status,
                    ...(status === "READY" ? { readyAt: new Date() } : {}),
                },
                include: {
                    store: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            email: true,
                        },
                    },
                    items: {
                        include: {
                            item: true,
                        },
                    },
                },
            });

            res.json({
                message: "Booking status updated",
                booking: updatedBooking,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to update booking status",
            });
        }
    }
);

// CREATE ITEM
router.post(
    "/items",
    requireAuth,
    requireRole("STORE_OWNER"),
    upload.single("image"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { storeId, name, price, stockQuantity } = req.body;
            const uploadedFile = req.file;

            if (!uploadedFile) {
                return res.status(400).json({
                    error: "Item image is required",
                });
            }

            const numericPrice = Number(price);
            const numericStockQuantity = Number(stockQuantity);

            if (!storeId || !name || Number.isNaN(numericPrice) || Number.isNaN(numericStockQuantity)) {
                return res.status(400).json({
                    error: "Valid store, name, price, and stock quantity are required",
                });
            }

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
                    price: numericPrice,
                    imageUrl: `/uploads/${uploadedFile.filename}`,
                    stockQuantity: numericStockQuantity,
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
    upload.single("image"),
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

            const { name, price, stockQuantity } = req.body;
            const nextPrice = price !== undefined ? Number(price) : item.price;
            const nextStockQuantity =
                stockQuantity !== undefined ? Number(stockQuantity) : item.stockQuantity;

            if ((price !== undefined && Number.isNaN(nextPrice)) || (stockQuantity !== undefined && Number.isNaN(nextStockQuantity))) {
                return res.status(400).json({
                    error: "Price and stock quantity must be numbers",
                });
            }

            const nextImageUrl = req.file ? `/uploads/${req.file.filename}` : item.imageUrl;

            const updatedItem = await prisma.item.update({
                where: {
                    id: itemId,
                },
                data: {
                    ...(name ? { name } : {}),
                    price: nextPrice,
                    stockQuantity: nextStockQuantity,
                    imageUrl: nextImageUrl,
                },
            });

            res.json(updatedItem);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to update item",
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

// STORE OWNER RESPOND TO CANCELLATION REQUEST
router.post(
    "/bookings/:id/cancel-respond",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const bookingId = String(req.params.id);
            const { action } = req.body ?? {};

            if (action !== "approve" && action !== "reject") {
                return res.status(400).json({
                    error: "Action must be either 'approve' or 'reject'",
                });
            }

            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    store: true,
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            email: true,
                        },
                    },
                },
            });

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found",
                });
            }

            if (booking.store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            if (booking.status !== "CANCEL_REQUESTED") {
                return res.status(400).json({
                    error: "Booking is not in CANCEL_REQUESTED status",
                });
            }

            let updatedBooking;

            if (action === "approve") {
                updatedBooking = await prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: "CANCELLED",
                    },
                    include: {
                        store: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                email: true,
                                prefBookingNotifications: true,
                            },
                        },
                        items: {
                            include: {
                                item: true,
                            },
                        },
                    },
                });

                // Send email to customer notifying them of approval
                const orderNumberText = booking.orderNumber || booking.id.slice(0, 8).toUpperCase();
                if (updatedBooking.user.prefBookingNotifications) {
                    sendEmail({
                        to: updatedBooking.user.email,
                        subject: `Cancellation Approved: Order #${orderNumberText}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #fcfcfc;">
                                <h2 style="color: #10b981; margin-top: 0; font-size: 22px; font-weight: 800; border-bottom: 2px solid #ecfdf5; padding-bottom: 12px;">Munchies Booking Cancelled</h2>
                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">Hello <strong>${updatedBooking.user.firstName}</strong>,</p>
                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">Your cancellation request for <strong>Order #${orderNumberText}</strong> at <strong>${updatedBooking.store.name}</strong> has been approved by the store owner.</p>
                                
                                <div style="background-color: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
                                    <span style="font-size: 16px; font-weight: bold; color: #065f46;">Order Cancelled Successfully</span>
                                </div>

                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">The store owner has acknowledged and cancelled this booking. You will not be charged, and no food will be prepared.</p>
                                
                                <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 12px; color: #9ca3af; text-align: center;">
                                    This is an automated notification from Munchies. Please do not reply directly to this email.
                                </div>
                            </div>
                        `,
                    }).catch(err => console.error("[Nodemailer] Background send failed:", err));
                }
            } else {
                const restoredStatus = booking.statusBeforeCancel || "ACCEPTED";
                updatedBooking = await prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: restoredStatus,
                        statusBeforeCancel: null,
                    },
                    include: {
                        store: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                email: true,
                                prefBookingNotifications: true,
                            },
                        },
                        items: {
                            include: {
                                item: true,
                            },
                        },
                    },
                });

                // Send email to customer notifying them of rejection
                const orderNumberText = booking.orderNumber || booking.id.slice(0, 8).toUpperCase();
                if (updatedBooking.user.prefBookingNotifications) {
                    sendEmail({
                        to: updatedBooking.user.email,
                        subject: `Cancellation Request Update: Order #${orderNumberText}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #fffcfc;">
                                <h2 style="color: #ea580c; margin-top: 0; font-size: 22px; font-weight: 800; border-bottom: 2px solid #fee2e2; padding-bottom: 12px;">Munchies Cancellation Request Update</h2>
                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">Hello <strong>${updatedBooking.user.firstName}</strong>,</p>
                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">Your cancellation request for <strong>Order #${orderNumberText}</strong> at <strong>${updatedBooking.store.name}</strong> was reviewed by the store owner and has been <strong>rejected</strong>.</p>
                                
                                <div style="background-color: #fff5f5; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
                                    <span style="font-size: 15px; font-weight: bold; color: #991b1b;">Cancellation Request Declined</span>
                                    <p style="margin: 6px 0 0 0; font-size: 14px; color: #7f1d1d;">Your order is being prepared and is currently in <strong style="text-transform: uppercase;">${restoredStatus}</strong> status.</p>
                                </div>

                                <p style="font-size: 15px; color: #374151; line-height: 1.6;">The store owner is proceeding with your order as scheduled. Please get ready to collect your munchies!</p>
                                
                                <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 12px; color: #9ca3af; text-align: center;">
                                    This is an automated notification from Munchies. Please do not reply directly to this email.
                                </div>
                            </div>
                        `,
                    }).catch(err => console.error("[Nodemailer] Background send failed:", err));
                }
            }

            res.json({
                message: `Cancellation request ${action}ed successfully`,
                booking: updatedBooking,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to respond to cancellation request",
            });
        }
    }
);

// Helper function to generate a unique coupon code
async function generateUniqueCouponCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
        const code = `MC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const existing = await prisma.saleCampaign.findUnique({
            where: { code }
        });
        if (!existing) {
            return code;
        }
        attempts++;
    }
    throw new Error("Failed to generate unique coupon code");
}

// CREATE SALE CAMPAIGN
router.post(
    "/campaigns",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const {
                storeId,
                code,
                discountType,
                discountValue,
                startDate,
                endDate,
                minOrderValue,
                globalLimit,
                perUserLimit,
            } = req.body;

            if (!storeId || !discountType || discountValue === undefined || !startDate || !endDate) {
                return res.status(400).json({
                    error: "storeId, discountType, discountValue, startDate, and endDate are required",
                });
            }

            if (discountType !== "PERCENTAGE" && discountType !== "FLAT") {
                return res.status(400).json({
                    error: "discountType must be either PERCENTAGE or FLAT",
                });
            }

            const parsedDiscountValue = Number(discountValue);
            if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
                return res.status(400).json({
                    error: "discountValue must be a positive number",
                });
            }

            if (discountType === "PERCENTAGE" && parsedDiscountValue > 100) {
                return res.status(400).json({
                    error: "PERCENTAGE discount cannot exceed 100%",
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return res.status(400).json({
                    error: "Invalid startDate or endDate format",
                });
            }

            if (start >= end) {
                return res.status(400).json({
                    error: "startDate must be before endDate",
                });
            }

            const parsedMinOrderValue = minOrderValue !== undefined ? Number(minOrderValue) : 0;
            if (Number.isNaN(parsedMinOrderValue) || parsedMinOrderValue < 0) {
                return res.status(400).json({
                    error: "minOrderValue must be a non-negative number",
                });
            }

            const parsedGlobalLimit = globalLimit !== undefined ? Number(globalLimit) : null;
            if (parsedGlobalLimit !== null && (Number.isNaN(parsedGlobalLimit) || !Number.isInteger(parsedGlobalLimit) || parsedGlobalLimit <= 0)) {
                return res.status(400).json({
                    error: "globalLimit must be a positive integer",
                });
            }

            const parsedPerUserLimit = perUserLimit !== undefined ? Number(perUserLimit) : null;
            if (parsedPerUserLimit !== null && (Number.isNaN(parsedPerUserLimit) || !Number.isInteger(parsedPerUserLimit) || parsedPerUserLimit <= 0)) {
                return res.status(400).json({
                    error: "perUserLimit must be a positive integer",
                });
            }

            // Verify store ownership
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

            // Determine/validate coupon code
            let finalCode = "";
            if (code && typeof code === "string" && code.trim() !== "") {
                finalCode = code.trim().toUpperCase();
                // Validate uniqueness
                const existing = await prisma.saleCampaign.findUnique({
                    where: { code: finalCode },
                });
                if (existing) {
                    return res.status(400).json({
                        error: `Coupon code '${finalCode}' is already in use`,
                    });
                }
            } else {
                finalCode = await generateUniqueCouponCode();
            }

            const now = new Date();
            const isActive = now >= start && now <= end;

            const campaign = await prisma.saleCampaign.create({
                data: {
                    storeId,
                    code: finalCode,
                    discountType,
                    discountValue: parsedDiscountValue,
                    startDate: start,
                    endDate: end,
                    minOrderValue: parsedMinOrderValue,
                    globalLimit: parsedGlobalLimit,
                    perUserLimit: parsedPerUserLimit,
                    isActive,
                },
            });

            // Dispatch "New Promo Alert" email to subscribed users
            const storeName = store ? store.name : "Munchies Store";

            const subscribedUsers = await prisma.user.findMany({
                where: {
                    prefPromoAlerts: true,
                },
                select: {
                    email: true,
                    firstName: true,
                },
            });

            const discountText = campaign.discountType === "PERCENTAGE" ? `${campaign.discountValue}%` : `₹${campaign.discountValue}`;

            for (const user of subscribedUsers) {
                sendEmail({
                    to: user.email,
                    subject: `New Promo: Save ${discountText} at ${storeName}! 🎁`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #fffafb;">
                            <h2 style="color: #e11d48; margin-top: 0; font-size: 22px; font-weight: 800; border-bottom: 2px solid #ffe4e6; padding-bottom: 12px;">New Promotion Alert! 🎁</h2>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Hello <strong>${user.firstName || "Customer"}</strong>,</p>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">A new sale campaign has been launched at <strong>${storeName}</strong>! You can now get <strong>${discountText} off</strong> your next order!</p>
                            
                            <div style="background-color: #fff; border: 1px solid #fda4af; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
                                <span style="font-size: 12px; font-weight: 800; color: #e11d48; text-transform: uppercase; tracking-wider: 0.1em; display: block; margin-bottom: 4px;">Use Coupon Code</span>
                                <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: 0.05em; text-transform: uppercase;">${campaign.code}</span>
                                <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">Min Order Value: ₹${campaign.minOrderValue.toFixed(2)}</p>
                            </div>

                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Make sure to apply the coupon code during your checkout to claim your savings. Offer valid until ${new Date(campaign.endDate).toLocaleDateString()}.</p>
                            
                            <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 12px; color: #9ca3af; text-align: center;">
                                You received this email because you are subscribed to promotional alerts. To manage your subscriptions, visit your account preferences in the app.
                            </div>
                        </div>
                    `,
                }).catch((err) => console.error(`[Nodemailer] Failed to send promotional alert to ${user.email}:`, err));
            }

            res.json(campaign);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to create campaign",
            });
        }
    }
);

// LIST CAMPAIGNS FOR STORE OWNER
router.get(
    "/campaigns",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const stores = await prisma.store.findMany({
                where: {
                    ownerId: req.user!.userId,
                },
                select: {
                    id: true,
                },
            });

            const storeIds = stores.map((s) => s.id);
            if (storeIds.length === 0) {
                return res.json([]);
            }

            const campaigns = await prisma.saleCampaign.findMany({
                where: {
                    storeId: {
                        in: storeIds,
                    },
                },
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            res.json(campaigns);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to fetch campaigns",
            });
        }
    }
);

// GET CAMPAIGN BY ID
router.get(
    "/campaigns/:id",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const campaignId = String(req.params.id);

            const campaign = await prisma.saleCampaign.findUnique({
                where: { id: campaignId },
                include: {
                    store: true,
                },
            });

            if (!campaign) {
                return res.status(404).json({
                    error: "Campaign not found",
                });
            }

            if (campaign.store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            res.json(campaign);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to fetch campaign details",
            });
        }
    }
);

// DELETE CAMPAIGN BY ID
router.delete(
    "/campaigns/:id",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const campaignId = String(req.params.id);

            const campaign = await prisma.saleCampaign.findUnique({
                where: { id: campaignId },
                include: {
                    store: true,
                },
            });

            if (!campaign) {
                return res.status(404).json({
                    error: "Campaign not found",
                });
            }

            if (campaign.store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            await prisma.saleCampaign.delete({
                where: { id: campaignId },
            });

            res.json({
                message: "Campaign successfully deleted",
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to delete campaign",
            });
        }
    }
);

// POST /stores/:id/announce
router.post(
    "/stores/:id/announce",
    requireAuth,
    requireRole("STORE_OWNER"),
    async (req: AuthRequest, res: Response) => {
        try {
            const storeId = String(req.params.id);

            const store = await prisma.store.findUnique({
                where: { id: storeId },
            });

            if (!store) {
                return res.status(404).json({
                    error: "Store not found",
                });
            }

            if (store.ownerId !== req.user!.userId) {
                return res.status(403).json({
                    error: "Unauthorized",
                });
            }

            if (store.announcementSent) {
                return res.status(400).json({
                    error: "A launch announcement has already been broadcasted for this store",
                });
            }

            // Verify if within 7 days of store creation
            const diffTime = Date.now() - store.createdAt.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays > 7) {
                return res.status(400).json({
                    error: "Launch announcements can only be sent within 7 days of store activation",
                });
            }

            // Get all subscribed users
            const subscribedUsers = await prisma.user.findMany({
                where: {
                    prefNewStoreNotifications: true,
                },
                select: {
                    email: true,
                    firstName: true,
                },
            });

            // Send launch email using Nodemailer
            for (const user of subscribedUsers) {
                sendEmail({
                    to: user.email,
                    subject: `New Store Alert: ${store.name} is now open! 🥳`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #fffaf5;">
                            <h2 style="color: #ea580c; margin-top: 0; font-size: 22px; font-weight: 800; border-bottom: 2px solid #ffedd5; padding-bottom: 12px;">New Munchies Spot! 🥳</h2>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Hello <strong>${user.firstName || "Customer"}</strong>,</p>
                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">We are thrilled to announce that a brand new store <strong>${store.name}</strong> is now open at <strong>${store.hostel}</strong>, Room <strong>${store.roomNumber}</strong>!</p>
                            
                            <div style="background-color: #fff; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
                                <span style="font-size: 18px; font-weight: 800; color: #ea580c;">${store.name}</span>
                                <p style="margin: 6px 0 0 0; font-size: 14px; color: #4b5563;">Located at ${store.hostel}, Room ${store.roomNumber}</p>
                            </div>

                            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Head over to the Munchies app now to explore their fresh menu and place your first booking!</p>
                            
                            <div style="margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 15px; font-size: 12px; color: #9ca3af; text-align: center;">
                                You received this email because you are subscribed to new store alerts. To manage your subscriptions, visit your account preferences in the app.
                            </div>
                        </div>
                    `,
                }).catch((err) => console.error(`[Nodemailer] Failed to send new store notification to ${user.email}:`, err));
            }

            // Set announcementSent = true
            const updatedStore = await prisma.store.update({
                where: { id: storeId },
                data: {
                    announcementSent: true,
                },
            });

            res.json({
                message: "Launch announcement successfully sent to all campus subscribers",
                store: updatedStore,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to dispatch store announcement",
            });
        }
    }
);

export default router;