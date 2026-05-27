import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

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

export default router;