import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const {
            email,
            password,
            firstName,
        } = req.body;

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

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
            },
        });

        res.json({
            message: "User created",
            user,
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
        const { email, password } = req.body;

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
            user,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error",
        });
    }
});
export default router;