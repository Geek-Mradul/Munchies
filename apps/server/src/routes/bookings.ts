import { Router, Response } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

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

export default router;