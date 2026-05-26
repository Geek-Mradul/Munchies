import { Router, Response } from "express";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.post(
    "/",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            if (req.user!.role === "STORE_OWNER") {
                return res.status(400).json({
                    error: "You are already a store owner",
                });
            }

            if (req.user!.role === "ADMIN") {
                return res.status(400).json({
                    error: "Admins cannot submit this request",
                });
            }

            const existingPendingRequest = await prisma.storeOwnerRequest.findFirst({
                where: {
                    userId: req.user!.userId,
                    status: "PENDING",
                },
            });

            if (existingPendingRequest) {
                return res.status(400).json({
                    error: "You already have a pending request",
                });
            }

            const request = await prisma.storeOwnerRequest.create({
                data: {
                    userId: req.user!.userId,
                    status: "PENDING",
                },
            });

            res.json({
                message: "Store owner request submitted",
                request,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to submit store owner request",
            });
        }
    }
);

export default router;
