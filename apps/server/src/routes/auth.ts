import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const { email, password, firstName, requestOwner } = req.body ?? {};

        if (!email || !password) {
            return res.status(400).json({ message: "Missing email or password" });
        }

        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName: firstName || "User",
                },
            });

            if (requestOwner) {
                await tx.storeOwnerRequest.create({
                    data: {
                        userId: newUser.id,
                        status: "PENDING",
                    },
                });
            }

            return newUser;
        });

        res.json({
            message: "User created",
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                role: user.role,
            },
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error",
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (!email || !password) {
            return res.status(400).json({ message: "Missing email or password" });
        }

        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        const validPassword =
            await bcrypt.compare(
                password,
                user.passwordHash
            );

        if (!validPassword) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not set");
            return res.status(500).json({ message: "Server misconfiguration" });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET as string,
            {
                expiresIn: "7d",
            }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                role: user.role,
            },
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error",
        });
    }
});

// GET /auth/preferences
router.get("/preferences", requireAuth, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                prefBookingNotifications: true,
                prefPromoAlerts: true,
                prefNewStoreNotifications: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch preferences" });
    }
});

// PUT /auth/preferences
router.put("/preferences", requireAuth, async (req: AuthRequest, res) => {
    try {
        const { prefBookingNotifications, prefPromoAlerts, prefNewStoreNotifications } = req.body ?? {};

        const updated = await prisma.user.update({
            where: { id: req.user!.userId },
            data: {
                prefBookingNotifications: prefBookingNotifications !== undefined ? Boolean(prefBookingNotifications) : undefined,
                prefPromoAlerts: prefPromoAlerts !== undefined ? Boolean(prefPromoAlerts) : undefined,
                prefNewStoreNotifications: prefNewStoreNotifications !== undefined ? Boolean(prefNewStoreNotifications) : undefined,
            },
            select: {
                prefBookingNotifications: true,
                prefPromoAlerts: true,
                prefNewStoreNotifications: true,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update preferences" });
    }
});

export default router;