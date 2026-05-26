import { Router, Response } from "express";

import { prisma } from "../lib/prisma";
import {
    requireAuth,
    requireRole,
    AuthRequest,
} from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get(
    "/store-owner-requests",
    async (req: AuthRequest, res: Response) => {
        try {
            const requests = await prisma.storeOwnerRequest.findMany({
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            res.json(requests);
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to fetch store owner requests",
            });
        }
    }
);

router.post(
    "/store-owner-requests/:id/approve",
    async (req: AuthRequest, res: Response) => {
        try {
            const requestId = String(req.params.id);

            const request = await prisma.storeOwnerRequest.findUnique({
                where: {
                    id: requestId,
                },
            });

            if (!request) {
                return res.status(404).json({
                    error: "Request not found",
                });
            }

            if (request.status !== "PENDING") {
                return res.status(400).json({
                    error: "Request has already been processed",
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                const updatedRequest = await tx.storeOwnerRequest.update({
                    where: {
                        id: requestId,
                    },
                    data: {
                        status: "APPROVED",
                    },
                });

                const updatedUser = await tx.user.update({
                    where: {
                        id: request.userId,
                    },
                    data: {
                        role: "STORE_OWNER",
                    },
                });

                return {
                    updatedRequest,
                    updatedUser,
                };
            });

            res.json({
                message: "Request approved",
                request: result.updatedRequest,
                user: {
                    id: result.updatedUser.id,
                    email: result.updatedUser.email,
                    firstName: result.updatedUser.firstName,
                    role: result.updatedUser.role,
                },
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to approve request",
            });
        }
    }
);

router.post(
    "/store-owner-requests/:id/reject",
    async (req: AuthRequest, res: Response) => {
        try {
            const requestId = String(req.params.id);

            const request = await prisma.storeOwnerRequest.findUnique({
                where: {
                    id: requestId,
                },
            });

            if (!request) {
                return res.status(404).json({
                    error: "Request not found",
                });
            }

            if (request.status !== "PENDING") {
                return res.status(400).json({
                    error: "Request has already been processed",
                });
            }

            const updatedRequest = await prisma.storeOwnerRequest.update({
                where: {
                    id: requestId,
                },
                data: {
                    status: "REJECTED",
                },
            });

            res.json({
                message: "Request rejected",
                request: updatedRequest,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Failed to reject request",
            });
        }
    }
);

export default router;
