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

// GET ALL REGISTERED USERS
router.get(
    "/users",
    async (req: AuthRequest, res: Response) => {
        try {
            const users = await prisma.user.findMany({
                where: {
                    role: {
                        not: "ADMIN",
                    },
                },
                orderBy: {
                    firstName: "asc",
                },
                select: {
                    id: true,
                    firstName: true,
                    email: true,
                    role: true,
                    warningsCount: true,
                    isBlocked: true,
                    storeBlocks: {
                        include: {
                            store: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            res.json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to fetch users",
            });
        }
    }
);

// GLOBAL USER BLOCK / UNBLOCK
router.post(
    "/users/:id/block",
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = String(req.params.id);
            const { isBlocked } = req.body ?? {};

            if (typeof isBlocked !== "boolean") {
                return res.status(400).json({
                    error: "isBlocked parameter must be a boolean",
                });
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { isBlocked },
                select: {
                    id: true,
                    firstName: true,
                    email: true,
                    isBlocked: true,
                },
            });

            res.json({
                message: `User globally ${isBlocked ? "blocked" : "unblocked"} successfully`,
                user: updatedUser,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to update global block status",
            });
        }
    }
);

// STORE-SPECIFIC USER BLOCK / UNBLOCK
router.post(
    "/users/:id/store-block",
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = String(req.params.id);
            const { storeId, isBlocked } = req.body ?? {};

            if (!storeId) {
                return res.status(400).json({
                    error: "storeId is required",
                });
            }

            if (typeof isBlocked !== "boolean") {
                return res.status(400).json({
                    error: "isBlocked parameter must be a boolean",
                });
            }

            if (isBlocked) {
                // Upsert to enforce store specific block
                await prisma.storeBlock.upsert({
                    where: {
                        userId_storeId: {
                            userId,
                            storeId,
                        },
                    },
                    update: {},
                    create: {
                        userId,
                        storeId,
                    },
                });
            } else {
                // Delete store specific block
                await prisma.storeBlock.deleteMany({
                    where: {
                        userId,
                        storeId,
                    },
                });
            }

            res.json({
                message: `Store block status updated successfully`,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to update store block status",
            });
        }
    }
);

// GET ALL STORES 
router.get(
    "/stores",
    async (req: AuthRequest, res: Response) => {
        try {
            const stores = await prisma.store.findMany({
                orderBy: {
                    name: "asc",
                },
                select: {
                    id: true,
                    name: true,
                    hostel: true,
                    roomNumber: true,
                },
            });

            res.json(stores);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                error: "Failed to fetch stores list",
            });
        }
    }
);

export default router;
